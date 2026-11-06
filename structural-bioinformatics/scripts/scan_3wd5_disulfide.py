#!/usr/bin/env python3
"""Bounded two-torsion sensitivity scan; not a receptor repair procedure."""

import hashlib
import json
from pathlib import Path

import numpy as np
from Bio.PDB import PDBParser

SOURCE = Path(__file__).resolve().parents[1] / "assets/3wd5.pdb"
SHA = "fae6eee1b06b8cba0a466280dbc32563efaa54ec639afd921cb610d17debd216"


def scan(path=SOURCE):
    raw = Path(path).read_bytes()
    if hashlib.sha256(raw).hexdigest() != SHA:
        raise ValueError("Unexpected source")
    model = PDBParser(QUIET=True).get_structure("3wd5", path)[0]
    chain = model["A"]
    a, b = chain[69], chain[101]
    degrees = np.arange(-180, 180, 2)

    def rotated(res):
        ca, cb, sg = (res[n].coord.astype(float) for n in ("CA", "CB", "SG"))
        axis = (cb - ca) / np.linalg.norm(cb - ca)
        v = sg - cb
        t = np.deg2rad(degrees)[:, None]
        return (
            cb
            + v * np.cos(t)
            + np.cross(axis, v) * np.sin(t)
            + axis * np.dot(axis, v) * (1 - np.cos(t))
        )

    p, q = rotated(a), rotated(b)
    x, y = p[:, None, :], q[None, :, :]
    d = y - x
    length = np.linalg.norm(d, axis=2)
    u, v = a["CB"].coord - x, b["CB"].coord - y
    angle1 = np.degrees(
        np.arccos(np.clip(np.sum(u * d, axis=2) / np.linalg.norm(u, axis=2) / length, -1, 1))
    )
    angle2 = np.degrees(
        np.arccos(np.clip(np.sum(v * (-d), axis=2) / np.linalg.norm(v, axis=2) / length, -1, 1))
    )
    # All occupied deposited protein heavy atoms in all three chains, excluding
    # the two residues whose covalent geometry is considered separately.
    neighbors = np.array(
        [
            atom.coord
            for c in model
            if c.id in "AHL"
            for atom in c.get_atoms()
            if atom.parent.id[0] == " "
            and (c.id != "A" or atom.parent.id[1] not in (69, 101))
            and atom.element not in ("H", "D")
            and atom.occupancy is not None
            and atom.occupancy > 0
        ]
    )
    near_p = np.linalg.norm(p[:, None, :] - neighbors[None, :, :], axis=2).min(axis=1)
    near_q = np.linalg.norm(q[:, None, :] - neighbors[None, :, :], axis=2).min(axis=1)
    # Steric cross-check against the other cysteine's backbone and CB, with
    # SG--SG handled separately. Within-residue geometry stays rigid.
    other_a = np.array([atom.coord for atom in a if atom.name != "SG"])
    other_b = np.array([atom.coord for atom in b if atom.name != "SG"])
    near_p = np.minimum(
        near_p, np.linalg.norm(p[:, None, :] - other_b[None, :, :], axis=2).min(axis=1)
    )
    near_q = np.minimum(
        near_q, np.linalg.norm(q[:, None, :] - other_a[None, :, :], axis=2).min(axis=1)
    )
    valid = (
        (length >= 1.9)
        & (length <= 2.2)
        & (angle1 >= 95)
        & (angle1 <= 115)
        & (angle2 >= 95)
        & (angle2 <= 115)
        & (near_p[:, None] >= 2.5)
        & (near_q[None, :] >= 2.5)
    )
    moves = np.sqrt(
        np.sum((x - a["SG"].coord) ** 2, axis=2) + np.sum((y - b["SG"].coord) ** 2, axis=2)
    )
    result = {
        "source_sha256": SHA,
        "grid_degrees": 2,
        "grid_points": int(valid.size),
        "distance_window_angstrom": [1.9, 2.2],
        "angle_window_degrees": [95, 115],
        "minimum_other_heavy_atom_distance_angstrom": 2.5,
        "passing_grid_points": int(valid.sum()),
        "best": None,
    }
    if valid.any():
        i, j = np.unravel_index(np.argmin(np.where(valid, moves, np.inf)), valid.shape)
        result["best"] = {
            "rotation_degrees": [int(degrees[i]), int(degrees[j])],
            "sg_displacements_angstrom": [
                round(float(np.linalg.norm(p[i] - a["SG"].coord)), 3),
                round(float(np.linalg.norm(q[j] - b["SG"].coord)), 3),
            ],
            "sg_sg_angstrom": round(float(length[i, j]), 3),
            "cb_sg_sg_angles_degrees": [
                round(float(angle1[i, j]), 2),
                round(float(angle2[i, j]), 2),
            ],
            "nearest_other_heavy_atom_angstrom": [
                round(float(near_p[i]), 3),
                round(float(near_q[j]), 3),
            ],
        }
    return result


if __name__ == "__main__":
    print(json.dumps(scan(), indent=2))
