"""Check provenance and coordinates of the deposited multichain smoke run."""

import hashlib
import json
from pathlib import Path

from Bio.PDB import PDBParser

ROOT = Path(__file__).resolve().parents[1] / "assets/multichain-1fcc-demo"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_deposited_four_chain_coordinates_and_artifact_hashes():
    source = ROOT / "source-1fcc.pdb"
    run = ROOT / "interface-run"
    report = json.loads((run / "report.json").read_text())
    assert digest(source) == "76ea4cf44d886a499bd5e0ee2db17dc6ed1f24e82080df25aaefbed3eba81516"
    assert report["input"]["source_sha256"] == digest(source)
    assert report["input"]["author_chains"] == ["A", "B", "C", "D"]
    assert report["status"] == "requires_further_validation"
    parser = PDBParser(QUIET=True, PERMISSIVE=False)

    def atoms(path):
        structure = parser.get_structure("test", path)
        return {
            (a.parent.parent.id, a.parent.id, a.name): tuple(a.coord)
            for a in structure.get_atoms()
        }

    expected = atoms(source)
    assert len(expected) == 4180
    assert atoms(run / "selected-chain.pdb") == expected
    assert digest(run / "selected-chain.pdb") == report["selected_pdb_sha256"]
    assert digest(run / "receptor.pdbqt") == report["receptor_pdbqt_sha256"]
    assert digest(run / "AC/poses.pdbqt") == report["candidates"][0]["poses_sha256"]
