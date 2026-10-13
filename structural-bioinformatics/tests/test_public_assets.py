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
