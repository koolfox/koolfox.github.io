"""Audit deposited 3WD5 geometry and zero occupancy without modifying coordinates."""

import argparse
import hashlib
import json
from pathlib import Path

from Bio.PDB import PDBParser


def audit(path):
    path = Path(path)
    structure = PDBParser(QUIET=True, PERMISSIVE=False).get_structure("input", str(path))
    if len(list(structure)) != 1:
        raise ValueError("Expected a single deposited model")
    model = structure[0]
    zero = {}
    for chain in "AHL":
        zero[chain] = [
            {"residue": r.id[1], "insertion": r.id[2].strip(), "name": r.resname, "atom": a.name}
            for r in model[chain]
            if r.id[0] == " "
            for a in r
            if a.occupancy is not None and a.occupancy <= 0
        ]
    pairs = []
    for chain, first, second in [
        ("A", 69, 101),
        ("L", 23, 88),
        ("L", 134, 194),
        ("H", 22, 96),
        ("H", 148, 204),
    ]:
        a, b = model[chain][first], model[chain][second]
        pairs.append(
            {
                "chain": chain,
                "residues": [first, second],
                "sg_sg_angstrom": round(float(a["SG"] - b["SG"]), 3),
                "first_sg_second_cb_angstrom": round(float(a["SG"] - b["CB"]), 3),
                "first_cb_second_sg_angstrom": round(float(a["CB"] - b["SG"]), 3),
            }
        )
    return {
        "source_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "zero_occupancy_atoms": zero,
        "deposited_ssbond_pairs": pairs,
        "meeko_0_8_0_carbon_sulfur_cutoff_angstrom": 2.172,
        "status": "not_prepared",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdb", type=Path)
    args = parser.parse_args()
    print(json.dumps(audit(args.pdb), indent=2))


if __name__ == "__main__":
    main()
