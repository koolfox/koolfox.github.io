"""Verify construction and charge assumptions; RDKit is an optional docking dependency."""

import importlib.util
from pathlib import Path

import pytest

pytest.importorskip("rdkit")
from rdkit import Chem  # noqa: E402

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "build_models", PROJECT / "scripts/build_peptide_models.py"
)
models = importlib.util.module_from_spec(spec)
spec.loader.exec_module(models)


@pytest.mark.parametrize("letter", sorted("ACDEFGHIKLMNPQRSTVWY"))
def test_each_standard_amino_acid_builds_as_l_dipeptide(letter):
    molecule, charge = models.build("A" + letter)
    expected = -1 if letter in "DE" else 1 if letter in "KR" else 0
    assert charge == expected == Chem.GetFormalCharge(molecule)
    assert molecule.GetNumConformers() == 1
    Chem.AssignStereochemistry(molecule, force=True, cleanIt=True)
    ca = [
        a
        for a in molecule.GetAtoms()
        if a.GetPDBResidueInfo() and a.GetPDBResidueInfo().GetName().strip() == "CA"
    ]
    assert ca[0].GetProp("_CIPCode") == "S"
    if letter == "G":
        assert not ca[1].HasProp("_CIPCode")
    else:
        assert ca[1].GetProp("_CIPCode") == ("R" if letter == "C" else "S")


def test_rejects_unknown_and_excessive_sequences():
    for sequence in ("", "AX", "A" * 14, "aa"):
        with pytest.raises(ValueError):
            models.build(sequence)


@pytest.mark.parametrize("letter", sorted("ACDEFGHIKLMNPQRSTVWY"))
def test_each_standard_residue_can_be_prepared_for_vina(letter):
    meeko = pytest.importorskip("meeko")
    molecule, _ = models.build("A" + letter)
    setups = meeko.MoleculePreparation().prepare(molecule)
    assert len(setups) == 1
    pdbqt, ok, error = meeko.PDBQTWriterLegacy.write_string(setups[0])
    assert ok, error
    assert "ATOM" in pdbqt


def test_thirteen_residue_pilot_builds_a_three_dimensional_conformer():
    molecule, _ = models.build("A" * 13)
    assert molecule.GetNumConformers() == 1
    residue_numbers = {
        atom.GetPDBResidueInfo().GetResidueNumber()
        for atom in molecule.GetAtoms()
        if atom.GetPDBResidueInfo() is not None
    }
    assert residue_numbers == set(range(1, 14))
