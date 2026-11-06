"""Test torsion diagnostics without docking or network access."""

import sys
from pathlib import Path

import pytest

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT / "src"))
from peptide_lab.pdbqt_torsions import inspect_torsions  # noqa: E402


def test_real_ligand_has_57_nested_branches_and_declared_torsions():
    path = PROJECT / "assets/long-peptide-pilot/bounded-1000000/MQIFVKTLTGKTI/ligand.pdbqt"
    result = inspect_torsions(path.read_text())
    assert result["torsdof_declared"] == 57
    assert result["branch_records"] == result["endbranch_records"] == 57
    assert result["torsdof_matches_branch_count"] is True


def test_difference_is_diagnostic_not_a_size_gate():
    text = "BRANCH 1 2\nENDBRANCH 1 2\nTORSDOF 57\n"
    result = inspect_torsions(text)
    assert result["torsdof_declared"] == 57
    assert result["branch_records"] == 1
    assert result["torsdof_matches_branch_count"] is False
    assert inspect_torsions("TORSDOF 0\n")["torsdof_matches_branch_count"] is True


@pytest.mark.parametrize(
    "text",
    [
        "",
        "TORSDOF -1\n",
        "TORSDOF 1.5\n",
        "TORSDOF 1 2\n",
        "TORSDOF 1\nTORSDOF 1\n",
        "TORSDOF 1\nBRANCH 1 2\n",
        "TORSDOF 1\nENDBRANCH 1 2\n",
        "TORSDOF 1\nBRANCH 1 2\nENDBRANCH 2 1\n",
        "TORSDOF 1\nBRANCH 1 1\nENDBRANCH 1 1\n",
        "TORSDOF 2\nBRANCH 1 2\nBRANCH 2 3\nENDBRANCH 1 2\nENDBRANCH 2 3\n",
    ],
)
def test_invalid_records_raise_clear_errors(text):
    with pytest.raises(ValueError):
        inspect_torsions(text)


def test_recorded_workflow_diagnostic_matches_real_ligand():
    import hashlib
    import json

    root = PROJECT / "assets/long-peptide-pilot"
    report = json.loads((root / "torsion-workflow-report.json").read_text())
    row = report["candidates"][0]
    ligand = root / "bounded-1000000/MQIFVKTLTGKTI/ligand.pdbqt"
    assert hashlib.sha256(ligand.read_bytes()).hexdigest() == row["ligand_sha256"]
    assert row["torsion_diagnostic"] == inspect_torsions(ligand.read_text())
    assert report["status"] == row["status"] == "failed"
    assert "clash" in report["error"].lower()
