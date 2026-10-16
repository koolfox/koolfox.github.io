"""Independent checks of crystal-symmetry trimer reconstruction and epitope bookkeeping."""

import importlib.util
import json
from pathlib import Path

import numpy as np
import pytest
from Bio import SeqIO
from Bio.PDB import Atom, Residue

from tnf_atlas.epitope import (
    classify_pair,
    locate_cdrs,
    orthogonalization,
    parse_operator,
    superposition_rmsd,
    typed_interactions,
)
from tnf_atlas.feasibility import selected_model

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "analyze_full_epitope", PROJECT / "scripts/analyze_full_epitope.py"
)
script = importlib.util.module_from_spec(spec)
spec.loader.exec_module(script)


def placed(residue_name, atom_name, element, coordinate):
    residue = Residue.Residue((" ", 1, " "), residue_name, "")
    atom = Atom.Atom(atom_name, np.asarray(coordinate, float), 0, 1, " ", atom_name, 1, element)
    residue.add(atom)
    return atom


def test_threefold_operator_has_order_three_and_translations_parse():
    rotation, translation = parse_operator("z,x,y")
    assert np.allclose(np.linalg.matrix_power(rotation, 3), np.eye(3))
    assert not translation.any()
    rotation, translation = parse_operator("-z+1/2,-x,y+1/2")
    assert np.allclose(translation, [0.5, 0, 0.5])
    assert np.isclose(np.linalg.det(rotation), 1.0)


def test_cubic_cell_orthogonalization_is_a_scaling():
    assert np.allclose(orthogonalization((10, 10, 10, 90, 90, 90)), np.eye(3) * 10)


def test_kabsch_rmsd_ignores_rigid_motion():
    points = np.random.default_rng(1).normal(size=(20, 3))
    angle = 0.7
    rotation = np.array(
        [[np.cos(angle), -np.sin(angle), 0], [np.sin(angle), np.cos(angle), 0], [0, 0, 1]]
    )
    assert superposition_rmsd(points @ rotation.T + 5, points) < 1e-10


def test_interaction_rules_are_atom_type_and_distance_specific():
    lysine, aspartate = placed("LYS", "NZ", "N", [0, 0, 0]), placed("ASP", "OD1", "O", [3, 0, 0])
    assert classify_pair(lysine, aspartate, 3.0) == [
        "hydrogen_bond_candidate",
        "salt_bridge_candidate",
    ]
    assert classify_pair(lysine, aspartate, 3.8) == ["salt_bridge_candidate"]
    assert classify_pair(
        placed("LEU", "CD1", "C", [0, 0, 0]), placed("ILE", "CG2", "C", [0, 0, 0]), 3.9
    ) == ["side_chain_carbon_contact"]
    # Backbone carbons and a proline nitrogen are not counted.
    assert (
        classify_pair(
            placed("ALA", "CA", "C", [0, 0, 0]), placed("ILE", "CG2", "C", [0, 0, 0]), 3.5
        )
        == []
    )
    assert (
        classify_pair(placed("PRO", "N", "N", [0, 0, 0]), placed("SER", "O", "O", [0, 0, 0]), 3.0)
        == []
    )


@pytest.mark.parametrize(
    ("chain", "kind", "expected"),
    [
        ("H", "heavy", ["DYAMH", "AITWNSGHIDYADSVEG", "VSYLSTASSLDY"]),
        ("L", "light", ["RASQGIRNYLA", "AASTLQS", "QRYNRAPYT"]),
    ],
)
def test_sequence_rules_recover_adalimumab_kabat_cdrs(chain, kind, expected):
    sequence = str(SeqIO.read(PROJECT / f"data/sequences/3WD5_{chain}_resolved.fasta", "fasta").seq)
    spans = locate_cdrs(sequence, kind)
    assert [sequence[start:end] for start, end in spans.values()] == expected


@pytest.fixture(scope="module")
def reconstruction():
    model = selected_model(PROJECT / "assets/3wd5.pdb", ("A", "H", "L"))
    assembly, copies = script.build_assembly(model)
    return model, assembly, copies


def test_symmetry_trimer_matches_independent_apo_tnf(reconstruction):
    _, assembly, copies = reconstruction
    assert [round(c[0], 2) for c in copies[:3]] == [0.0, 21.41, 21.41]
    validation = script.trimer_validation(assembly, PROJECT / "assets/1tnf.pdb")
    assert validation["paired_ca_atoms"] == 456
    assert validation["ca_rmsd_angstrom"] < 1.5


def test_public_epitope_summary_reproduces_contacts(reconstruction):
    _, assembly, _ = reconstruction
    public = json.loads((PROJECT / "data/processed/full-epitope.json").read_text())
    fab = [a for c in ("H", "L") for a in assembly[c].get_atoms()]
    for protomer, summary in public["per_protomer"].items():
        table = typed_interactions(list(assembly[protomer].get_atoms()), fab, 4.5)
        assert table["heavy_atom_contact_count"] == summary["heavy_atom_contact_count"]
    # Deposited protomer alone must equal the existing published partial analysis.
    partial = json.loads((PROJECT / "data/processed/interface-summary.json").read_text())
    assert (
        public["per_protomer"]["A"]["heavy_atom_contact_count"]
        == partial["heavy_atom_contact_count"]
    )
    assert public["inputs"]["assets/3wd5.pdb"] == script.sha256(PROJECT / "assets/3wd5.pdb")
    # Single-protomer ΔSASA/2 agrees with the separately computed feasibility study.
    feasibility = json.loads((PROJECT / "data/processed/structural-feasibility.json").read_text())
    text = json.dumps(feasibility)
    assert "785.8" in text or "785.9" in text
    assert public["buried_surface"]["single_protomer_total_delta_sasa_angstrom2"] / 2 == (
        pytest.approx(785.9, abs=0.2)
    )
