"""Attach verified antibody PDB provenance to previously exported execution cases."""

import argparse
import hashlib
import importlib.util
import json
import sys
import tempfile
from datetime import UTC, datetime
from pathlib import Path

from Bio import SeqIO

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT / "src"))
from peptide_lab.candidate_lineage import verify  # noqa: E402

spec = importlib.util.spec_from_file_location(
    "export_run_cases", PROJECT / "scripts/export_run_cases.py"
)
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def join(cases_dir, run_dir, antibody_pdb, fasta, candidate_manifest, output):
    cases_dir, run_dir, output = Path(cases_dir), Path(run_dir), Path(output)
    base_cases, base_manifest = cases_dir / "cases.jsonl", cases_dir / "manifest.json"
    base = json.loads(base_manifest.read_text())
    run_report = run_dir / "independent-candidates.json"
    if base.get("cases_sha256") != digest(base_cases) or base.get("source_report_sha256") != digest(
        run_report
    ):
        raise ValueError("Base cases or source report hash differs")
    with tempfile.TemporaryDirectory(prefix="peptide-case-check-") as temp:
        fresh = Path(temp) / "cases"
        fresh_manifest = exporter.export(run_dir, fresh)
        if (fresh / "cases.jsonl").read_bytes() != base_cases.read_bytes():
            raise ValueError("Base cases differ from the verified run projection")
        for field in ("case_count", "unprocessed_count", "source_status", "schema_version"):
            if base.get(field) != fresh_manifest[field]:
                raise ValueError("Base case manifest differs from the verified run")
    lineage = verify(antibody_pdb, fasta, candidate_manifest)
    report = json.loads(run_report.read_text())
    if report.get("input_fasta_sha256") != lineage["input_fasta_sha256"]:
        raise ValueError("Run FASTA does not match candidate library")
    records = list(SeqIO.parse(str(fasta), "fasta"))
    if report.get("total") != len(records) or len(report["candidates"]) > len(records):
        raise ValueError("Run and candidate library counts differ")
    rows = [json.loads(line) for line in base_cases.read_text().splitlines()]
    if len(rows) != len(report["candidates"]):
        raise ValueError("Base case count differs from source run")
    for case, run_row, record in zip(rows, report["candidates"], records, strict=False):
        if run_row.get("input_id") != record.id or run_row.get("sequence") != str(record.seq):
            raise ValueError("Run candidate order or identity differs from FASTA")
        if case.get("candidate_sequence") != str(record.seq):
            raise ValueError("Case sequence differs from candidate FASTA")
        case.update(
            antibody_source_sha256=lineage["antibody_pdb_sha256"],
            candidate_manifest_sha256=lineage["candidate_manifest_sha256"],
            antibody_source_region=lineage["region"],
            antibody_seed=lineage["seed"],
            lineage_status="source_consistent",
        )
    if (
        digest(base_cases) != base["cases_sha256"]
        or digest(run_report) != base["source_report_sha256"]
        or digest(fasta) != lineage["input_fasta_sha256"]
        or digest(antibody_pdb) != lineage["antibody_pdb_sha256"]
        or digest(candidate_manifest) != lineage["candidate_manifest_sha256"]
    ):
        raise ValueError("Source changed during verification")
    output.mkdir(parents=True, exist_ok=False)
    target = output / "cases.jsonl"
    with target.open("x") as handle:
        for case in rows:
            handle.write(json.dumps(case, ensure_ascii=False, sort_keys=True) + "\n")
    result = {
        "schema_version": 1,
        "created_at_utc": datetime.now(UTC).isoformat(),
        "source_cases_sha256": digest(base_cases),
        "source_report_sha256": digest(run_report),
        "candidate_manifest_sha256": lineage["candidate_manifest_sha256"],
        "antibody_pdb_sha256": lineage["antibody_pdb_sha256"],
        "input_fasta_sha256": lineage["input_fasta_sha256"],
        "joiner_sha256": digest(Path(__file__)),
        "cases_sha256": digest(target),
        "case_count": len(rows),
        "unprocessed_count": base["unprocessed_count"],
        "purpose": "source-consistency audit; not biological labels or model training",
    }
    (output / "manifest.json").write_text(json.dumps(result, indent=2) + "\n")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in (
        "cases-dir",
        "run-dir",
        "antibody-pdb",
        "fasta",
        "candidate-manifest",
        "output-dir",
    ):
        parser.add_argument("--" + flag, type=Path, required=True)
    args = parser.parse_args()
    try:
        print(
            json.dumps(
                join(
                    args.cases_dir,
                    args.run_dir,
                    args.antibody_pdb,
                    args.fasta,
                    args.candidate_manifest,
                    args.output_dir,
                )
            )
        )
    except (OSError, ValueError, KeyError, TypeError) as exc:
        parser.exit(1, f"Join rejected: {exc}\n")


if __name__ == "__main__":
    main()
