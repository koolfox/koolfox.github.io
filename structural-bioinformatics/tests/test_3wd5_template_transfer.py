"""Tests of the geometry, fit and hash-checked transfer experiment."""

import importlib.util
import sys
from pathlib import Path

import numpy as np
import pytest
from Bio.PDB import PDBParser

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT / "scripts"))
spec = importlib.util.spec_from_file_location(
    "template_transfer", PROJECT / "scripts/compare_3wd5_template_transfer.py"
)
transfer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(transfer)


def test_self_transfer_is_identity_and_preserves_bonds():
    chain = PDBParser(QUIET=True).get_structure("3wd5", transfer.SOURCE)[0]["A"]
    rms, positions = transfer.candidate(chain, chain)
    assert rms < 1e-6
    for residue, position in zip((69, 101), positions, strict=True):
        np.testing.assert_allclose(position, chain[residue]["SG"].coord, atol=1e-6)


def test_template_results_show_sg_transfer_breaks_local_geometry():
    parser = PDBParser(QUIET=True)
    target = parser.get_structure("3wd5", transfer.SOURCE)[0]["A"]
    template = parser.get_structure("7ta3", transfer.TEMPLATE)[0]
    for chain_id in ("B", "D"):
        rms, positions = transfer.candidate(target, template[chain_id])
        assert rms < 0.5
        # Rigid transfer preserves the template's S-S distance, but does not
        # preserve C-S bonds to the target's fixed beta carbons.
        source_distance = template[chain_id][69]["SG"] - template[chain_id][101]["SG"]
        assert np.linalg.norm(positions[0] - positions[1]) == pytest.approx(
            source_distance, abs=1e-5
        )
        target_bonds = [
            np.linalg.norm(positions[i] - target[n]["CB"].coord) for i, n in enumerate((69, 101))
        ]
        source_bonds = [
            template[chain_id][n]["SG"] - template[chain_id][n]["CB"] for n in (69, 101)
        ]
        assert max(abs(a - b) for a, b in zip(target_bonds, source_bonds, strict=True)) > 0.4


def test_wrong_input_is_rejected(tmp_path):
    wrong = tmp_path / "wrong.map"
    wrong.write_bytes(b"incorrect")
    with pytest.raises(ValueError, match="Unexpected SHA-256"):
        transfer.run(wrong, wrong)
