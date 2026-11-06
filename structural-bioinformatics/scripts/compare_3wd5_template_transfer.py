#!/usr/bin/env python3
"""Compare two local 7TA3 sulfur transfers; never output receptor coordinates."""

import hashlib
import json
from pathlib import Path

import Bio
import numpy as np
from audit_3wd5_disulfide_angles import angle, dihedral
from Bio.PDB import PDBParser, Superimposer
from scan_3wd5_disulfide import SHA

COEFF_SHA = "4a4f2d98a9f1bdaaf9ffa70115be757d96f2e881dfef9d9b01c332c7864c0322"
MAP_SHA = "9bfadd1b1f4ef8b4746129f4668ffe8c0c1e873faa206e96265646f3c3a5922d"


def verify(path, expected):
    if hashlib.sha256(Path(path).read_bytes()).hexdigest() != expected:
        raise ValueError(f"Unexpected SHA-256 for {path}")


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT / "assets/3wd5.pdb"
TEMPLATE = PROJECT / "assets/tnf-peptide/7ta3.pdb"
TEMPLATE_SHA = "3c90d11838c88ebb5501319b367c6ac89e16c67c9a84aa22d17d5a4708052de4"


def candidate(target, template):
    """Fit N/CA/C of both cysteines; transfer only SG coordinates."""
    fit = Superimposer()
    fit.set_atoms(
        [target[n][a] for n in (69, 101) for a in ("N", "CA", "C")],
        [template[n][a] for n in (69, 101) for a in ("N", "CA", "C")],
    )
    rotation, translation = fit.rotran
    return fit.rms, [
        template[n]["SG"].coord.astype(float) @ rotation + translation for n in (69, 101)
    ]


def measure(target, positions, grid, mean, sigma):
    from compare_3wd5_local_density import sample

    cb = [target[n]["CB"].coord.astype(float) for n in (69, 101)]
    deposited = [target[n]["SG"].coord.astype(float) for n in (69, 101)]
    distances = []
    for number, pos in zip((69, 101), positions, strict=True):
        others = [
            (
                float(np.linalg.norm(pos - atom.coord)),
                atom.get_parent().get_parent().id,
                atom.get_parent().id[1],
                atom.name,
            )
            for atom in target.get_parent().get_atoms()
            if atom.element not in ("H", "D")
            and atom.occupancy is not None
            and atom.occupancy > 0
            and not (
                atom.get_parent().get_parent().id == "A"
                and (
                    atom.get_parent().id[1] == number
                    or (atom.get_parent().id[1] in (69, 101) and atom.name == "SG")
                )
            )
        ]
        distances.append(min(others))
    return {
        "sg_displacement_angstrom": [
            float(np.linalg.norm(a - b)) for a, b in zip(positions, deposited, strict=True)
        ],
        "cb_sg_angstrom": [
            float(np.linalg.norm(a - b)) for a, b in zip(cb, positions, strict=True)
        ],
        "sg_sg_angstrom": float(np.linalg.norm(positions[0] - positions[1])),
        "sg69_cb101_angstrom": float(np.linalg.norm(positions[0] - cb[1])),
        "angles_degrees": [
            angle(cb[0], positions[0], positions[1]),
            angle(positions[0], positions[1], cb[1]),
        ],
        "dihedral_degrees": dihedral(cb[0], positions[0], positions[1], cb[1]),
        "nearest_other_occupied_heavy_atom": distances,
        "density": [sample(grid, pos, mean, sigma) for pos in positions],
    }


def run(map_path, coefficients):
    for path, expected in (
        (SOURCE, SHA),
        (TEMPLATE, TEMPLATE_SHA),
        (map_path, MAP_SHA),
        (coefficients, COEFF_SHA),
    ):
        verify(path, expected)
    import gemmi

    grid = gemmi.read_ccp4_map(str(map_path)).grid
    block = gemmi.as_refln_blocks(gemmi.cif.read(str(coefficients)))[0]
    if not np.array_equal(
        np.asarray(grid),
        np.asarray(block.transform_f_phi_to_map("pdbx_FWT", "pdbx_PHWT", sample_rate=3.0)),
    ):
        raise ValueError("map does not reproduce from coefficients")
    arr = np.asarray(grid)
    mean, sigma = float(np.mean(arr, dtype=np.float64)), float(np.std(arr, dtype=np.float64))
    parser = PDBParser(QUIET=True, PERMISSIVE=False)
    target = parser.get_structure("target", SOURCE)[0]["A"]
    source = parser.get_structure("template", TEMPLATE)[0]
    results = {}
    for chain in ("B", "D"):
        rms, positions = candidate(target, source[chain])
        results[chain] = {
            "backbone_fit_rmsd_angstrom": rms,
            **measure(target, positions, grid, mean, sigma),
        }
    return {
        "input_sha256": {
            "3wd5": SHA,
            "7ta3": TEMPLATE_SHA,
            "map": MAP_SHA,
            "coefficients": COEFF_SHA,
        },
        "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "helper_sha256": {
            name: hashlib.sha256((PROJECT / "scripts" / name).read_bytes()).hexdigest()
            for name in (
                "compare_3wd5_local_density.py",
                "audit_3wd5_disulfide_angles.py",
                "scan_3wd5_disulfide.py",
            )
        },
        "biopython": Bio.__version__,
        "gemmi": gemmi.__version__,
        "numpy": np.__version__,
        "candidates": results,
    }


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--map", type=Path, required=True)
    p.add_argument("--coefficients", type=Path, required=True)
    args = p.parse_args()
    print(json.dumps(run(args.map, args.coefficients), indent=2, allow_nan=False))
