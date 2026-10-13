from pathlib import Path

import numpy as np
import pytest
from Bio.PDB import Atom, Chain, Residue
from Bio.PDB.Atom import DisorderedAtom

from tnf_atlas.structure import analyze_interface, distance_contacts, heavy_atoms, read_model


def atom(name, coordinate, element="C", occupancy=1.0, altloc=" "):
    return Atom.Atom(
        name, np.asarray(coordinate, dtype=float), 0, occupancy, altloc, name, 1, element
    )


def test_inclusive_cutoff_and_no_crossing_false_contact():
    contacts = distance_contacts([[0, 0, 0]], [[4.5, 0, 0], [4.501, 0, 0]], 4.5)
    assert contacts == [(0, 0, 4.5)]


@pytest.mark.parametrize("cutoff", [0, -1, np.nan, np.inf])
def test_invalid_cutoffs_rejected(cutoff):
    with pytest.raises(ValueError, match="Cutoff"):
        distance_contacts([[0, 0, 0]], [[1, 0, 0]], cutoff)


def test_contact_distance_invariant_under_rigid_rotation():
    left = np.asarray([[0, 0, 0], [7, 2, 0]])
    right = np.asarray([[3, 1, 0], [8, 2, 0]])
    rotation = np.asarray([[0, -1, 0], [1, 0, 0], [0, 0, 1]])
    original = distance_contacts(left, right, 4.5)
    rotated = distance_contacts(left @ rotation + 40, right @ rotation + 40, 4.5)
    assert original == rotated


def test_heavy_selection_excludes_water_hydrogen_and_zero_occupancy():
    chain = Chain.Chain("A")
    residue = Residue.Residue((" ", 1, " "), "ALA", "")
    residue.add(atom("CA", [0, 0, 0]))
    residue.add(atom("H", [0, 0, 1], "H"))
    residue.add(atom("CB", [0, 1, 0], occupancy=0))
    chain.add(residue)
    water = Residue.Residue(("W", 2, " "), "HOH", "")
    water.add(atom("O", [0, 1, 1], "O"))
    chain.add(water)
    assert [a.name for a in heavy_atoms(chain)] == ["CA"]


def test_highest_occupancy_alternate_selected_once():
    chain = Chain.Chain("A")
    residue = Residue.Residue((" ", 1, " "), "ALA", "")
    alternate = DisorderedAtom("CA")
    alternate.disordered_add(atom("CA", [0, 0, 0], occupancy=0.2, altloc="A"))
    alternate.disordered_add(atom("CA", [10, 0, 0], occupancy=0.8, altloc="B"))
    residue.add(alternate)
    chain.add(residue)
    selected = heavy_atoms(chain)
    assert len(selected) == 1
    assert selected[0].altloc == "B"


def test_empty_structure_rejected(tmp_path: Path):
    path = tmp_path / "empty.pdb"
    path.write_text("END\n")
    with pytest.raises(ValueError, match="No valid"):
        read_model(path)


def test_missing_chains_reported(tmp_path: Path):
    path = tmp_path / "single.pdb"
    path.write_text(
        "ATOM      1  CA  ALA A   1       0.000   0.000   0.000  1.00  0.00           C  \nEND\n"
    )
    with pytest.raises(ValueError, match="Missing author chain"):
        analyze_interface(path)


def test_empty_contact_selection_is_valid():
    assert distance_contacts([], [[1, 2, 3]], 4.5) == []


def test_nonfinite_coordinates_rejected():
    with pytest.raises(ValueError, match="finite"):
        distance_contacts([[np.nan, 0, 0]], [[1, 0, 0]], 4.5)


def test_malformed_coordinate_dimensions_rejected():
    with pytest.raises(ValueError, match="shape"):
        distance_contacts([[0, 0], [0, 1], [0, 0]], [[1, 0, 0]], 4.5)


@pytest.mark.parametrize("occupancy", [np.nan, np.inf])
def test_nonfinite_occupancy_rejected(occupancy):
    chain = Chain.Chain("A")
    residue = Residue.Residue((" ", 1, " "), "ALA", "")
    residue.add(atom("CA", [0, 0, 0], occupancy=occupancy))
    chain.add(residue)
    with pytest.raises(ValueError, match="occupancy"):
        heavy_atoms(chain)
