"""Offline checks for the experimental reference and side-chain repair."""

import hashlib
import json
from pathlib import Path

import numpy as np
from Bio.PDB import PDBParser

PROJECT = Path(__file__).resolve().parents[1]
ASSETS = PROJECT / "assets/tnf-peptide"


def test_reference_hash_and_explicit_chemical_features():
    provenance = json.loads((PROJECT / "data/metadata/tnf-peptide-preparation.json").read_text())
    assert (
        hashlib.sha256((ASSETS / "7ta3.pdb").read_bytes()).hexdigest()
        == provenance["source_sha256"]
    )
    peptide = PDBParser(QUIET=True).get_structure("p", ASSETS / "peptide.pdb")[0]["A"]
    assert len([r for r in peptide if r.id[0] == " "]) == 31
    assert (peptide[2]["SG"] - peptide[31]["SG"]) < 2.2
    cap = next(r for r in peptide if r.resname == "NH2")
    assert 1.1 < (peptide[31]["C"] - cap["N"]) < 1.6


def test_repair_preserves_occupied_reference_atoms_and_adds_only_recorded_sidechains():
    parser = PDBParser(QUIET=True)
    original = parser.get_structure("reference", ASSETS / "7ta3.pdb")[0]["B"]
    repaired = parser.get_structure("prepared", ASSETS / "receptor-repaired.pdb")[0]["B"]
    report = json.loads((PROJECT / "data/processed/tnf-receptor-repair.json").read_text())
    added = {r["residue"]: set(r["added"]) for r in report["residues"]}
    for residue in repaired:
        prior = original[residue.id]
        observed = {a.name for a in prior if a.element not in ("H", "D") and (a.occupancy or 0) > 0}
        for atom in residue:
            if atom.name in observed:
                reference = prior[atom.name]
                if reference.is_disordered() and atom.altloc in reference.child_dict:
                    reference = reference.child_dict[atom.altloc]
                assert np.linalg.norm(atom.coord - reference.coord) < 0.002
            else:
                assert atom.name in added[residue.id[1]]
    assert not report["backbone_loops_rebuilt"]
