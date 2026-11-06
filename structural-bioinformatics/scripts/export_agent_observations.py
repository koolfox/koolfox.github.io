"""Build model-visible execution observations without copying answer-key fields."""

import argparse
import hashlib
import json
from pathlib import Path

from evaluate_agent_cases import evaluate


def digest(data):
    return hashlib.sha256(data).hexdigest()


def export(cases_dir, run_dir, output):
    cases_dir, run_dir, output = Path(cases_dir), Path(run_dir), Path(output)
    # Reuse the evaluator's manifest, case schema, and label checks with no responses.
    import tempfile

    with tempfile.TemporaryDirectory() as temp:
        blank = Path(temp) / "empty.jsonl"
        blank.touch()
        evaluate(cases_dir, blank)
    cases = [
        json.loads(line) for line in (cases_dir / "cases.jsonl").read_text().splitlines() if line
    ]
    manifest = json.loads((cases_dir / "manifest.json").read_text())
    report_bytes = (run_dir / "independent-candidates.json").read_bytes()
    report_hash = digest(report_bytes)
    if report_hash != manifest.get("source_report_sha256"):
        raise ValueError("Run report hash does not match the case manifest")
    report = json.loads(report_bytes)
    rows = report.get("candidates")
    if not isinstance(rows, list) or len(rows) != len(cases):
        raise ValueError("Run and case counts differ")
    observations = []
    for index, (case, row) in enumerate(zip(cases, rows, strict=True), 1):
        if (
            not isinstance(row, dict)
            or row.get("index") != index
            or case["case_id"] != f"{report_hash[:16]}-{index:06d}"
            or row.get("status") != case["execution_status"]
            or row.get("sequence") != case.get("candidate_sequence")
            or row.get("report_sha256") != case.get("child_report_sha256")
            or bool(row.get("error")) != case.get("failure_detail_recorded")
        ):
            raise ValueError("Case and run record disagree")
        exit_code = row.get("exit_code")
        status = case["execution_status"]
        if status == "requires_further_validation" and exit_code != 0:
            raise ValueError("Exit code and recorded status disagree")
        if exit_code is not None and type(exit_code) is not int:
            raise ValueError("Invalid exit code")
        child_hash = row.get("report_sha256")
        child_path = run_dir / f"candidate-{index:06d}" / "report.json"
        if child_hash is not None:
            if not child_path.resolve().is_relative_to(run_dir.resolve()):
                raise ValueError("Child report escapes run directory")
            if digest(child_path.read_bytes()) != child_hash:
                raise ValueError("Child report hash mismatch")
        observations.append(
            {
                "case_id": case["case_id"],
                "candidate_sequence": case["candidate_sequence"],
                "process_exit_code": exit_code,
                "child_report_present_and_verified": child_hash is not None,
                "failure_detail_recorded": case["failure_detail_recorded"],
            }
        )
    payload = "".join(json.dumps(row, sort_keys=True) + "\n" for row in observations).encode()
    output.mkdir(parents=True, exist_ok=False)
    (output / "observations.jsonl").write_bytes(payload)
    summary = {
        "schema_version": 1,
        "source_report_sha256": report_hash,
        "source_cases_sha256": manifest["cases_sha256"],
        "observations_sha256": digest(payload),
        "count": len(observations),
        "purpose": "development observations only; not a held-out benchmark",
    }
    (output / "manifest.json").write_text(json.dumps(summary, indent=2) + "\n")
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cases-dir", type=Path, required=True)
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(export(args.cases_dir, args.run_dir, args.output_dir)))
    except (OSError, ValueError, KeyError, TypeError) as exc:
        parser.exit(2, f"Export rejected: {exc}\n")


if __name__ == "__main__":
    main()
