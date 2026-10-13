"""Independent geometric checks for the static SASA experiment."""

import math
from pathlib import Path

import numpy as np
import pytest
from Bio.PDB import Atom, Chain, Model, Residue

from tnf_atlas.feasibility import (
    atom_coordinates,
    buried_surface,
    contact_summary,
    pair_distance_change,
    rigid_translate,
    selected_model,
    solvent_accessible_area,
)


def carbon_model(positions):
    model = Model.Model(0)
    for chain_id, position in positions.items():
        chain = Chain.Chain(chain_id)
        residue = Residue.Residue((" ", 1, " "), "ALA", "")
        residue.add(Atom.Atom("CA", np.asarray(position, dtype=float), 0, 1, " ", " CA ", 1, "C"))
        chain.add(residue)
        model.add(chain)
    return model


@pytest.mark.parametrize("points", [100, 480, 960])
def test_isolated_atom_matches_analytic_probe_inflated_sphere(points):
    model = carbon_model({"A": [5, -3, 20]})
    # Analytical SASA of an isolated sphere is independent of point sampling.
    expected = 4 * math.pi * (1.7 + 1.4) ** 2
    assert solvent_accessible_area(model, points) == pytest.approx(expected, abs=1e-10)


def test_overlapping_equal_spheres_match_analytic_cap_area():
    separation, effective_radius = 3.5, 1.7 + 1.4
    model = carbon_model({"A": [0, 0, 0], "B": [separation, 0, 0]})
    # Each buried spherical cap has height R - d/2 and area 2πR(R-d/2).
    expected_mean_side = 2 * math.pi * effective_radius * (effective_radius - separation / 2)
    for points, tolerance in ((960, 0.02), (4096, 0.005)):
        measured = buried_surface(model, points, partners=("B",))
        assert measured["mean_side_interface_area_angstrom2"] == pytest.approx(
            expected_mean_side, rel=tolerance
        )


def test_rigid_separation_preserves_associated_fab_and_removes_cross_burial():
    model = carbon_model({"A": [0, 0, 0], "H": [4, 0, 0], "L": [6, 0, 0]})
    moved = rigid_translate(model)
    assert (
        pair_distance_change(
            atom_coordinates(model, ("H", "L")), atom_coordinates(moved, ("H", "L"))
        )
        < 1e-12
    )
    assert np.array_equal(atom_coordinates(model, ("A",)), atom_coordinates(moved, ("A",)))
    baseline, control = buried_surface(model, 960), buried_surface(moved, 960)
    assert baseline["total_lost_sasa_angstrom2"] > 0
    assert control["total_lost_sasa_angstrom2"] == pytest.approx(0, abs=1e-10)
    assert baseline["isolated_associated_fab_sasa_angstrom2"] == pytest.approx(
        control["isolated_associated_fab_sasa_angstrom2"], abs=1e-10
    )
    assert control["isolated_associated_fab_sasa_angstrom2"] < 2 * 4 * math.pi * 3.1**2
    assert contact_summary(moved)["heavy_atom_contact_count"] == 0
    assert atom_coordinates(model, ("H", "L"))[0, 0] == 4  # Input was not mutated.


def test_deposited_3wd5_strict_selection_and_original_contact_invariant():
    path = Path(__file__).resolve().parents[1] / "assets/3wd5.pdb"
    model = selected_model(path)
    assert {cid: len(list(model[cid].get_atoms())) for cid in ("A", "H", "L")} == {
        "A": 1187,
        "H": 1593,
        "L": 1622,
    }
    assert all(atom.element not in {"H", "D"} and atom.occupancy > 0 for atom in model.get_atoms())
    results = [contact_summary(model, cutoff) for cutoff in (4.0, 4.5, 5.0)]
    assert [(r["heavy_atom_contact_count"], r["residue_pair_count"]) for r in results] == [
        (126, 34),
        (252, 40),
        (445, 53),
    ]
    assert results[1]["target_interface_residue_count"] == 17


@pytest.mark.parametrize("probe_radius", [np.nan, np.inf, 0, -1])
def test_invalid_probe_radius_is_rejected(probe_radius):
    with pytest.raises(ValueError, match="Probe radius"):
        solvent_accessible_area(carbon_model({"A": [0, 0, 0]}), probe_radius=probe_radius)


@pytest.mark.parametrize("points", [0, -1, 2.5, True])
def test_invalid_point_count_is_rejected(points):
    with pytest.raises(ValueError, match="positive integer"):
        solvent_accessible_area(carbon_model({"A": [0, 0, 0]}), n_points=points)


def test_undeclared_element_radius_is_rejected():
    model = carbon_model({"A": [0, 0, 0]})
    next(model.get_atoms()).element = "X"
    with pytest.raises(ValueError, match="declared"):
        solvent_accessible_area(model)
