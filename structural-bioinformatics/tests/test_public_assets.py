"""Cross-check shared graphics against independent deposited-coordinate selection."""

import json
from pathlib import Path

import numpy as np

from tnf_atlas.provenance import sha256
from tnf_atlas.structure import analyze_interface, heavy_atoms, read_model

PROJECT = Path(__file__).resolve().parents[1]


def test_curated_coordinates_reproduce_contact_analysis():
    path = PROJECT / "assets/3wd5.pdb"
    computed = analyze_interface(path)
    public = json.loads((PROJECT / "data/processed/interface-summary.json").read_text())
    for key in ("residue_pairs", "chain_counts", "target_interface_residues"):
        assert computed[key] == public[key]


def test_viewer_points_match_positive_occupancy_source_coordinates():
    model = read_model(PROJECT / "assets/3wd5.pdb")
    data = json.loads((PROJECT / "data/processed/structures-view.json").read_text())
    structure = next(item for item in data["structures"] if item["id"] == "3WD5")
    for chain in structure["chains"]:
        atoms = [atom for atom in heavy_atoms(model[chain["id"]]) if atom.name == "CA"]
        assert len(atoms) == len(chain["residues"])
        np.testing.assert_allclose(
            [atom.coord for atom in atoms], [r["xyz"] for r in chain["residues"]], atol=0.001
        )


def test_vendor_and_animation_provenance_match_public_bytes():
    vendor = json.loads((PROJECT / "data/metadata/graphics-vendor.json").read_text())
    for file in vendor["files"]:
        assert sha256(PROJECT / file["path"]) == file["sha256"]
    assets = json.loads((PROJECT / "data/metadata/visual-assets.json").read_text())
    for key in ("coordinates", "animation"):
        assert sha256(PROJECT / assets[key]["path"]) == assets[key]["sha256"]


def test_reading_libraries_and_fonts_match_recorded_distributions():
    manifest = json.loads((PROJECT / "data/metadata/reading-vendor.json").read_text())
    for file in manifest["files"]:
        assert sha256(PROJECT / file["path"]) == file["sha256"]


def test_reference_viewer_uses_verified_local_packages_and_original_pdbs():
    manifest = json.loads((PROJECT / "data/metadata/molecular-viewer-vendor.json").read_text())
    sources = json.loads((PROJECT / "data/metadata/structure-downloads.json").read_text())
    expected = {
        entry["pdb_id"]: next(
            source["sha256"] for source in entry["coordinates"] if source["path"].endswith(".pdb")
        )
        for entry in sources["files"]
    }
    for file in manifest["files"] + manifest["coordinates"]:
        assert sha256(PROJECT / file["path"]) == file["sha256"]
    for file in manifest["coordinates"]:
        assert file["sha256"] == expected[file["pdb_id"]]


def test_six_zero_occupancy_ca_atoms_explain_the_3wd5_trace_count_difference():
    model = read_model(PROJECT / "assets/3wd5.pdb")
    recorded = [atom for atom in model.get_atoms() if atom.name == "CA"]
    excluded = {
        (atom.get_parent().get_parent().id, atom.get_parent().id[1])
        for atom in recorded
        if atom.get_occupancy() == 0
    }
    assert len(recorded) == 579
    assert excluded == {("L", 212), ("L", 213), ("H", 41), ("H", 135), ("H", 142), ("H", 198)}
    assert sum(atom.get_occupancy() > 0 for atom in recorded) == 573
