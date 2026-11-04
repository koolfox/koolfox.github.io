"""Run bounded batches of the experimental A/R peptide screening pilot.

This orchestrator currently accepts only the 7TA3 reference receptor and box.
It is an exploratory workflow, not a validated discovery or affinity predictor.
"""

import argparse
import hashlib
import itertools
import json
import os
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
PILOT = PROJECT / "scripts/screen_ar_peptides.py"


def combinations(alphabet, lengths, maximum):
    if not alphabet or len(set(alphabet)) != len(alphabet) or set(alphabet) - set("AR"):
        raise ValueError("Choose unique letters from A and R")
    if not lengths or any(length not in (2, 3) for length in lengths):
        raise ValueError("Only lengths 2 and 3 are supported")
    if len(set(lengths)) != len(lengths):
        raise ValueError("Lengths must be unique")
    count = sum(len(alphabet) ** length for length in lengths)
    if count > maximum or maximum < 1 or maximum > 12:
        raise ValueError("Library exceeds the limit of at most 12 sequences")
    return ["".join(chars) for n in lengths for chars in itertools.product(alphabet, repeat=n)]


def run(alphabet, lengths, maximum, receptor, vina, output):
    sequences = combinations(alphabet, lengths, maximum)
    if not receptor.is_file():
        raise ValueError("Receptor file not found")
    output.mkdir(parents=True, exist_ok=False)
    output = output.resolve()
    manifest = {
        "status": "running",
        "started_at_utc": datetime.now(UTC).isoformat(),
        "alphabet": alphabet,
        "lengths": lengths,
        "sequences": sequences,
        "maximum": maximum,
        "receptor_sha256": hashlib.sha256(receptor.read_bytes()).hexdigest(),
        "pilot_script_sha256": hashlib.sha256(PILOT.read_bytes()).hexdigest(),
        "batches": [],
        "interpretation": "exploratory; scores are not affinity, efficacy, or validated ranking",
    }
    path = output / "batch-report.json"

    def save():
        temporary = output / "batch-report.json.tmp"
        temporary.write_text(json.dumps(manifest, indent=2) + "\n")
        os.replace(temporary, path)

    save()
    try:
        for number, start in enumerate(range(0, len(sequences), 4), 1):
            subset = sequences[start : start + 4]
            folder = output / f"batch-{number:03d}"
            command = [
                sys.executable,
                str(PILOT),
                "--receptor",
                str(receptor.resolve()),
                "--output-dir",
                str(folder),
                "--vina",
                vina,
            ]
            for sequence in subset:
                command.extend(["--sequence", sequence])
            row = {"sequences": subset, "directory": folder.name, "status": "running"}
            manifest["batches"].append(row)
            save()
            proc = subprocess.run(command, capture_output=True, text=True, check=False)
            (output / f"batch-{number:03d}.stdout.txt").write_text(proc.stdout)
            (output / f"batch-{number:03d}.stderr.txt").write_text(proc.stderr)
            row["exit_code"] = proc.returncode
            report_path = folder / "run.json"
            if proc.returncode or not report_path.is_file():
                row["status"] = "failed"
                raise RuntimeError(f"Batch {number} failed; inspect its logs")
            report = json.loads(report_path.read_text())
            rows = report.get("candidates", [])
            if report.get("status") != "completed" or [r.get("sequence") for r in rows] != subset:
                row["status"] = "failed"
                raise RuntimeError(f"Batch {number} has incomplete output")
            if any(r.get("status") != "completed" or not r.get("poses") for r in rows):
                row["status"] = "failed"
                raise RuntimeError(f"Batch {number} has missing candidate results")
            if any(p.get("severe_clash_screen") != "pass" for r in rows for p in r["poses"]):
                row["status"] = "failed_quality_screen"
                raise RuntimeError(f"Batch {number} contains a severe interchain clash")
            row["report_sha256"] = hashlib.sha256(report_path.read_bytes()).hexdigest()
            row["status"] = "requires_further_validation"
            save()
        manifest["status"] = "requires_further_validation"
    except Exception as exc:
        manifest["status"] = "failed"
        manifest["error"] = str(exc)
        raise
    finally:
        manifest["finished_at_utc"] = datetime.now(UTC).isoformat()
        save()
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--alphabet", default="AR")
    parser.add_argument("--length", type=int, action="append", required=True)
    parser.add_argument("--max-sequences", type=int, default=12)
    parser.add_argument("--receptor", type=Path, required=True)
    parser.add_argument("--vina", required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    try:
        report = run(
            args.alphabet,
            args.length,
            args.max_sequences,
            args.receptor,
            args.vina,
            args.output_dir,
        )
    except (ValueError, OSError, RuntimeError) as exc:
        parser.exit(1, f"Error: {exc}\n")
    print(json.dumps({"status": report["status"], "sequences": len(report["sequences"])}))


if __name__ == "__main__":
    main()
