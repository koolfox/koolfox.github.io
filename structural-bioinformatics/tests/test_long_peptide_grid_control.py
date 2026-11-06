"""The finite placement control measures geometry and preserves its limits."""

import importlib.util
from pathlib import Path

import numpy as np

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "long_peptide_grid_control", PROJECT / "scripts/long_peptide_grid_control.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_rotations_are_distinct_and_proper():
    matrices = module.rotations()
    assert len(matrices) == len({tuple(m.ravel()) for m in matrices}) == 24
    for matrix in matrices:
        np.testing.assert_array_equal(matrix @ matrix.T, np.eye(3))
        assert round(np.linalg.det(matrix)) == 1


def test_strict_clash_threshold_and_box_membership(monkeypatch):
    monkeypatch.setattr(module, "OFFSETS", (0,))
    ligand = np.array([[0.0, 0.0, 0.0]])
    receptor = np.array([module.CENTER, module.CENTER + [2.0, 0, 0]])
    centers, rows = module.scan(receptor, ligand)
    assert len(centers) == len(rows) == 24
    assert all(row["outside_heavy_atoms"] == 0 for row in rows)
    assert all(row["minimum_distance_angstrom"] == 0 for row in rows)
    assert all(row["pairs_below_2_angstrom"] == 1 for row in rows)
