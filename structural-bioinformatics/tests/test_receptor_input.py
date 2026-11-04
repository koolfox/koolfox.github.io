"""Input failures must not be mistaken for a prepared receptor."""

from pathlib import Path

import pytest

from peptide_lab.receptor_input import inspect_pdb

PROJECT = Path(__file__).resolve().parents[1]
PDB = PROJECT / "assets/course/gromacs/1ubq-protein.pdb"


def test_real_pdb_chain_and_missing_chain():
    report = inspect_pdb(PDB, "A")
    assert len(report["residues"]) == 76
    assert report["status"] == "requires_further_validation"
    assert len(report["source_sha256"]) == 64
    with pytest.raises(ValueError, match="absent"):
        inspect_pdb(PDB, "Z")


def test_reject_zero_occupancy_and_missing_backbone(tmp_path):
    lines = PDB.read_text().splitlines(keepends=True)
    index = next(i for i, line in enumerate(lines) if line.startswith("ATOM  "))
    bad = lines.copy()
    bad[index] = bad[index][:54] + "  0.00" + bad[index][60:]
    target = tmp_path / "bad.pdb"
    target.write_text("".join(bad))
    with pytest.raises(ValueError, match="occupancy"):
        inspect_pdb(target, "A")
    target.write_text("".join(lines[:index] + lines[index + 1 :]))
    with pytest.raises(ValueError, match="backbone"):
        inspect_pdb(target, "A")
