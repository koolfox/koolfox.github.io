"""Regression controls for the three independently reconstructed chains."""

import importlib.util
import sys
from pathlib import Path

import pytest
from Bio.PDB import PDBParser

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT / "scripts"))
from peptide_lab.receptor_input import reject_close_cysteine_contacts  # noqa: E402

spec = importlib.util.spec_from_file_location(
    "investigate_trimer", PROJECT / "scripts/investigate_3wd5_trimer.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_all_chains_map_and_keep_the_measured_defect():
    result = module.audit()
    assert result["deposited_A_alternate_records"] == []
    for chain in "ABC":
        row = result["chains"][chain]
        assert row["atom_count"] == row["source_selected_atom_count"] == 1187
        assert row["missing_source_keys"] == row["extra_keys"] == 0
        assert row["max_mapping_error_angstrom"] <= 0.002
        assert row["missing_heavy_atoms"] == []
        assert row["disulfide"]["sg69_cb101_angstrom"] == pytest.approx(1.75, abs=0.002)


@pytest.mark.parametrize("chain", list("ABC"))
def test_guard_rejects_each_copy_independently(chain):
    structure = PDBParser(QUIET=True).get_structure(
        "trimer", PROJECT / "assets/3wd5-trimer-3fab.pdb"
    )
    with pytest.raises(ValueError, match=rf"{chain}:CYS69 SG / {chain}:CYS101 CB"):
        reject_close_cysteine_contacts(structure, [chain])
