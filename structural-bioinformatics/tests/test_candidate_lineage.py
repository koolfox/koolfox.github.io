import json
from pathlib import Path

import pytest

from peptide_lab.candidate_lineage import verify

PROJECT = Path(__file__).resolve().parents[1]
PDB = PROJECT / "assets/3wd5.pdb"
ROOT = PROJECT / "assets/peptide-ops-39-demo/candidates"


def test_real_39_variants_match_antibody_region_and_fasta():
    result = verify(PDB, ROOT / "candidates.fasta", ROOT / "manifest.json")
    assert result["status"] == "source_consistent"
    assert result["seed"] == "VQ"
    assert result["candidate_count"] == 39
    assert result["region"]["author_chain"] == "H"
    assert result["region"]["author_residue_numbers"] == [2, 3]


def test_manifest_with_incorrect_antibody_fragment_is_rejected(tmp_path):
    manifest = json.loads((ROOT / "manifest.json").read_text())
    manifest["seed"] = "AA"
    changed = tmp_path / "manifest.json"
    changed.write_text(json.dumps(manifest))
    with pytest.raises(ValueError, match="Antibody sequence"):
        verify(PDB, ROOT / "candidates.fasta", changed)


def test_candidate_change_must_match_fasta_and_manifest(tmp_path):
    manifest = json.loads((ROOT / "manifest.json").read_text())
    manifest["candidates"][1]["change"] = "fabricated"
    changed = tmp_path / "manifest.json"
    changed.write_text(json.dumps(manifest))
    with pytest.raises(ValueError, match="substitution"):
        verify(PDB, ROOT / "candidates.fasta", changed)


def test_modified_fasta_is_rejected(tmp_path):
    fasta = tmp_path / "candidates.fasta"
    fasta.write_text((ROOT / "candidates.fasta").read_text() + ">extra\nAA\n")
    with pytest.raises(ValueError, match="hash differs"):
        verify(PDB, fasta, ROOT / "manifest.json")
