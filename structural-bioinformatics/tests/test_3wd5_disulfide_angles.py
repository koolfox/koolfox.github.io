"""Offline geometry and independent reference checks for deposited 3WD5."""

import importlib.util
import math
from pathlib import Path

import pytest
from Bio.PDB import PDBParser, calc_angle, calc_dihedral

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "disulfide_angles", PROJECT / "scripts/audit_3wd5_disulfide_angles.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_known_geometry_and_degenerate_input():
    a, b, c = (1, 0, 0), (0, 0, 0), (0, 1, 0)
    assert module.angle(a, b, c) == pytest.approx(90)
    assert module.dihedral(a, b, c, (0, 1, 1)) == pytest.approx(-90)
    assert module.dihedral(a, b, c, (0, 1, -1)) == pytest.approx(90)
    with pytest.raises(ValueError, match="Undefined geometry"):
        module.dihedral((0, 0, 0), (1, 0, 0), (2, 0, 0), (2, 1, 0))


def test_deposition_and_independent_biopython_calculation():
    result = module.audit()
    assert result["cb69_sg69_sg101_degrees"] == pytest.approx(88.199, abs=0.001)
    assert result["sg69_sg101_cb101_degrees"] == pytest.approx(53.169, abs=0.001)
    assert result["cb69_sg69_sg101_cb101_dihedral_degrees"] == pytest.approx(-139.563, abs=0.001)
    chain = PDBParser(QUIET=True).get_structure("3wd5", module.SOURCE)[0]["A"]
    a, b, c, d = (
        chain[r][n].get_vector() for r, n in [(69, "CB"), (69, "SG"), (101, "SG"), (101, "CB")]
    )
    assert result["cb69_sg69_sg101_degrees"] == pytest.approx(
        math.degrees(calc_angle(a, b, c)), abs=0.001
    )
    assert result["sg69_sg101_cb101_degrees"] == pytest.approx(
        math.degrees(calc_angle(b, c, d)), abs=0.001
    )
    assert result["cb69_sg69_sg101_cb101_dihedral_degrees"] == pytest.approx(
        math.degrees(calc_dihedral(a, b, c, d)), abs=0.001
    )
