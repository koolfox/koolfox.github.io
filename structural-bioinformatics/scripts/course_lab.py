"""Offline teaching experiments; outputs never replace curated research results.

Run from the repository root using uv run --project structural-bioinformatics
python structural-bioinformatics/scripts/course_lab.py --help.
"""

import argparse
import json
from pathlib import Path

import numpy as np

from tnf_atlas.feasibility import selected_model

PROJECT = Path(__file__).resolve().parents[1]


def geometry(chain="A", shift=10.0):
    """Compare identical CA atoms before and after a known rigid translation.

    Equal-weight CA radius of gyration is a teaching measure, not mass-weighted
    all-atom Rg. No superposition algorithm is being tested by subtracting shift.
    """
    model = selected_model(PROJECT / "assets/3wd5.pdb", chains=(chain,))
    xyz = np.array([a.coord for a in model.get_atoms() if a.name == "CA"])
    center = xyz.mean(axis=0)
    displaced = xyz + np.array([shift, 0.0, 0.0])
    return {
        "selection": f"3WD5 author chain {chain}, positive-occupancy CA",
        "ca_count": len(xyz),
        "equal_weight_ca_rg_angstrom": float(np.sqrt(np.mean(np.sum((xyz - center) ** 2, axis=1)))),
        "known_translation_angstrom": shift,
        "raw_rmsd_angstrom": float(np.sqrt(np.mean(np.sum((xyz - displaced) ** 2, axis=1)))),
        "translation_removed_rmsd_angstrom": float(
            np.sqrt(
                np.mean(
                    np.sum(((xyz - center) - (displaced - displaced.mean(axis=0))) ** 2, axis=1)
                )
            )
        ),
        "interpretation": (
            "Same conformation; translation changes raw RMSD, not centered RMSD or Rg."
        ),
    }


def harmonic(dt=0.01, steps=1000):
    """Velocity-Verlet for U=x²/2, mass=1; all units dimensionless, no protein."""
    if not 0 < dt < 2 or not 1 <= steps <= 100000:
        raise ValueError("Use 0 < dt < 2 and 1 <= steps <= 100000")
    x, velocity = 1.0, 0.0
    energies = [0.5]
    for _ in range(steps):
        velocity -= 0.5 * dt * x
        x += dt * velocity
        velocity -= 0.5 * dt * x
        energies.append(0.5 * (x * x + velocity * velocity))
    return {
        "system": "One dimensionless harmonic oscillator; not molecular dynamics of a protein",
        "dt": dt,
        "steps": steps,
        "initial_energy": energies[0],
        "final_energy": energies[-1],
        "maximum_absolute_energy_error": max(abs(e - energies[0]) for e in energies),
        "x_final": x,
    }


def network(cutoff=8.0):
    """Undirected CA contact graph; chain A only, excludes immediate neighbours."""
    if not 0 < cutoff <= 30:
        raise ValueError("Use 0 < cutoff <= 30 angstrom")
    chain = selected_model(PROJECT / "assets/3wd5.pdb", chains=("A",))["A"]
    atoms = [a for a in chain.get_atoms() if a.name == "CA"]
    edges, degrees = [], [0] * len(atoms)
    for i, left in enumerate(atoms):
        for j in range(i + 1, len(atoms)):
            right = atoms[j]
            # Author-number adjacency, not index adjacency after removing missing residues.
            if abs(left.parent.id[1] - right.parent.id[1]) <= 1:
                continue
            if np.linalg.norm(left.coord - right.coord) <= cutoff:
                edges.append([left.parent.id[1], right.parent.id[1]])
                degrees[i] += 1
                degrees[j] += 1
    return {
        "selection": "3WD5 chain A, positive-occupancy CA; |author residue numbers| > 1",
        "cutoff_angstrom": cutoff,
        "nodes": len(atoms),
        "edge_count": len(edges),
        "degree_sum": sum(degrees),
        "degrees": {str(a.parent.id[1]): d for a, d in zip(atoms, degrees, strict=True)},
        "edges": edges,
        "interpretation": "Geometric contact graph, not an energy or causal network",
    }


def inspect():
    model = selected_model(PROJECT / "assets/3wd5.pdb")
    return {
        "input": "assets/3wd5.pdb; first model, selected positive-occupancy protein heavy atoms",
        "chains": {
            chain.id: {"residues": len(list(chain)), "heavy_atoms": len(list(chain.get_atoms()))}
            for chain in model
        },
        "roles": {"A": "deposited TNF protomer", "H": "Fab heavy", "L": "Fab light"},
        "missing": "Neither full IgG nor the complete biological TNF trimer",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("experiment", choices=("inspect", "geometry", "oscillator", "network"))
    parser.add_argument("--chain", choices=("A", "H", "L"), default="A")
    parser.add_argument("--shift", type=float, default=10.0)
    parser.add_argument("--dt", type=float, default=0.01)
    parser.add_argument("--steps", type=int, default=1000)
    parser.add_argument("--cutoff", type=float, default=8.0)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if not np.isfinite(args.shift):
        parser.error("shift must be finite")
    functions = {
        "inspect": inspect,
        "geometry": lambda: geometry(args.chain, args.shift),
        "oscillator": lambda: harmonic(args.dt, args.steps),
        "network": lambda: network(args.cutoff),
    }
    result = json.dumps(functions[args.experiment](), ensure_ascii=False, indent=2)
    if args.output:
        destination = args.output.resolve()
        results = (PROJECT / "results").resolve()
        if results not in destination.parents:
            parser.error("Write exercise outputs only under structural-bioinformatics/results/")
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(result + "\n")
    print(result)


if __name__ == "__main__":
    main()
