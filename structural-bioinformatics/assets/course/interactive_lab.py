"""Inspectable numerical engines shared by native Python and browser Shiny.

Geometry and the optional protein graph use the curated 1UBQ C-alpha coordinates.
All transformations, sequences, energy models and time series are teaching examples.
"""

import hashlib
import math
import random
from pathlib import Path

import numpy as np

REFERENCE_SHA256 = "f1899546f581eaba2c618f012097644e1ab2aa281c47c13cbb3747147ca17fc3"


def bounded(value, low, high, *, integer=False):
    value = float(value)
    if not math.isfinite(value) or not low <= value <= high or integer and value != int(value):
        raise ValueError("Value outside the supported teaching range")
    return int(value) if integer else value


def reference(path):
    data = Path(path).read_bytes()
    if hashlib.sha256(data).hexdigest() != REFERENCE_SHA256:
        raise ValueError("The curated reference file has changed")
    labels, points = [], []
    for row in data.decode().splitlines():
        if row.startswith("ATOM  ") and row[12:16].strip() == "CA" and float(row[54:60]) > 0:
            labels.append(f"{row[21]}:{int(row[22:26])}{row[26].strip()}")
            points.append([float(row[i : i + 8]) for i in (30, 38, 46)])
    return labels, np.array(points, dtype=float)


def rmsd(left, right):
    return float(np.sqrt(np.mean(np.sum((left - right) ** 2, axis=1))))


def fit(moving, fixed):
    """Equal-weight Kabsch fit with a proper rotation (no mirror reflection)."""
    moving_center, fixed_center = moving.mean(axis=0), fixed.mean(axis=0)
    left, _, right = np.linalg.svd((moving - moving_center).T @ (fixed - fixed_center))
    correction = np.diag([1.0, 1.0, np.linalg.det(left @ right)])
    rotation = left @ correction @ right
    return (moving - moving_center) @ rotation + fixed_center


def geometry(path, shift=10, angle=0, deformation=0):
    shift, angle, deformation = (
        bounded(shift, -20, 20),
        bounded(angle, -180, 180),
        bounded(deformation, -5, 5),
    )
    labels, fixed = reference(path)
    center = fixed.mean(axis=0)
    theta = math.radians(angle)
    c, s = math.cos(theta), math.sin(theta)
    rotation = np.array([[c, s, 0], [-s, c, 0], [0, 0, 1]])
    moving = (fixed - center) @ rotation + center + [shift, 0, 0]
    moving[20, 0] += deformation
    fitted = fit(moving, fixed)
    return {
        "mode": "geometry",
        "kind": "curated coordinates with artificial perturbations",
        "config": {"shift": shift, "angle": angle, "deformation": deformation},
        "source_sha256": REFERENCE_SHA256,
        "labels": labels,
        "fixed": fixed.tolist(),
        "moving": moving.tolist(),
        "fitted": fitted.tolist(),
        "raw_rmsd": rmsd(moving, fixed),
        "fitted_rmsd": rmsd(fitted, fixed),
        "reference_rg": float(np.sqrt(np.mean(np.sum((fixed - center) ** 2, axis=1)))),
        "moving_rg": float(np.sqrt(np.mean(np.sum((moving - moving.mean(axis=0)) ** 2, axis=1)))),
    }


def sequence(text="ATGGCTTAA"):
    dna = "".join(text.upper().split())
    if not dna or len(dna) > 300 or set(dna) - set("ACGT"):
        raise ValueError("Use 1 to 300 unambiguous DNA bases A/C/G/T")
    complement = dna.translate(str.maketrans("ACGT", "TGCA"))
    return {
        "mode": "sequence",
        "kind": "user-entered teaching sequence, assumed coding strand",
        "config": {"dna": dna},
        "length": len(dna),
        "complement_3_to_5": complement,
        "reverse_complement_5_to_3": complement[::-1],
        "rna_5_to_3": dna.replace("T", "U"),
        "gc_percent": 100 * (dna.count("G") + dna.count("C")) / len(dna),
        "counts": {base: dna.count(base) for base in "ACGT"},
    }


def populations(delta=2):
    delta = bounded(delta, -6, 6)
    return {
        "mode": "energy",
        "kind": "synthetic dimensionless two-state model",
        "config": {"delta": delta},
        "ratio": math.exp(-delta),
        "probability_b": 1 / (1 + math.exp(delta)),
        "curve": [[x / 20, 1 / (1 + math.exp(x / 20))] for x in range(-120, 121)],
    }


def minimize(start=4, rate=0.25, steps=6):
    start, rate, steps = (
        bounded(start, -8, 8),
        bounded(rate, 0.01, 1.2),
        bounded(steps, 0, 20, integer=True),
    )
    positions = [start]
    for _ in range(steps):
        positions.append(positions[-1] * (1 - 2 * rate))
    return {
        "mode": "minimization",
        "kind": "synthetic U(x)=x squared; iterations are not MD time",
        "config": {"start": start, "rate": rate, "steps": steps},
        "positions": positions,
        "energies": [x * x for x in positions],
    }


def sampling(shift=2, noise=0.2, correlation=0.8, seed=7, block=25):
    shift, noise, correlation = (
        bounded(shift, 0, 4),
        bounded(noise, 0, 1),
        bounded(correlation, 0, 0.95),
    )
    seed, block = bounded(seed, 0, 99999, integer=True), bounded(block, 10, 50, integer=True)
    if 200 % block:
        raise ValueError("Block size must divide 200")
    rng = random.Random(seed)
    residual = rng.gauss(0, noise)
    series = []
    for i in range(200):
        if i:
            residual = correlation * residual + rng.gauss(0, noise * math.sqrt(1 - correlation**2))
        series.append(1 + (shift if i >= 100 else 0) + residual)
    means = [sum(series[i : i + block]) / block for i in range(0, 200, block)]
    return {
        "mode": "sampling",
        "kind": "synthetic correlated series with optional mean shift, not MD",
        "config": {
            "shift": shift,
            "noise": noise,
            "correlation": correlation,
            "seed": seed,
            "block": block,
        },
        "series": series,
        "mean": sum(series) / 200,
        "block_means": means,
    }


def graph(path, cutoff=4.1, dataset="toy", exclude=0, selected="B"):
    cutoff, exclude = bounded(cutoff, 3, 12), bounded(exclude, 0, 2, integer=True)
    if dataset == "toy":
        labels, points = (
            ["A", "B", "C", "D"],
            np.array([[0, 0, 0], [4, 0, 0], [8, 0, 0], [4, 3, 0]]),
        )
    elif dataset == "protein":
        labels, points = reference(path)
    else:
        raise ValueError("Unknown graph input")
    edges = []
    for i in range(len(points)):
        for j in range(i + 1, len(points)):
            if dataset == "protein" and j - i <= exclude:
                continue
            distance = float(np.linalg.norm(points[i] - points[j]))
            if distance <= cutoff:
                edges.append([i, j, distance])
    degrees = [sum(i in edge[:2] for edge in edges) for i in range(len(points))]
    if selected not in labels:
        selected = labels[int(np.argmax(degrees))]
    index = labels.index(selected)
    neighbors = [
        [labels[j if i == index else i], distance] for i, j, distance in edges if index in (i, j)
    ]
    return {
        "mode": "graph",
        "kind": "synthetic points" if dataset == "toy" else "curated C-alpha graph",
        "config": {"cutoff": cutoff, "dataset": dataset, "exclude": exclude, "selected": selected},
        "source_sha256": REFERENCE_SHA256 if dataset == "protein" else None,
        "labels": labels,
        "points": points.tolist(),
        "edges": edges,
        "degrees": degrees,
        "neighbors": neighbors,
    }
