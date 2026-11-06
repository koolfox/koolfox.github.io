"""Geometric proximity screen; this does not establish molecular binding."""

import math
import re

import numpy as np

CLOSE_DISTANCE_ANGSTROM = 4.5
NEAR = "heavy_atoms_within_cutoff"
FAR = "no_heavy_atoms_within_cutoff"
ISSUE = "contains_poses_without_close_contact"


def coordinates(text):
    values = [
        [float(line[i : i + 8]) for i in (30, 38, 46)]
        for line in text.splitlines()
        if line.startswith(("ATOM  ", "HETATM")) and line.split()[-1] not in ("H", "HD")
    ]
    points = np.asarray(values, dtype=float)
    if not len(points) or not np.isfinite(points).all():
        raise ValueError("PDBQT has missing or invalid heavy-atom coordinates")
    return points


def classify(distance):
    if not math.isfinite(distance) or distance < 0:
        raise ValueError("Invalid heavy-atom distance")
    return NEAR if distance <= CLOSE_DISTANCE_ANGSTROM else FAR


def minimum_distance(first, second, *, block_size=256):
    """Minimum pairwise distance in angstroms with bounded temporary arrays."""
    first = np.asarray(first, dtype=float)
    second = np.asarray(second, dtype=float)
    if (
        first.ndim != 2
        or first.shape[1:] != (3,)
        or not len(first)
        or second.ndim != 2
        or second.shape[1:] != (3,)
        or not len(second)
        or not np.isfinite(first).all()
        or not np.isfinite(second).all()
        or not isinstance(block_size, int)
        or block_size < 1
    ):
        raise ValueError("Invalid coordinate arrays or block size")
    minimum_squared = float("inf")
    for i in range(0, len(first), block_size):
        for j in range(0, len(second), block_size):
            delta = first[i : i + block_size, None, :] - second[None, j : j + block_size, :]
            minimum_squared = min(minimum_squared, float(np.sum(delta * delta, axis=2).min()))
    return math.sqrt(minimum_squared)


def assess(receptor_text, poses_text):
    receptor = coordinates(receptor_text)
    blocks = re.findall(r"^MODEL\s+\d+\s*$(.*?)^ENDMDL\s*$", poses_text, re.M | re.S)
    if not blocks:
        raise ValueError("No complete poses")
    results = []
    for block in blocks:
        distance = minimum_distance(coordinates(block), receptor)
        results.append(
            {"minimum_heavy_atom_distance_angstrom": distance, "proximity": classify(distance)}
        )
    return results


def verify_recorded_geometry(receptor_text, poses_text, rows):
    measured = assess(receptor_text, poses_text)
    if len(rows) != len(measured):
        raise ValueError("Pose count differs from geometric screen")
    for row, actual in zip(rows, measured, strict=True):
        recorded = row.get("minimum_heavy_atom_distance_angstrom")
        if not isinstance(recorded, (int, float)) or not math.isclose(
            recorded, actual["minimum_heavy_atom_distance_angstrom"], rel_tol=0, abs_tol=1e-8
        ):
            raise ValueError("Recorded pose distance differs from coordinates")
        if "proximity" in row and row["proximity"] != actual["proximity"]:
            raise ValueError("Recorded proximity differs from coordinates")
    return measured
