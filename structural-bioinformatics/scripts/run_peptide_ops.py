"""Orchestrate reference-region variants and exploratory docking in one local run."""

import argparse
import hashlib
import json
import os
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    source = p.add_mutually_exclusive_group(required=True)
    source.add_argument("--drug-pdb", type=Path)
    source.add_argument("--drug-fasta", type=Path)
    p.add_argument("--drug-chain")
    p.add_argument("--record-id")
    p.add_argument("--start", type=int, required=True)
    p.add_argument("--end", type=int, required=True)
    p.add_argument("--position", type=int, action="append", required=True)
    p.add_argument("--alphabet", default="ACDEFGHIKLMNPQRSTVWY")
    p.add_argument("--include-seed", action="store_true")
    p.add_argument("--max-sequences", type=int, default=20)
    p.add_argument("--target-pdb", type=Path, required=True)
    p.add_argument("--target-chain", required=True)
    p.add_argument("--center", type=float, nargs=3, required=True)
    p.add_argument("--size", type=float, nargs=3, required=True)
    p.add_argument("--receptor-preparer", required=True)
    p.add_argument("--vina", required=True)
    p.add_argument("--output-dir", type=Path, required=True)
    args = p.parse_args()
    drug = args.drug_pdb or args.drug_fasta
    if not drug.is_file() or not args.target_pdb.is_file():
        p.error("Drug and target inputs must exist")
    args.output_dir.mkdir(parents=True, exist_ok=False)
    out = args.output_dir.resolve()
    report = {
        "status": "running",
        "started_at_utc": datetime.now(UTC).isoformat(),
        "drug_input_sha256": sha(drug),
        "target_input_sha256": sha(args.target_pdb),
        "workflow_sha256": sha(Path(__file__)),
        "steps": [],
        "limitations": (
            "Experimental single-substitution workflow; docking scores are not affinity or efficacy"
        ),
    }
    path = out / "workflow.json"

    def save():
        tmp = out / "workflow.json.tmp"
        tmp.write_text(json.dumps(report, indent=2) + "\n")
        tmp.replace(path)

    save()
    env = os.environ.copy()
    env["PYTHONPATH"] = str(PROJECT / "src") + os.pathsep + env.get("PYTHONPATH", "")
    try:
        gen = [sys.executable, "-m", "peptide_lab.candidates"]
        if args.drug_pdb:
            gen += ["--drug-pdb", str(drug.resolve()), "--drug-chain", args.drug_chain or ""]
        else:
            gen += ["--fasta", str(drug.resolve()), "--record-id", args.record_id or ""]
        gen += [
            "--start",
            str(args.start),
            "--end",
            str(args.end),
            "--alphabet",
            args.alphabet,
            "--max-sequences",
            str(args.max_sequences),
            "--output-dir",
            str(out / "candidates"),
        ]
        if args.include_seed:
            gen.append("--include-seed")
        for pos in args.position:
            gen += ["--position", str(pos)]
        dock = [
            sys.executable,
            str(PROJECT / "scripts/run_general_peptide_docking.py"),
            "--pdb",
            str(args.target_pdb.resolve()),
            "--chain",
            args.target_chain,
            "--fasta",
            str(out / "candidates/candidates.fasta"),
            "--center",
            *map(str, args.center),
            "--size",
            *map(str, args.size),
            "--receptor-preparer",
            args.receptor_preparer,
            "--vina",
            args.vina,
            "--output-dir",
            str(out / "docking"),
        ]
        for name, command, artifact, expected in (
            ("candidate_generation", gen, out / "candidates/manifest.json", "sequences_generated"),
            ("docking", dock, out / "docking/report.json", "requires_further_validation"),
        ):
            row = {"step": name, "status": "running"}
            report["steps"].append(row)
            save()
            result = subprocess.run(command, env=env, capture_output=True, text=True, check=False)
            (out / f"{name}.stdout.txt").write_text(result.stdout)
            (out / f"{name}.stderr.txt").write_text(result.stderr)
            row["exit_code"] = result.returncode
            if result.returncode or not artifact.is_file():
                row["status"] = "failed"
                raise RuntimeError(f"{name} failed; inspect its log")
            content = json.loads(artifact.read_text())
            if content.get("status") != expected:
                row["status"] = "failed"
                raise RuntimeError(f"{name} did not produce the expected status")
            row.update(
                status=expected, artifact=str(artifact.relative_to(out)), sha256=sha(artifact)
            )
            save()
        report["status"] = "requires_further_validation"
    except KeyboardInterrupt:
        report["status"] = "interrupted"
        if report["steps"] and report["steps"][-1]["status"] == "running":
            report["steps"][-1]["status"] = "interrupted"
        print("Workflow interrupted; results are incomplete", file=sys.stderr)
        raise SystemExit(130) from None
    except Exception as exc:
        report["status"] = "failed"
        report["error"] = str(exc)
        print(f"Error: {exc}", file=sys.stderr)
    finally:
        report["finished_at_utc"] = datetime.now(UTC).isoformat()
        save()
    print(json.dumps({"status": report["status"], "report": str(path)}))
    if report["status"] == "failed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
