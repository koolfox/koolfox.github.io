#!/usr/bin/env python3
"""Read-only audit of the reconstructed 3WD5 A/B/C receptor."""

import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from audit_3wd5_disulfide_angles import angle, dihedral
from Bio.PDB import PDBParser

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT / "src"))
from peptide_lab.receptor_input import BACKBONE, SIDE_CHAINS, inspect_pdb  # noqa: E402


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def audit():
    source = PROJECT / "assets/3wd5.pdb"
    reconstructed = PROJECT / "assets/3wd5-trimer-3fab.pdb"
    model = PDBParser(QUIET=True, PERMISSIVE=False).get_structure("trimer", reconstructed)[0]
    deposited = PDBParser(QUIET=True, PERMISSIVE=False).get_structure("source", source)[0]["A"]
    records = [
        line
        for line in source.read_text().splitlines()
        if line.startswith("ATOM  ") and line[21] == "A"
    ]
    alternatives = [
        {
            "residue": int(line[22:26]),
            "insertion": line[26].strip(),
            "atom": line[12:16].strip(),
            "alt": line[16],
            "occupancy": float(line[54:60]),
        }
        for line in records
        if line[16] != " "
    ]
    source_atoms = {
        (r.id[1], r.id[2], a.name): a
        for r in deposited
        if r.id[0] == " "
        for a in r
        if a.element not in ("H", "D") and a.occupancy > 0
    }
    result = {
        "source_sha256": sha(source),
        "reconstruction_sha256": sha(reconstructed),
        "deposited_A_alternate_records": alternatives,
        "chains": {},
    }
    for chain_id, permutation in (("A", (0, 1, 2)), ("B", (1, 2, 0)), ("C", (2, 0, 1))):
        chain = model[chain_id]
        atoms = {(r.id[1], r.id[2], a.name): a for r in chain for a in r}
        common = atoms.keys() & source_atoms.keys()
        errors = [
            np.linalg.norm(
                atoms[k].coord.astype(float)
                - source_atoms[k].coord.astype(float)[list(permutation)]
            )
            for k in common
        ]
        missing = []
        for residue in chain:
            expected = BACKBONE | SIDE_CHAINS[residue.resname]
            absent = sorted(expected - {a.name for a in residue})
            if absent:
                missing.append({"residue": residue.id[1], "name": residue.resname, "atoms": absent})
        numbers = sorted(r.id[1] for r in chain)
        r69, r101 = chain[69], chain[101]
        a, b, c, d = [
            tuple(x.coord.astype(float)) for x in (r69["CB"], r69["SG"], r101["SG"], r101["CB"])
        ]

        def distance(x, y):
            return round(float(np.linalg.norm(np.array(x) - np.array(y))), 3)

        try:
            inspection = inspect_pdb(reconstructed, chain_id)
            preflight = inspection["status"]
        except ValueError as exc:
            preflight = f"rejected: {exc}"
        result["chains"][chain_id] = {
            "source_chain": "A",
            "axis_permutation": permutation,
            "atom_count": len(atoms),
            "source_selected_atom_count": len(source_atoms),
            "missing_source_keys": len(source_atoms.keys() - atoms.keys()),
            "extra_keys": len(atoms.keys() - source_atoms.keys()),
            "max_mapping_error_angstrom": round(max(errors), 6),
            "residue_count": len(numbers),
            "residue_range": [numbers[0], numbers[-1]],
            "internal_absent_residue_numbers": sorted(
                set(range(numbers[0], numbers[-1] + 1)) - set(numbers)
            ),
            "missing_heavy_atoms": missing,
            "zero_occupancy_atoms": sum(
                a.occupancy is None or a.occupancy <= 0 for a in atoms.values()
            ),
            "alternate_selected_atoms": sum(a.is_disordered() != 0 for a in atoms.values()),
            "inspection": preflight,
            "disulfide": {
                "sg_sg_angstrom": distance(b, c),
                "sg69_cb101_angstrom": distance(b, d),
                "cb69_sg101_angstrom": distance(a, c),
                "angles_degrees": [round(angle(a, b, c), 3), round(angle(b, c, d), 3)],
                "dihedral_degrees": round(dihedral(a, b, c, d), 3),
            },
        }
    return result


if __name__ == "__main__":
    print(json.dumps(audit(), indent=2))
