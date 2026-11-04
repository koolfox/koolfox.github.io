"""Audit actual recorded outputs without rerunning the external docking engine."""

import hashlib
import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
ASSETS = PROJECT / "assets/general-docking-demo"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_recorded_general_docking_files_and_input():
    report = json.loads((PROJECT / "data/processed/general-docking-demo.json").read_text())
    assert report["status"] == "requires_further_validation"
    assert report["input"]["source_sha256"] == digest(
        PROJECT / "assets/course/gromacs/1ubq-protein.pdb"
    )
    assert report["workflow_sha256"] == digest(PROJECT / "scripts/run_general_peptide_docking.py")
    assert report["selected_pdb_sha256"] == digest(ASSETS / "selected-chain.pdb")
    assert report["receptor_pdbqt_sha256"] == digest(ASSETS / "receptor.pdbqt")
    assert [c["sequence"] for c in report["candidates"]] == ["AC", "AR"]
    for row in report["candidates"]:
        folder = ASSETS / row["sequence"]
        for file, key in (
            ("conformer.sdf", "conformer_sha256"),
            ("ligand.pdbqt", "ligand_sha256"),
            ("poses.pdbqt", "poses_sha256"),
        ):
            assert digest(folder / file) == row[key]
        assert row["status"] == "requires_further_validation"
        assert all(p["minimum_heavy_atom_distance_angstrom"] >= 2 for p in row["poses"])


def test_recorded_model_and_inspection_scripts_have_not_changed():
    report = json.loads((PROJECT / "data/processed/general-docking-demo.json").read_text())
    assert report["model_builder_sha256"] == digest(PROJECT / "scripts/build_peptide_models.py")
    assert report["inspector_sha256"] == digest(PROJECT / "src/peptide_lab/receptor_input.py")


def test_recorded_fasta_batch_preserves_identifiers_and_hashes():
    report = json.loads((PROJECT / "data/processed/general-fasta-demo.json").read_text())
    folder = PROJECT / "assets/general-fasta-demo"
    assert report["status"] == "requires_further_validation"
    assert report["fasta_sha256"] == digest(folder / "sequences.fasta")
    assert report["workflow_sha256"] == digest(PROJECT / "scripts/run_general_peptide_docking.py")
    assert [r["sequence"] for r in report["candidates"]] == ["AA", "AR", "RA", "RR"]
    assert [r["input_id"] for r in report["candidates"]] == [
        "peptide-000001",
        "peptide-000002",
        "peptide-000003",
        "peptide-000004",
    ]
    for row in report["candidates"]:
        assert digest(folder / row["sequence"] / "poses.pdbqt") == row["poses_sha256"]
