"""Export traceable execution cases; these are not biological training labels."""

import argparse
import hashlib
import json
import re
from datetime import UTC, datetime
from pathlib import Path


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def export(run_dir, output):
    run_dir, output = Path(run_dir), Path(output)
    source = run_dir / "independent-candidates.json"
    source_hash = sha(source)
    report = json.loads(source.read_text())
    statuses = {"requires_further_validation", "completed_with_failures", "interrupted", "failed"}
    if report.get("status") not in statuses:
        raise ValueError("Run is not in a terminal state")
    rows, total = report.get("candidates"), report.get("total")
    if not isinstance(rows, list) or type(total) is not int or total < 1 or len(rows) > total:
        raise ValueError("Invalid candidate count")
    if any(not isinstance(row, dict) for row in rows):
        raise ValueError("Invalid candidate record")
    if (
        report["status"] in {"requires_further_validation", "completed_with_failures"}
        and len(rows) != total
    ):
        raise ValueError("Finished run has missing candidates")
    if report["status"] == "requires_further_validation" and any(
        row.get("status") != "requires_further_validation" for row in rows
    ):
        raise ValueError("Completed run contains non-completed candidates")
    if report["status"] == "completed_with_failures" and not any(
        row.get("status") == "failed" for row in rows
    ):
        raise ValueError("Mixed-outcome run has no recorded failure")
    if report["status"] == "completed_with_failures" and any(
        row.get("status") not in {"failed", "requires_further_validation"} for row in rows
    ):
        raise ValueError("Finished mixed run has a nonterminal candidate")
    for key in ("target_pdb_sha256", "input_fasta_sha256"):
        if not isinstance(report.get(key), str) or not re.fullmatch(r"[0-9a-f]{64}", report[key]):
            raise ValueError(f"Invalid {key}")
    cases = []
    for expected_index, row in enumerate(rows, 1):
        if row.get("index") != expected_index:
            raise ValueError("Candidate indices must be consecutive")
        sequence = row.get("sequence")
        if (
            not isinstance(sequence, str)
            or not 1 <= len(sequence) <= 12
            or any(letter not in "ACDEFGHIKLMNPQRSTVWY" for letter in sequence)
        ):
            raise ValueError("Invalid candidate sequence")
        status = row.get("status")
        if status not in {"requires_further_validation", "failed", "interrupted"}:
            raise ValueError("Candidate has no terminal status")
        path, expected_hash = row.get("report_path"), row.get("report_sha256")
        if path is not None or expected_hash is not None:
            expected_path = f"candidate-{expected_index:06d}/report.json"
            if path != expected_path or not isinstance(expected_hash, str):
                raise ValueError("Invalid child report reference")
            child = (run_dir / expected_path).resolve()
            if not child.is_relative_to(run_dir.resolve()) or sha(child) != expected_hash:
                raise ValueError("Child report does not match its recorded hash")
            child_data = json.loads(child.read_text())
            if status == "requires_further_validation":
                candidates = child_data.get("candidates", [])
                if (
                    row.get("exit_code") != 0
                    or child_data.get("status") != "requires_further_validation"
                    or child_data.get("input", {}).get("source_sha256")
                    != report["target_pdb_sha256"]
                    or len(candidates) != 1
                    or candidates[0].get("sequence") != sequence
                    or candidates[0].get("status") != "requires_further_validation"
                ):
                    raise ValueError("Completed child report is inconsistent")
                poses = child.parent / sequence / "poses.pdbqt"
                expected_pose_hash = candidates[0].get("poses_sha256")
                if (
                    not candidates[0].get("poses")
                    or not poses.resolve().is_relative_to(run_dir.resolve())
                    or not isinstance(expected_pose_hash, str)
                    or sha(poses) != expected_pose_hash
                ):
                    raise ValueError("Completed pose file does not match its recorded hash")
        if status == "requires_further_validation" and path is None:
            raise ValueError("Completed candidate has no child report")
        cases.append(
            {
                "case_id": f"{source_hash[:16]}-{expected_index:06d}",
                "candidate_sequence": row["sequence"],
                "target_pdb_sha256": report["target_pdb_sha256"],
                "input_fasta_sha256": report["input_fasta_sha256"],
                "antibody_source_sha256": None,
                "execution_status": status,
                "child_report_sha256": expected_hash,
                "failure_detail_recorded": bool(row.get("error")),
                "biological_binding_label": None,
                "measured_affinity": None,
                "dataset_split": "unassigned",
            }
        )
    # A terminal aggregate containing a nonterminal candidate is rejected above.
    if sha(source) != source_hash:
        raise ValueError("Source report changed during validation")
    output.mkdir(parents=True, exist_ok=False)
    cases_path = output / "cases.jsonl"
    with cases_path.open("x") as handle:
        for case in cases:
            handle.write(json.dumps(case, ensure_ascii=False, sort_keys=True) + "\n")
    manifest = {
        "schema_version": 1,
        "created_at_utc": datetime.now(UTC).isoformat(),
        "source_report_sha256": source_hash,
        "exporter_sha256": sha(Path(__file__)),
        "cases_sha256": sha(cases_path),
        "case_count": len(cases),
        "unprocessed_count": total - len(cases),
        "source_status": report["status"],
        "purpose": "execution audit cases, not biological labels or a validated training set",
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(export(args.run_dir, args.output_dir)))
    except (OSError, ValueError, KeyError, TypeError) as exc:
        parser.exit(1, f"Export rejected: {exc}\n")


if __name__ == "__main__":
    main()
