"""Finite rigid-placement geometry control; does not evaluate binding or docking scores."""

import argparse
import gzip
import hashlib
import itertools
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

CENTER = np.array([30.0, 28.0, 15.0])
SIZE = np.array([20.0, 20.0, 20.0])
OFFSETS = tuple(range(-9, 10, 3))


def read_atoms(path):
    lines = Path(path).read_text().splitlines()
    atom_lines = [line for line in lines if line.startswith(("ATOM  ", "HETATM"))]
    heavy = [line for line in atom_lines if line.split()[-1] not in ("H", "HD")]
    if not heavy:
        raise ValueError("No heavy atoms")
    coords = np.array([[float(line[i : i + 8]) for i in (30, 38, 46)] for line in heavy])
    if not np.isfinite(coords).all():
        raise ValueError("Non-finite coordinates")
    return lines, coords


def rotations():
    result = []
    for perm in itertools.permutations(range(3)):
        for signs in itertools.product((-1, 1), repeat=3):
            matrix = np.zeros((3, 3), dtype=int)
            for row, column in enumerate(perm):
                matrix[row, column] = signs[row]
            if round(np.linalg.det(matrix)) == 1:
                result.append(matrix)
    return result


def scan(receptor, ligand):
    bounding_centers = []
    rows = []
    for rotation_index, rotation in enumerate(rotations()):
        rotated = ligand @ rotation.T
        box_center = (rotated.max(axis=0) + rotated.min(axis=0)) / 2
        bounding_centers.append(box_center.tolist())
        rotated -= box_center
        for offset in itertools.product(OFFSETS, repeat=3):
            position = CENTER + np.array(offset)
            coords = rotated + position
            outside = int(np.any(np.abs(coords - CENTER) > SIZE / 2, axis=1).sum())
            distances = np.linalg.norm(coords[:, None, :] - receptor[None, :, :], axis=2)
            count = int(np.count_nonzero(distances < 2.0))
            rows.append(
                {
                    "rotation": rotation_index,
                    "offset": offset,
                    "outside_heavy_atoms": outside,
                    "minimum_distance_angstrom": float(distances.min()),
                    "pairs_below_2_angstrom": count,
                }
            )
    return bounding_centers, rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--receptor", required=True, type=Path)
    parser.add_argument("--ligand", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    _, receptor = read_atoms(args.receptor)
    _, ligand = read_atoms(args.ligand)
    bounding_centers, rows = scan(receptor, ligand)
    inside = [row for row in rows if row["outside_heavy_atoms"] == 0]
    passing = [row for row in inside if row["pairs_below_2_angstrom"] == 0]
    args.output_dir.mkdir(parents=True, exist_ok=False)
    with gzip.open(args.output_dir / "placements.jsonl.gz", "wt", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, sort_keys=True) + "\n")
    summary = {
        "recorded_at_utc": datetime.now(timezone.utc).isoformat(),
        "numpy_version": np.__version__,
        "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "input_sha256": {
            label: hashlib.sha256(path.read_bytes()).hexdigest()
            for label, path in (("receptor", args.receptor), ("ligand", args.ligand))
        },
        "center": CENTER.tolist(),
        "box_size": SIZE.tolist(),
        "rotated_bounding_box_centers": bounding_centers,
        "offsets": OFFSETS,
        "rotations": [rotation.tolist() for rotation in rotations()],
        "placements": len(rows),
        "fully_inside": len(inside),
        "inside_without_pairs_below_2_angstrom": len(passing),
        "best_inside": max(inside, key=lambda row: row["minimum_distance_angstrom"], default=None),
        "limitation": (
            "Finite rigid geometry screen only; not evidence of binding or docking success."
        ),
    }
    (args.output_dir / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
