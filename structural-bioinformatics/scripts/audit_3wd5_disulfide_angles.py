#!/usr/bin/env python3
"""Independently measure the deposited 3WD5 disulfide using scalar vector math."""

import hashlib
import json
import math
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1] / "assets/3wd5.pdb"
SHA = "fae6eee1b06b8cba0a466280dbc32563efaa54ec639afd921cb610d17debd216"


def subtract(a, b):
    return tuple(x - y for x, y in zip(a, b, strict=True))


def dot(a, b):
    return sum(x * y for x, y in zip(a, b, strict=True))


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def unit(a):
    length = math.sqrt(dot(a, a))
    if length < 1e-12:
        raise ValueError("Undefined geometry: zero-length vector")
    return tuple(x / length for x in a)


def angle(a, b, c):
    u, v = unit(subtract(a, b)), unit(subtract(c, b))
    return math.degrees(math.acos(max(-1.0, min(1.0, dot(u, v)))))


def dihedral(a, b, c, d):
    # The oriented angle between the normals to planes ABC and BCD, with
    # sign determined by the B->C bond. atan2 gives (-180, 180] degrees.
    axis = unit(subtract(c, b))
    n1 = unit(cross(subtract(b, a), subtract(c, b)))
    n2 = unit(cross(subtract(c, b), subtract(d, c)))
    return math.degrees(math.atan2(dot(cross(n1, n2), axis), dot(n1, n2)))


def audit(path=SOURCE):
    raw = Path(path).read_bytes()
    if hashlib.sha256(raw).hexdigest() != SHA:
        raise ValueError("Unexpected source hash")
    atoms = {}
    for line in raw.decode("ascii").splitlines():
        if not line.startswith("ATOM  ") or line[21:22] != "A":
            continue
        if line[22:26].strip() not in ("69", "101") or line[26:27] != " ":
            continue
        if line[12:16].strip() not in ("CB", "SG"):
            continue
        key = (int(line[22:26]), line[12:16].strip())
        if key in atoms or line[16:17] != " " or float(line[54:60]) <= 0:
            raise ValueError(f"Ambiguous or unoccupied atom: {key}")
        atoms[key] = tuple(float(line[i : i + 8]) for i in (30, 38, 46))
    expected = [(69, "CB"), (69, "SG"), (101, "SG"), (101, "CB")]
    if set(atoms) != set(expected):
        raise ValueError("Expected four cysteine atoms")
    a, b, c, d = (atoms[key] for key in expected)
    return {
        "source_sha256": SHA,
        "atom_order_author_chain_A": [f"{res}:{name}" for res, name in expected],
        "coordinates_angstrom": [list(atoms[key]) for key in expected],
        "occupancies": "all positive; exactly one record per atom and no alternate location",
        "cb69_sg69_sg101_degrees": round(angle(a, b, c), 3),
        "sg69_sg101_cb101_degrees": round(angle(b, c, d), 3),
        "cb69_sg69_sg101_cb101_dihedral_degrees": round(dihedral(a, b, c, d), 3),
    }


if __name__ == "__main__":
    print(json.dumps(audit(), indent=2))
