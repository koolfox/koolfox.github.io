"""Score a saved 13mer pose and rigid translations; no search or fitting."""

import argparse
import hashlib
import json
import math
import platform
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PILOT = ROOT / "assets/long-peptide-pilot"
RECEPTOR = PILOT / "bounded-1000000/receptor.pdbqt"
POSE = PILOT / "local-refinement/input-1.pdbqt"
OFFSETS = (0, 10, 40, -40)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def atoms(text):
    result = []
    for line in text.splitlines():
        if line.startswith(("ATOM  ", "HETATM")) and line.split()[-1] not in ("H", "HD"):
            result.append(tuple(float(line[i : i + 8]) for i in (30, 38, 46)))
    if not result or not all(math.isfinite(v) for atom in result for v in atom):
        raise ValueError("Missing or nonfinite heavy atom coordinates")
    return result


def translate(text, dx):
    lines = []
    for line in text.splitlines():
        if line.startswith(("ATOM  ", "HETATM")):
            line = line[:30] + f"{float(line[30:38]) + dx:8.3f}" + line[38:]
        lines.append(line)
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vina", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=False)
    receptor = atoms(RECEPTOR.read_text())
    text = POSE.read_text()
    version = subprocess.run(
        [str(args.vina), "--version"], check=True, capture_output=True, text=True
    ).stdout.strip()
    report = {
        "utc": datetime.now(timezone.utc).isoformat(),
        "platform": platform.platform(),
        "vina_version": version,
        "vina_sha256": sha(args.vina),
        "receptor_sha256": sha(RECEPTOR),
        "pose_sha256": sha(POSE),
        "method": (
            "Rigid x translations in angstrom; Vina score_only with autobox, cpu 1, "
            "seed 42; no optimization"
        ),
        "cases": [],
    }
    for dx in OFFSETS:
        path = args.output_dir / f"pose-x{dx:+d}.pdbqt"
        path.write_text(translate(text, dx))
        ligand = atoms(path.read_text())
        distances = [math.dist(a, b) for a in ligand for b in receptor]
        command = [
            str(args.vina),
            "--receptor",
            str(RECEPTOR),
            "--ligand",
            str(path),
            "--autobox",
            "--score_only",
            "--cpu",
            "1",
            "--seed",
            "42",
        ]
        result = subprocess.run(command, capture_output=True, text=True, timeout=120)
        log = args.output_dir / f"vina-x{dx:+d}.log"
        log.write_text(result.stdout + result.stderr)
        report["cases"].append(
            {
                "dx_angstrom": dx,
                "ligand_sha256": sha(path),
                "log_sha256": sha(log),
                "exit_code": result.returncode,
                "minimum_heavy_atom_distance_angstrom": min(distances),
                "heavy_atom_pairs_below_2_angstrom": sum(d < 2 for d in distances),
                "command": command,
            }
        )
        (args.output_dir / "report.json").write_text(json.dumps(report, indent=2) + "\n")
        if result.returncode:
            raise RuntimeError(f"Vina failed for translation {dx}: see {log}")


if __name__ == "__main__":
    main()
