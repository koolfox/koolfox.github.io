#!/usr/bin/env python3
"""Run blocked preflight and direct Meeko diagnostics without modifying input."""

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
INPUT = PROJECT / "assets/3wd5-trimer-3fab.pdb"


def run(command, cwd):
    completed = subprocess.run(command, cwd=cwd, capture_output=True, text=True, check=False)
    return {
        "exit_code": completed.returncode,
        "stdout": completed.stdout,
        "stderr": completed.stderr,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--python", required=True)
    parser.add_argument("--meeko", required=True)
    parser.add_argument("--vina", required=True)
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="3wd5-trimer-probe-", dir=PROJECT) as tmp:
        tmp = Path(tmp)
        selection = tmp / "abc.pdb"
        # Preserve the source ATOM records byte-for-byte; only select chains.
        records = [
            line
            for line in INPUT.read_text().splitlines(keepends=True)
            if line.startswith("ATOM  ") and line[21] in "ABC"
        ]
        selection.write_text("".join(records) + "END\n")
        common = [
            args.python,
            str(PROJECT / "scripts/run_general_peptide_docking.py"),
            "--pdb",
            str(INPUT),
            "--chain",
            "A,B,C",
            "--sequence",
            "AC",
            "--center",
            "0",
            "0",
            "0",
            "--size",
            "20",
            "20",
            "20",
            "--receptor-preparer",
            args.meeko,
            "--vina",
            args.vina,
            "--output-dir",
            str(tmp / "workflow-output"),
        ]
        workflow = run(common, tmp)
        workflow["output_directory_created"] = (tmp / "workflow-output").exists()
        meeko = run([args.meeko, "--read_pdb", str(selection), "-o", str(tmp / "abc"), "-p"], tmp)
        meeko["output_files"] = sorted(p.name for p in tmp.iterdir() if p.name != "abc.pdb")
        # Stable output makes failed evidence reproducible across temporary paths.
        for result in (workflow, meeko):
            for key in ("stdout", "stderr"):
                result[key] = result[key].replace(str(tmp), "<temporary>")
        print(
            json.dumps(
                {
                    "selection_atom_records": len(records),
                    "workflow": workflow,
                    "direct_meeko": meeko,
                },
                indent=2,
            )
        )


if __name__ == "__main__":
    main()
