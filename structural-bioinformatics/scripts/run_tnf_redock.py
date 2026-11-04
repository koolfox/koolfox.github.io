"""Run a bounded 7TA3 rigid redocking control using prepared PDBQT inputs.

This is a known-site, bound-conformation test, not a peptide discovery screen.
"""

import argparse
import hashlib
import json
import subprocess
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
from Bio.PDB import PDBParser

from peptide_lab.redock import score_files

PROJECT = Path(__file__).resolve().parents[1]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def heavy_atom_coordinates(path, pdbqt=False):
    result = {}
    for line in path.read_text().splitlines():
        if not line.startswith(("ATOM  ", "HETATM")):
            continue
        if (line.split()[-1] in ("H", "HD")) if pdbqt else (line[76:78].strip() in ("H", "D")):
            continue
        key = (line[21], line[22:27], line[12:16].strip())
        if key in result:
            raise ValueError(f"Duplicate atom identifier in {path}: {key}")
        result[key] = np.array([float(line[j : j + 8]) for j in (30, 38, 46)])
    return result


def validate_pdbqt_coordinates(pdb_path, pdbqt_path, allow_terminal_oxygen_swap=False):
    reference = heavy_atom_coordinates(pdb_path)
    prepared = heavy_atom_coordinates(pdbqt_path, pdbqt=True)
    if not reference or reference.keys() != prepared.keys():
        raise ValueError(f"Heavy atom identities differ: {pdb_path} / {pdbqt_path}")
    swapped = []
    for key, coords in reference.items():
        if np.linalg.norm(coords - prepared[key]) < 0.002:
            continue
        if allow_terminal_oxygen_swap and key[2] in ("O", "OXT"):
            partner = (key[0], key[1], "OXT" if key[2] == "O" else "O")
            if partner in prepared and np.linalg.norm(coords - prepared[partner]) < 0.002:
                swapped.append(key[2])
                continue
        raise ValueError(f"Unexpected coordinate change in {pdbqt_path}: {key}")
    if swapped and sorted(swapped) != ["O", "OXT"]:
        raise ValueError("Terminal oxygen swap was not reciprocal")
    return {"heavy_atoms": len(reference), "terminal_oxygen_names_swapped": bool(swapped)}


def minimum_interchain_distance(peptide, receptor):
    parser = PDBParser(QUIET=True)
    chains = []
    for path in (peptide, receptor):
        model = parser.get_structure("structure", path)
        coords = [a.coord for a in model.get_atoms() if a.element not in ("H", "D")]
        if not coords:
            raise ValueError(f"No heavy atoms in {path}")
        chains.append(np.asarray(coords))
    return float(np.linalg.norm(chains[0][:, None, :] - chains[1][None, :, :], axis=2).min())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--vina", default="vina")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--exhaustiveness", type=int, default=4)
    parser.add_argument("--cpu", type=int, default=1)
    args = parser.parse_args()
    work = args.input_dir.resolve()
    files = {
        name: work / name
        for name in ("peptide.pdb", "receptor-repaired.pdb", "peptide.pdbqt", "receptor.pdbqt")
    }
    if not files["peptide.pdbqt"].is_file():
        files["peptide.pdbqt"] = work / "reference.pdbqt"
    if any(not path.is_file() for path in files.values()):
        parser.error("All four prepared inputs must exist")
    if args.exhaustiveness < 1 or args.cpu < 1:
        parser.error("exhaustiveness and cpu must be positive")
    ligand = files["peptide.pdbqt"]
    text = ligand.read_text()
    if "TORSDOF 0" not in text:
        parser.error("This control requires the rigid peptide")
    try:
        atom_checks = {
            "peptide": validate_pdbqt_coordinates(files["peptide.pdb"], ligand),
            "receptor": validate_pdbqt_coordinates(
                files["receptor-repaired.pdb"], files["receptor.pdbqt"], True
            ),
        }
    except ValueError as error:
        parser.error(str(error))
    distance = minimum_interchain_distance(files["peptide.pdb"], files["receptor-repaired.pdb"])
    if distance < 2.0:
        parser.error("Interchain heavy atom clash below 2 angstrom")
    lines = [line for line in text.splitlines() if line.startswith(("ATOM  ", "HETATM"))]
    xyz = np.asarray([[float(line[j : j + 8]) for j in (30, 38, 46)] for line in lines])
    if not np.isfinite(xyz).all():
        parser.error("Non-finite peptide coordinates")
    center = (xyz.min(axis=0) + xyz.max(axis=0)) / 2
    size = xyz.max(axis=0) - xyz.min(axis=0) + 6
    # Exclusive directory creation prevents silently overwriting previous results.
    args.output_dir.mkdir(parents=True, exist_ok=False)
    out = args.output_dir.resolve()
    record = {
        "started_at_utc": datetime.now(UTC).isoformat(),
        "status": "running",
        "scope": "rigid bound peptide and bound target; known-site control",
        "minimum_interchain_heavy_distance_angstrom": distance,
        "prepared_atom_checks": atom_checks,
        "input_sha256": {name: digest(path) for name, path in files.items()},
        "parameters": {
            "seed": args.seed,
            "cpu": args.cpu,
            "exhaustiveness": args.exhaustiveness,
            "num_modes": 5,
            "center_angstrom": center.tolist(),
            "size_angstrom": size.tolist(),
        },
        "limitations": [
            "Not a flexible peptide docking or blind-site search",
            "Protonation states have not been independently validated",
            "The receptor contains modeled side chains and missing loops",
            "Vina scoring is not measured binding or efficacy",
        ],
    }
    manifest = out / "run.json"
    manifest.write_text(json.dumps(record, indent=2) + "\n")
    cmd = [
        args.vina,
        "--receptor",
        str(files["receptor.pdbqt"]),
        "--ligand",
        str(ligand),
        "--out",
        str(out / "poses.pdbqt"),
        "--seed",
        str(args.seed),
        "--cpu",
        str(args.cpu),
        "--exhaustiveness",
        str(args.exhaustiveness),
        "--num_modes",
        "5",
    ]
    for axis, value in zip("xyz", center, strict=True):
        cmd.extend([f"--center_{axis}", str(float(value))])
    for axis, value in zip("xyz", size, strict=True):
        cmd.extend([f"--size_{axis}", str(float(value))])
    try:
        version = subprocess.run(
            [args.vina, "--version"], capture_output=True, text=True, check=True
        )
        record["engine_version"] = version.stdout.strip()
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        (out / "vina.stdout.txt").write_text(result.stdout)
        (out / "vina.stderr.txt").write_text(result.stderr)
        record["exit_code"] = result.returncode
        if result.returncode != 0:
            raise RuntimeError(f"Vina returned {result.returncode}")
        record["comparison"] = score_files(ligand, out / "poses.pdbqt")
        record["output_sha256"] = digest(out / "poses.pdbqt")
        record["status"] = "completed"
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as exc:
        record["status"] = "failed"
        record["error"] = str(exc)
        raise
    finally:
        record["finished_at_utc"] = datetime.now(UTC).isoformat()
        manifest.write_text(json.dumps(record, indent=2) + "\n")
    print(json.dumps(record, indent=2))


if __name__ == "__main__":
    main()
