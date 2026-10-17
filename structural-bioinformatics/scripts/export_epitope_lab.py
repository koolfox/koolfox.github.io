"""Export the compact data behind the in-browser epitope mini-experiments.

Run from repository root with the locked environment; no network is needed:
uv run --project structural-bioinformatics python \
    structural-bioinformatics/scripts/export_epitope_lab.py

The browser cannot afford a full PDB parser, so this writes `data/processed/epitope-lab.json`:
a Cα trace of the crystal-symmetry TNF trimer with its three Fabs, and every heavy-atom pair
between the TNF trimer and the Fab bound to protomer A up to 6.0 Å. With that list the page
can re-threshold contacts, list partners and remove side chains beyond Cβ (virtual alanine)
without recomputing geometry. Interaction flags use the same rules as `full-epitope.json`.
"""

import argparse
import importlib.util
import json
from pathlib import Path

from tnf_atlas.epitope import classify_pair
from tnf_atlas.feasibility import selected_model
from tnf_atlas.structure import distance_contacts

PROJECT = Path(__file__).resolve().parents[1]
MAX_DISTANCE = 6.0
FLAGS = {
    "hydrogen_bond_candidate": 1,
    "salt_bridge_candidate": 2,
    "side_chain_carbon_contact": 4,
}
# Atoms an alanine keeps; everything else in a side chain is removed by virtual truncation.
ALANINE_ATOMS = {"N", "CA", "C", "O", "OXT", "CB"}
TRACE_CHAINS = ("A", "B", "C", "H", "L", "I", "M", "J", "N")


def full_epitope_module():
    spec = importlib.util.spec_from_file_location(
        "analyze_full_epitope", PROJECT / "scripts/analyze_full_epitope.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def build(project):
    analysis = full_epitope_module()
    source = project / "assets/3wd5.pdb"
    model = selected_model(source, ("A", "H", "L"))
    assembly, _ = analysis.build_assembly(model)
    cdrs, cdr_spans = analysis.cdr_lookup(model)

    residues, index = [], {}

    def residue_index(atom):
        residue = atom.get_parent()
        chain = residue.get_parent().id
        key = (chain, residue.id[1], residue.id[2].strip())
        if key not in index:
            index[key] = len(residues)
            region = cdrs.get((chain, residue.id[1]), "framework") if chain in "HL" else "TNF"
            residues.append(
                {
                    "chain": chain,
                    "number": residue.id[1],
                    "insertion": key[2],
                    "name": residue.resname,
                    "region": region,
                }
            )
        return index[key]

    tnf = [a for c in "ABC" for a in assembly[c].get_atoms()]
    fab = [a for c in "HL" for a in assembly[c].get_atoms()]
    contacts = distance_contacts([a.coord for a in tnf], [a.coord for a in fab], MAX_DISTANCE)
    pairs = []
    for i, j, distance in sorted(contacts, key=lambda c: (c[0], c[1])):
        left, right = tnf[i], fab[j]
        flags = sum(FLAGS[label] for label in classify_pair(left, right, distance))
        pairs.append(
            [
                residue_index(left),
                left.get_id(),
                residue_index(right),
                right.get_id(),
                round(float(distance), 4),
                flags,
            ]
        )
    trace = []
    for chain_id in TRACE_CHAINS:
        chain = assembly[chain_id]
        trace.append(
            {
                "id": chain_id,
                "kind": "protein_ca",
                "residues": [
                    {
                        "number": r.id[1],
                        "insertion": r.id[2].strip(),
                        "name": r.resname,
                        "xyz": [round(float(v), 3) for v in r["CA"].coord],
                    }
                    for r in chain
                    if "CA" in r
                ],
            }
        )
    return {
        "pdb_id": "3WD5",
        "purpose": "Data for browser mini-experiments: contact threshold, residue partners and "
        "virtual alanine truncation on the crystal-symmetry TNF trimer.",
        "inputs": {"assets/3wd5.pdb": analysis.sha256(source)},
        "generator": "scripts/export_epitope_lab.py",
        "coordinate_units": "angstrom",
        "max_distance_angstrom": MAX_DISTANCE,
        "default_cutoff_angstrom": analysis.CONTACT_CUTOFF,
        "chains": {
            "tnf": {"A": "deposited protomer", "B": "symmetry copy", "C": "symmetry copy"},
            "fab_bound_to_A": {"H": "heavy chain", "L": "light chain"},
            "other_fabs": {
                "I": "heavy, bound to B",
                "M": "light, bound to B",
                "J": "heavy, bound to C",
                "N": "light, bound to C",
            },
        },
        "pair_columns": [
            "tnf_residue_index",
            "tnf_atom",
            "fab_residue_index",
            "fab_atom",
            "distance_angstrom",
            "flags",
        ],
        "flag_bits": {
            **FLAGS,
            "rules": "Same atom-type and distance rules as data/processed/full-epitope.json; "
            "H-bond ≤ 3.5 Å, salt bridge ≤ 4.0 Å, side-chain C–C ≤ 4.0 Å.",
        },
        "alanine_kept_atoms": sorted(ALANINE_ATOMS),
        "cdr_definitions": cdr_spans,
        "residues": residues,
        "pairs": pairs,
        "trace": trace,
        "limitations": [
            "Contacts between the TNF trimer and the Fab bound to protomer A only.",
            "Virtual alanine removes atoms beyond Cβ in a rigid structure; it predicts neither "
            "ΔΔG, affinity nor clinical effect.",
            "Distance candidates are not measured hydrogen bonds or energies.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--project", type=Path, default=PROJECT)
    args = parser.parse_args()
    project = args.project.resolve()
    result = build(project)
    out = project / "data/processed/epitope-lab.json"
    out.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"{out}: {len(result['pairs'])} atom pairs, {len(result['residues'])} residues")


if __name__ == "__main__":
    main()
