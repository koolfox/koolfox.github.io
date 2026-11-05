from pathlib import Path

import pytest

from peptide_lab.pdb_inventory import inventory

PROJECT = Path(__file__).resolve().parents[1]


def test_inventory_lists_all_deposited_chains_and_explains_rejections():
    data = inventory(PROJECT / "assets/3wd5.pdb")
    assert data["model_count"] == 1
    chains = {row["author_chain"]: row for row in data["models"][0]["chains"]}
    assert {"A", "H", "L"} <= chains.keys()
    assert all(row["reason"] for row in chains.values())
    assert len(data["source_sha256"]) == 64


def test_no_coordinates_is_rejected(tmp_path):
    path = tmp_path / "empty.pdb"
    path.write_text("END\n")
    with pytest.raises(ValueError, match="no coordinate models"):
        inventory(path)
