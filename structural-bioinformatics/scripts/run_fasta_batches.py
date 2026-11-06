"""Stream a finite FASTA library through bounded docking batches.

No fixed total sequence limit; each docking batch contains at most 20 records.
Failures stop the run and remain recorded, rather than silently dropping records.
"""

import argparse
import hashlib
import json
import os
import sqlite3
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

from Bio import SeqIO

PROJECT = Path(__file__).resolve().parents[1]
ALPHABET = frozenset("ACDEFGHIKLMNPQRSTVWY")


def digest(path):
    result = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            result.update(block)
    return result.hexdigest()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--fasta", type=Path, required=True)
    p.add_argument("--pdb", type=Path, required=True)
    p.add_argument("--chain", required=True)
    p.add_argument("--center", type=float, nargs=3, required=True)
    p.add_argument("--size", type=float, nargs=3, required=True)
    p.add_argument("--receptor-preparer", required=True)
    p.add_argument("--vina", required=True)
    p.add_argument("--batch-size", type=int, default=20)
    p.add_argument("--output-dir", type=Path, required=True)
    args = p.parse_args()
    if not args.fasta.is_file() or not args.pdb.is_file():
        p.error("FASTA and PDB files must exist")
    if not 1 <= args.batch_size <= 20:
        p.error("Batch size must be between 1 and 20")
    args.output_dir.mkdir(parents=True, exist_ok=False)
    out = args.output_dir.resolve()
    report = {
        "status": "running",
        "started_at_utc": datetime.now(UTC).isoformat(),
        "input_fasta_sha256": digest(args.fasta),
        "target_pdb_sha256": digest(args.pdb),
        "workflow_sha256": digest(Path(__file__)),
        "batch_size": args.batch_size,
        "total_sequences": 0,
        "completed_sequences": 0,
        "batches": [],
        "interpretation": "experimental docking; scores are not affinity or efficacy",
    }
    path = out / "batch-workflow.json"

    def save():
        tmp = out / "batch-workflow.json.tmp"
        tmp.write_text(json.dumps(report, indent=2) + "\n")
        tmp.replace(path)

    save()
    db = None
    try:
        db = sqlite3.connect(out / "input-index.sqlite")
        db.execute("CREATE TABLE ids (id TEXT PRIMARY KEY)")
        for record in SeqIO.parse(str(args.fasta), "fasta"):
            sequence = str(record.seq)
            if not record.id or not sequence or len(sequence) > 12 or set(sequence) - ALPHABET:
                raise ValueError(f"Invalid sequence or length for record {record.id!r}")
            try:
                db.execute("INSERT INTO ids VALUES (?)", (record.id,))
            except sqlite3.IntegrityError as exc:
                raise ValueError(f"Duplicate FASTA identifier: {record.id}") from exc
            report["total_sequences"] += 1
        db.commit()
        if not report["total_sequences"]:
            raise ValueError("FASTA contains no sequences")
        save()
        env = os.environ.copy()
        env["PYTHONPATH"] = str(PROJECT / "src") + os.pathsep + env.get("PYTHONPATH", "")
        chunk = []
        batch_number = 0

        def run_batch(records):
            nonlocal batch_number
            batch_number += 1
            folder = out / f"batch-{batch_number:06d}"
            folder.mkdir()
            fasta = folder / "input.fasta"
            SeqIO.write(records, str(fasta), "fasta")
            row = {
                "batch": batch_number,
                "input_count": len(records),
                "input_sha256": digest(fasta),
                "status": "running",
            }
            report["batches"].append(row)
            save()
            cmd = [
                sys.executable,
                str(PROJECT / "scripts/run_general_peptide_docking.py"),
                "--pdb",
                str(args.pdb.resolve()),
                "--chain",
                args.chain,
                "--fasta",
                str(fasta),
                "--center",
                *map(str, args.center),
                "--size",
                *map(str, args.size),
                "--receptor-preparer",
                args.receptor_preparer,
                "--vina",
                args.vina,
                "--output-dir",
                str(folder / "docking"),
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=False, env=env)
            (folder / "stdout.txt").write_text(result.stdout)
            (folder / "stderr.txt").write_text(result.stderr)
            row["exit_code"] = result.returncode
            child = folder / "docking/report.json"
            if result.returncode or not child.is_file():
                row["status"] = "failed"
                raise RuntimeError(f"Batch {batch_number} failed; inspect its logs")
            child_data = json.loads(child.read_text())
            if child_data.get("status") != "requires_further_validation" or len(
                child_data.get("candidates", [])
            ) != len(records):
                row["status"] = "failed"
                raise RuntimeError(f"Batch {batch_number} has incomplete results")
            if child_data.get("fasta_sha256") != digest(fasta):
                raise RuntimeError(f"Batch {batch_number} FASTA hash differs")
            if child_data.get("input", {}).get("source_sha256") != report["target_pdb_sha256"]:
                raise RuntimeError(f"Batch {batch_number} target hash differs")
            observed = [(r.get("input_id"), r.get("sequence")) for r in child_data["candidates"]]
            if observed != [(r.id, str(r.seq)) for r in records]:
                raise RuntimeError(f"Batch {batch_number} identifiers or sequences differ")
            row.update(status="requires_further_validation", report_sha256=digest(child))
            report["completed_sequences"] += len(records)
            save()

        for record in SeqIO.parse(str(args.fasta), "fasta"):
            if chunk and (
                len(chunk) == args.batch_size or str(record.seq) in {str(r.seq) for r in chunk}
            ):
                run_batch(chunk)
                chunk = []
            chunk.append(record)
        if chunk:
            run_batch(chunk)
        if report["completed_sequences"] != report["total_sequences"]:
            raise RuntimeError("Completed count differs from preflight count")
        if digest(args.fasta) != report["input_fasta_sha256"]:
            raise RuntimeError("Input FASTA changed during execution")
        if digest(args.pdb) != report["target_pdb_sha256"]:
            raise RuntimeError("Target PDB changed during execution")
        report["status"] = "requires_further_validation"
    except KeyboardInterrupt:
        report["status"] = "interrupted"
        if report["batches"] and report["batches"][-1]["status"] == "running":
            report["batches"][-1]["status"] = "interrupted"
        raise SystemExit(130) from None
    except Exception as exc:
        report["status"] = "failed"
        if report["batches"] and report["batches"][-1]["status"] == "running":
            report["batches"][-1]["status"] = "failed"
        report["error"] = str(exc)
        print(f"Error: {exc}", file=sys.stderr)
    finally:
        if db is not None:
            db.close()
        report["finished_at_utc"] = datetime.now(UTC).isoformat()
        save()
    print(json.dumps({"status": report["status"], "completed": report["completed_sequences"]}))
    if report["status"] == "failed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
