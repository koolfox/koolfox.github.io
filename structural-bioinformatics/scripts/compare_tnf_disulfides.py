#!/usr/bin/env python3
"""Compare deposited TNF cysteines; never generate replacement coordinates."""

import hashlib
import json
import math
from pathlib import Path

from audit_3wd5_disulfide_angles import angle, dihedral

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "3WD5": (
        ROOT / "assets/3wd5.pdb",
        "fae6eee1b06b8cba0a466280dbc32563efaa54ec639afd921cb610d17debd216",
        ["A"],
    ),
    "7TA3": (
        ROOT / "assets/tnf-peptide/7ta3.pdb",
        "3c90d11838c88ebb5501319b367c6ac89e16c67c9a84aa22d17d5a4708052de4",
        ["B", "D"],
    ),
}


def measure(path, expected_sha, chains):
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != expected_sha:
        raise ValueError(f"Unexpected source hash: {path}")
    atoms = {}
    for line in raw.decode("ascii").splitlines():
        if line[:6].strip() != "ATOM" or line[21] not in chains:
            continue
        if line[22:26].strip() not in ("69", "101") or line[12:16].strip() not in ("CB", "SG"):
            continue
        if line[17:20] != "CYS" or line[16] != " " or line[26] != " " or float(line[54:60]) <= 0:
            raise ValueError("Unexpected residue, alternate, insertion, or occupancy")
        key = (line[21], int(line[22:26]), line[12:16].strip())
        if key in atoms:
            raise ValueError(f"Duplicate atom: {key}")
        atoms[key] = tuple(float(line[i : i + 8]) for i in (30, 38, 46))
    result = {}
    for chain in chains:
        cb1, sg1, sg2, cb2 = (
            atoms[(chain, residue, atom)]
            for residue, atom in ((69, "CB"), (69, "SG"), (101, "SG"), (101, "CB"))
        )
        result[chain] = {
            "sg_sg_angstrom": math.dist(sg1, sg2),
            "sg69_cb101_angstrom": math.dist(sg1, cb2),
            "cb69_sg69_sg101_degrees": angle(cb1, sg1, sg2),
            "sg69_sg101_cb101_degrees": angle(sg1, sg2, cb2),
            "cb69_sg69_sg101_cb101_degrees": dihedral(cb1, sg1, sg2, cb2),
        }
    return result


def main():
    result = {
        name: {"sha256": sha, "chains": measure(path, sha, chains)}
        for name, (path, sha, chains) in SOURCES.items()
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
