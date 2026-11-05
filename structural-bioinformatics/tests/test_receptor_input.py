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


def test_reject_missing_side_chain_atom(tmp_path):
    lines = PDB.read_text().splitlines(keepends=True)
    index = next(
        i
        for i, line in enumerate(lines)
        if line.startswith("ATOM  ") and line[12:16].strip() == "CB"
    )
    target = tmp_path / "missing-sidechain.pdb"
    target.write_text("".join(lines[:index] + lines[index + 1 :]))
    with pytest.raises(ValueError, match="Missing side-chain"):
        inspect_pdb(target, "A")


def test_water_exclusion_requires_explicit_choice(tmp_path):
    lines = PDB.read_text().splitlines(keepends=True)
    water = "HETATM 9999  O   HOH A 999      10.000  10.000  10.000  1.00 20.00           O  \n"
    target = tmp_path / "water.pdb"
    target.write_text(
        "".join(line for line in lines if not line.startswith(("TER", "END"))) + water + "END\n"
    )
    with pytest.raises(ValueError, match="water"):
        inspect_pdb(target, "A")
    report = inspect_pdb(target, "A", exclude_water=True)
    assert report["excluded_waters"] == 1
    assert len(report["residues"]) == 76


def test_real_3wd5_cysteine_contact():
    import os

    from Bio.PDB import PDBParser

    from peptide_lab.receptor_input import reject_close_cysteine_contacts

    path = Path(os.environ.get("TNF_3WD5_TEST_PDB", PROJECT / "assets/3wd5.pdb"))
    if not path.is_file():
        pytest.skip("3WD5 fixture unavailable")
    assert inspect_pdb(path, "A", exclude_water=True)["excluded_waters"] > 0
    structure = PDBParser(QUIET=True, PERMISSIVE=False).get_structure("3wd5", str(path))
    with pytest.raises(ValueError, match=r"A:CYS69 SG / A:CYS101 CB \(1\.75 Å\)"):
        reject_close_cysteine_contacts(structure, ["A"])
