"""Numerical and negative controls for the bounded rotamer experiment."""

import sys
from pathlib import Path

import numpy as np
import pytest
from Bio.PDB import PDBParser

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT / "scripts"))
import explore_3wd5_rotamer_repair as repair  # noqa: E402


def test_rotation_preserves_covalent_geometry_and_round_trips():
    chain = PDBParser(QUIET=True).get_structure("p", repair.SOURCE)[0]["A"]
    residue = chain[69]
    original = residue["SG"].coord.astype(float)
    moved = repair.rotate(residue, [87])[0]
    restored = repair.rotate(residue, [-87], moved)[0]
    np.testing.assert_allclose(restored, original, atol=1e-12)
    assert np.linalg.norm(moved - residue["CB"].coord) == pytest.approx(
        np.linalg.norm(original - residue["CB"].coord), abs=1e-12
    )
    axis = residue["CA"].coord - residue["CB"].coord
    assert np.dot(moved - residue["CB"].coord, axis) == pytest.approx(
        np.dot(original - residue["CB"].coord, axis), abs=1e-12
    )


def test_real_3wd5_candidate_meets_explicit_screens():
    model = PDBParser(QUIET=True).get_structure("p", repair.SOURCE)[0]
    rows = repair.enumerate_candidates(model["A"], repair.neighbors(model, "A"))
    assert len(rows) == 10
    first = rows[0]
    assert first["rotation_degrees"] == [-90, -10]
    assert 1.9 <= first["sg_sg_angstrom"] <= 2.2
    assert all(95 <= value <= 115 for value in first["angles_degrees"])
    assert 60 <= abs(first["dihedral_degrees"]) <= 120
    assert min(first["nearest_other_heavy_angstrom"]) >= 2.5
    assert first["displacement_from_input_angstrom"][0] > 2.3


def test_7ta3_recovery_control_and_clash_negative_control():
    model = PDBParser(QUIET=True).get_structure("p", repair.TEMPLATE)[0]
    chain = model["B"]
    native = [chain[n]["SG"].coord.astype(float) for n in (69, 101)]
    start = [repair.rotate(chain[n], [d])[0] for n, d in ((69, 20), (101, -20))]
    nearby = repair.neighbors(model, "B")
    rows = repair.enumerate_candidates(chain, nearby, start=start)
    assert rows
    rmsd = np.sqrt(
        np.mean([np.sum((a - b) ** 2) for a, b in zip(rows[0]["positions"], native, strict=True)])
    )
    assert rmsd == pytest.approx(0.2041, abs=0.001)
    # A cloud occupying the full rotational path must reject every candidate.
    cloud = np.concatenate([repair.rotate(chain[69], np.arange(-180, 180, 2)), nearby])
    assert not repair.enumerate_candidates(chain, cloud, start=start)
