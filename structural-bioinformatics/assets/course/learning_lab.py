"""Small, offline classroom calculations. Python 3.10+, standard library only.

Run from repository root, or download beside gromacs/1ubq-protein.pdb.
All synthetic examples are labeled. No MD, docking or experimental run is implied.
"""

import argparse
import hashlib
import json
import math
from pathlib import Path


def pdb_atoms(path):
    atoms = []
    for line in path.read_text().splitlines():
        if line.startswith("ATOM  ") and float(line[54:60]) > 0:
            atoms.append(
                {
                    "atom": line[12:16].strip(),
                    "residue": line[17:20].strip(),
                    "chain": line[21:22],
                    "number": int(line[22:26]),
                    "insertion": line[26:27].strip(),
                    "xyz": tuple(float(line[i : i + 8]) for i in (30, 38, 46)),
                }
            )
    return atoms


def center(points):
    return tuple(sum(p[i] for p in points) / len(points) for i in range(3))


def rmsd(a, b):
    if not a or len(a) != len(b):
        raise ValueError("Equal nonempty corresponding lists are required")
    return math.sqrt(sum(math.dist(x, y) ** 2 for x, y in zip(a, b, strict=True)) / len(a))


def geometry(path):
    atoms = pdb_atoms(path)
    points = [a["xyz"] for a in atoms if a["atom"] == "CA"]
    origin = center(points)
    shifted = [(x + 10, y, z) for x, y, z in points]
    restored = [(x - 10, y, z) for x, y, z in shifted]
    return {
        "input": path.name,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "occupied_atom_rows": len(atoms),
        "ca_count": len(points),
        "selection": "C-alpha, equal weights; prepared chain A input, not full deposited file",
        "ca_radius_of_gyration_angstrom": math.sqrt(
            sum(math.dist(p, origin) ** 2 for p in points) / len(points)
        ),
        "raw_rmsd_after_translation_angstrom": rmsd(points, shifted),
        "after_known_inverse_translation_angstrom": rmsd(points, restored),
        "note": "Known translation reversed; not a general fitting algorithm or dynamics",
    }


def energy():
    # Dimensionless two-state illustrative model: Delta G = G_B - G_A.
    ratio = math.exp(-2.0)
    x = 4.0
    descent = [x]
    for _ in range(6):
        x = x - 0.25 * 2.0 * x  # U=x*x; step is an optimizer parameter, not time.
        descent.append(x)
    return {
        "kind": "synthetic dimensionless teaching examples",
        "delta_g_over_kbt": 2.0,
        "p_b_over_p_a": ratio,
        "p_b": ratio / (1 + ratio),
        "gradient_descent_x": descent,
        "gradient_descent_u": [x * x for x in descent],
        "binding_fold_for_10x_kd_delta_g_over_rt": math.log(10.0),
    }


def sampling():
    series = [1.0] * 50 + [3.0] * 50
    blocks = [sum(series[i : i + 25]) / 25 for i in range(0, 100, 25)]
    return {
        "kind": "synthetic time series, not measured MD",
        "frames": len(series),
        "mean": sum(series) / len(series),
        "block_means": blocks,
        "independent_replica_means_example": [1.1, 2.0, 2.9],
        "interpretation": "A mean of 2 hides a change from one regime to another",
    }


def graph(cutoff=4.1):
    points = [(0.0, 0.0, 0.0), (4.0, 0.0, 0.0), (8.0, 0.0, 0.0), (4.0, 3.0, 0.0)]
    labels = ["A", "B", "C", "D"]
    edges = [
        (i, j)
        for i in range(4)
        for j in range(i + 1, 4)
        if math.dist(points[i], points[j]) <= cutoff
    ]
    return {
        "kind": "synthetic four-node geometry, not an actual protein",
        "cutoff_angstrom": cutoff,
        "coordinates_angstrom": dict(zip(labels, points, strict=True)),
        "edges": [[labels[i], labels[j]] for i, j in edges],
        "degrees": {labels[i]: sum(i in edge for edge in edges) for i in range(4)},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("exercise", choices=["geometry", "energy", "sampling", "graph", "all"])
    parser.add_argument(
        "--pdb", type=Path, default=Path(__file__).parent / "gromacs/1ubq-protein.pdb"
    )
    parser.add_argument("--cutoff", type=float, default=4.1)
    args = parser.parse_args()
    actions = {
        "geometry": lambda: geometry(args.pdb),
        "energy": energy,
        "sampling": sampling,
        "graph": lambda: graph(args.cutoff),
    }
    result = (
        {k: f() for k, f in actions.items()} if args.exercise == "all" else actions[args.exercise]()
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
