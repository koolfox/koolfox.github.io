#!/usr/bin/env python3
"""Extract a fixed contiguous segment from the deposited coordinate file, offline."""

import argparse
import hashlib
import json
import math
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT / "assets/3wd5.pdb"
SOURCE_SHA256 = "fae6eee1b06b8cba0a466280dbc32563efaa54ec639afd921cb610d17debd216"
RESIDUES = [
    ("52", "", "THR"),
    ("53", "", "TRP"),
    ("54", "", "ASN"),
    ("55", "", "SER"),
    ("56", "", "GLY"),
    ("57", "", "HIS"),
    ("58", "", "ILE"),
    ("59", "", "ASP"),
]
AA = {
    "THR": "T",
    "TRP": "W",
    "ASN": "N",
    "SER": "S",
    "GLY": "G",
    "HIS": "H",
    "ILE": "I",
    "ASP": "D",
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def atom(line):
    return {
        "name": line[12:16].strip(),
        "altloc": line[16].strip(),
        "resname": line[17:20].strip(),
        "chain": line[21],
        "author_number": line[22:26].strip(),
        "insertion": line[26].strip(),
        "xyz": [float(line[i : i + 8]) for i in (30, 38, 46)],
        "occupancy": float(line[54:60]),
        "element": line[76:78].strip(),
        "line": line,
    }


def label(a):
    return {
        k: a[k]
        for k in (
            "chain",
            "author_number",
            "insertion",
            "resname",
            "name",
            "altloc",
            "occupancy",
            "element",
        )
    }


def build(source):
    if sha(source) != SOURCE_SHA256:
        raise ValueError("Source SHA-256 mismatch")
    records = [
        atom(line) for line in source.decode("ascii").splitlines() if line.startswith("ATOM  ")
    ]
    picked = [
        a
        for a in records
        if a["chain"] == "H"
        and (a["author_number"], a["insertion"], a["resname"]) in RESIDUES
        and a["occupancy"] > 0
        and a["altloc"] in ("", "A")
    ]
    groups = [
        [a for a in picked if (a["author_number"], a["insertion"], a["resname"]) == key]
        for key in RESIDUES
    ]
    for group in groups:
        names = [a["name"] for a in group]
        if len(names) != len(set(names)) or not {"N", "CA", "C", "O"} <= set(names):
            raise ValueError("Missing or ambiguous backbone/alternate atom")
    bonds = []
    for left, right in zip(groups, groups[1:], strict=False):
        c = next(a for a in left if a["name"] == "C")
        n = next(a for a in right if a["name"] == "N")
        dist = math.dist(c["xyz"], n["xyz"])
        if not 1.1 <= dist <= 1.8:
            raise ValueError("Discontinuous backbone")
        bonds.append({"from": label(c), "to": label(n), "distance_angstrom": round(dist, 4)})
    targets = [
        a
        for a in records
        if a["chain"] == "A"
        and a["occupancy"] > 0
        and a["altloc"] in ("", "A")
        and a["element"] not in ("H", "D")
    ]
    peptide = [a for a in picked if a["element"] not in ("H", "D")]
    distances = [(math.dist(a["xyz"], b["xyz"]), a, b) for a in peptide for b in targets]
    contacts = sorted((d, a, b) for d, a, b in distances if d <= 4.5)

    def contact(item):
        d, a, b = item
        return {"distance_angstrom": round(d, 4), "peptide_atom": label(a), "tnf_atom": label(b)}

    pdb = (
        "REMARK Extracted 3WD5 chain H residues 52-59; bound-state coordinates\n"
        + "\n".join(a["line"] for a in picked)
        + "\nTER\nEND\n"
    ).encode("ascii")
    report = {
        "source": {
            "path": "assets/3wd5.pdb",
            "sha256": sha(source),
            "url": "https://files.rcsb.org/download/3WD5.pdb",
            "retrieved_at_utc": None,
            "retrieval_note": (
                "Original retrieval time not recorded; existing repository asset, verified by hash."
            ),
        },
        "selection": {
            "author_chain": "H",
            "residues": [
                {
                    "author_number": k[0],
                    "insertion": k[1],
                    "resname": k[2],
                    "atom_count": len(g),
                    "atoms": [label(a) for a in g],
                }
                for k, g in zip(RESIDUES, groups, strict=True)
            ],
            "sequence": "".join(AA[k[2]] for k in RESIDUES),
            "alternate_policy": "blank or A, positive occupancy; fail on duplicate atom name",
            "backbone_required": ["N", "CA", "C", "O"],
            "peptide_bonds": bonds,
        },
        "contacts": {
            "definition": (
                "non-hydrogen ATOM pairs H fragment vs deposited TNF chain "
                "A, occupancy > 0, blank/A altloc, distance <= 4.5 angstrom"
            ),
            "count": len(contacts),
            "closest": contact(min(distances, key=lambda x: x[0])),
            "pairs": [contact(c) for c in contacts],
        },
        "fragment": {
            "path": "assets/manual-adalimumab-bound-fragment.pdb",
            "sha256": sha(pdb),
            "atom_count": len(picked),
            "meaning": (
                "isolated file containing only original bound-state "
                "fragment coordinates; not an independent prediction"
            ),
        },
        "independent_sequence_model": {
            "report_path": "data/processed/manual-adalimumab-model.json",
            "note": "Separate sequence-only conformer and QC; see report.",
        },
        "limitations": [
            (
                "Extracted conformation is from the deposited "
                "complex, not an independently folded peptide."
            ),
            (
                "No terminal capping, hydrogens, energy "
                "minimization, or missing side-chain reconstruction."
            ),
            (
                "Distances describe deposited static geometry only; they do not "
                "establish binding of the isolated peptide, affinity, pose, or efficacy."
            ),
            (
                "Deposited asymmetric unit has one TNF "
                "protomer and Fab, not complete IgG or full TNF trimer."
            ),
        ],
    }
    return pdb, report


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
    pdb, report = build(SOURCE.read_bytes())
    report["fragment"]["path"] = "manual-adalimumab-bound-fragment.pdb"
    report["independent_sequence_model"] = {
        "report_path": None,
        "note": "Run the model script separately; this extraction did not generate a model.",
    }
    with (output_dir / "manual-adalimumab-bound-fragment.pdb").open("xb") as stream:
        stream.write(pdb)
    with (output_dir / "manual-adalimumab.json").open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(report, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
