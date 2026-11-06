"""Run each FASTA candidate separately and retain failures without dropping later records."""

import argparse
import hashlib
import json
import math
import os
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

from Bio import SeqIO

PROJECT = Path(__file__).resolve().parents[1]
ALPHABET = frozenset("ACDEFGHIKLMNPQRSTVWY")


def digest(path):
    hasher = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(block)
    return hasher.hexdigest()


def run(fasta, pdb, chain, center, size, receptor_preparer, vina, output, runner=subprocess.run):
    fasta, pdb, output = Path(fasta), Path(pdb), Path(output)
    if not fasta.is_file() or not pdb.is_file() or len(chain) != 1:
        raise ValueError("Provide an existing FASTA, PDB and one author chain")
    if (
        len(center) != 3
        or len(size) != 3
        or not all(math.isfinite(v) for v in [*center, *size])
        or not all(0 < v <= 30 for v in size)
    ):
        raise ValueError("Box values must be finite and each side must be >0 and <=30 Å")
    # This first pass validates the whole input without retaining all sequences in memory.
    seen = set()
    count = 0
    for record in SeqIO.parse(str(fasta), "fasta"):
        sequence = str(record.seq)
        if not record.id or record.id in seen:
            raise ValueError(f"Missing or duplicate FASTA ID: {record.id!r}")
        if not sequence or len(sequence) > 12 or set(sequence) - ALPHABET:
            raise ValueError(f"Invalid sequence or length for record {record.id!r}")
        seen.add(record.id)
        count += 1
    if not count:
        raise ValueError("FASTA contains no sequences")
    fasta_hash, pdb_hash = digest(fasta), digest(pdb)
    output.mkdir(parents=True, exist_ok=False)
    report_path = output / "independent-candidates.json"
    report = {
        "status": "running",
        "started_at_utc": datetime.now(UTC).isoformat(),
        "input_fasta_sha256": fasta_hash,
        "target_pdb_sha256": pdb_hash,
        "workflow_sha256": digest(Path(__file__)),
        "chain": chain,
        "center_angstrom": center,
        "size_angstrom": size,
        "total": count,
        "candidates": [],
        "limitations": "Computational results are not measured binding or efficacy; no resume.",
    }

    def save():
        temporary = output / "independent-candidates.json.tmp"
        temporary.write_text(json.dumps(report, indent=2) + "\n")
        temporary.replace(report_path)

    save()
    env = os.environ.copy()
    env["PYTHONPATH"] = str(PROJECT / "src") + os.pathsep + env.get("PYTHONPATH", "")
    try:
        for index, record in enumerate(SeqIO.parse(str(fasta), "fasta"), 1):
            sequence = str(record.seq)
            folder = output / f"candidate-{index:06d}"
            row = {"index": index, "input_id": record.id, "sequence": sequence, "status": "running"}
            report["candidates"].append(row)
            save()
            command = [
                sys.executable,
                str(PROJECT / "scripts/run_general_peptide_docking.py"),
                "--pdb",
                str(pdb.resolve()),
                "--chain",
                chain,
                "--sequence",
                sequence,
                "--center",
                *map(str, center),
                "--size",
                *map(str, size),
                "--receptor-preparer",
                receptor_preparer,
                "--vina",
                vina,
                "--output-dir",
                str(folder),
            ]
            try:
                result = runner(command, capture_output=True, text=True, check=False, env=env)
                folder.mkdir(parents=True, exist_ok=True)
                (folder / "orchestrator.stdout.txt").write_text(result.stdout)
                (folder / "orchestrator.stderr.txt").write_text(result.stderr)
                child = folder / "report.json"
                if not child.is_file():
                    row.update(status="failed", error="No child report was produced")
                else:
                    child_data = json.loads(child.read_text())
                    row["report_sha256"] = digest(child)
                    row["report_path"] = f"{folder.name}/report.json"
                    candidates = child_data.get("candidates", [])
                    valid = (
                        result.returncode == 0
                        and child_data.get("status") == "requires_further_validation"
                        and len(candidates) == 1
                        and candidates[0].get("sequence") == sequence
                        and candidates[0].get("status") == "requires_further_validation"
                        and child_data.get("input", {}).get("source_sha256") == pdb_hash
                    )
                    if valid:
                        row["status"] = "requires_further_validation"
                    else:
                        row.update(
                            status="failed",
                            error=child_data.get("error", "Incomplete child report"),
                        )
                row["exit_code"] = result.returncode
            except (OSError, ValueError, json.JSONDecodeError) as exc:
                row.update(status="failed", error=f"{type(exc).__name__}: {exc}")
            save()
        if digest(fasta) != fasta_hash or digest(pdb) != pdb_hash:
            raise ValueError("Input changed during execution")
        if len(report["candidates"]) != count:
            raise ValueError("Candidate count differs from preflight")
        report["status"] = (
            "completed_with_failures"
            if any(row["status"] == "failed" for row in report["candidates"])
            else "requires_further_validation"
        )
    except KeyboardInterrupt:
        report["status"] = "interrupted"
        if report["candidates"] and report["candidates"][-1]["status"] == "running":
            report["candidates"][-1]["status"] = "interrupted"
        raise
    except Exception as exc:
        report.update(status="failed", error=f"{type(exc).__name__}: {exc}")
        raise
    finally:
        report["finished_at_utc"] = datetime.now(UTC).isoformat()
        save()
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fasta", required=True, type=Path)
    parser.add_argument("--pdb", required=True, type=Path)
    parser.add_argument("--chain", required=True)
    parser.add_argument("--center", required=True, nargs=3, type=float)
    parser.add_argument("--size", required=True, nargs=3, type=float)
    parser.add_argument("--receptor-preparer", required=True)
    parser.add_argument("--vina", required=True)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    try:
        result = run(
            args.fasta,
            args.pdb,
            args.chain,
            args.center,
            args.size,
            args.receptor_preparer,
            args.vina,
            args.output_dir,
        )
    except (OSError, ValueError) as exc:
        parser.exit(1, f"Run rejected: {exc}\n")
    print(json.dumps({"status": result["status"], "count": len(result["candidates"])}))
    if result["status"] != "requires_further_validation":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
