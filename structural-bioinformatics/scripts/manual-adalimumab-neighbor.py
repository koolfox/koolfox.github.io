#!/usr/bin/env python3
"""Measure contacts in the separately reconstructed symmetry file; offline."""

import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "fragment", ROOT / "scripts/manual-adalimumab-extract.py"
)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)
DERIVED = ROOT / "assets/3wd5-trimer-3fab.pdb"
EXPECTED = "260d6967b3660a014d8f238dbf1d579d7f796d46e1c4eada74b48bb1efb26974"


def calculate():
    data = DERIVED.read_bytes()
    if hashlib.sha256(data).hexdigest() != EXPECTED:
        raise ValueError("Derived reconstruction hash mismatch")
    original, _ = MOD.build(MOD.SOURCE.read_bytes())

    def read(data):
        return [
            MOD.atom(line)
            for line in data.decode("ascii").splitlines()
            if line.startswith("ATOM  ")
        ]

    source_atoms = read(original)
    records = read(data)
    fragment = [
        a
        for a in records
        if a["chain"] == "H"
        and (a["author_number"], a["insertion"], a["resname"]) in MOD.RESIDUES
        and a["occupancy"] > 0
        and a["altloc"] in ("", "A")
    ]
    fields = (
        "name",
        "altloc",
        "resname",
        "chain",
        "author_number",
        "insertion",
        "xyz",
        "occupancy",
        "element",
    )
    if [[a[k] for k in fields] for a in fragment] != [[a[k] for k in fields] for a in source_atoms]:
        raise ValueError("Reconstruction H fragment differs from deposited coordinates")
    peptide = [a for a in fragment if a["element"] not in ("H", "D")]
    chains = {}
    for chain in "ABC":
        target = [
            a
            for a in records
            if a["chain"] == chain
            and a["occupancy"] > 0
            and a["altloc"] in ("", "A")
            and a["element"] not in ("H", "D")
        ]
        pairs = [(math.dist(a["xyz"], b["xyz"]), a, b) for a in peptide for b in target]
        contacts = sorted((item for item in pairs if item[0] <= 4.5), key=lambda item: item[0])

        def row(item):
            return {
                "distance_angstrom": round(item[0], 4),
                "peptide_atom": MOD.label(item[1]),
                "tnf_atom": MOD.label(item[2]),
            }

        chains[chain] = {
            "contact_count": len(contacts),
            "minimum_distance_angstrom": round(min(x[0] for x in pairs), 4),
            "pairs": [row(item) for item in contacts],
        }
    return {
        "source": "assets/3wd5-trimer-3fab.pdb",
        "sha256": EXPECTED,
        "construction": (
            "Existing repository reconstruction using crystal symmetry; not a separately "
            "deposited structure. See scripts/analyze_full_epitope.py and "
            "data/processed/full-epitope.json."
        ),
        "method": (
            "positive occupancy non-hydrogen ATOM pairs, blank/A "
            "alternate, H52-59 versus each TNF chain, <=4.5 angstrom"
        ),
        "fragment_matches_deposited_coordinates": True,
        "chains": chains,
        "limitations": (
            "Static distances in a derived symmetry model; "
            "no proof of isolated peptide binding or affinity."
        ),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        type=Path,
        required=True,
        help="New directory to create; existing paths are never overwritten",
    )
    output_dir = parser.parse_args().output_dir
    output_dir.mkdir()
    report = calculate()
    with (output_dir / "manual-adalimumab-neighbor.json").open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
