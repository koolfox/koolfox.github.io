"""Independently audit the files and geometric checks of the small screening pilot."""

import hashlib
import json
import re
from pathlib import Path

import numpy as np

PROJECT = Path(__file__).resolve().parents[1]
SCREEN = PROJECT / "assets/tnf-peptide/screen"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def atoms(text):
    return np.array(
        [
            [float(line[i : i + 8]) for i in (30, 38, 46)]
            for line in text.splitlines()
            if line.startswith(("ATOM  ", "HETATM")) and line.split()[-1] not in ("H", "HD")
        ]
    )


def test_recorded_pilot_files_and_distances():
    report = json.loads((PROJECT / "data/processed/tnf-ar-screen.json").read_text())
    receptor = PROJECT / "assets/tnf-peptide/receptor.pdbqt"
    assert digest(receptor) == report["receptor_sha256"]
    assert digest(PROJECT / "scripts/screen_ar_peptides.py") == (
        "0f625f7f630311a4435c89c8bc574e69376187aeed550da2778b19a2873c86d9"
    )
    assert report["status"] == "completed"
    assert {r["sequence"] for r in report["candidates"]} == {"AA", "AR", "RA", "RR"}
    target = atoms(receptor.read_text())
    for row in report["candidates"]:
        folder = SCREEN / row["sequence"]
        for name, field in (
            ("conformer.sdf", "sdf_sha256"),
            ("ligand.pdbqt", "pdbqt_sha256"),
            ("poses.pdbqt", "poses_sha256"),
        ):
            assert digest(folder / name) == row[field]
        models = re.findall(
            r"^MODEL\s+\d+\s*$(.*?)^ENDMDL\s*$", (folder / "poses.pdbqt").read_text(), re.M | re.S
        )
        assert len(models) == len(row["poses"]) == 3
        for model, pose in zip(models, row["poses"], strict=True):
            coords = atoms(model)
            minimum = float(np.linalg.norm(coords[:, None, :] - target[None, :, :], axis=2).min())
            assert np.isclose(minimum, pose["minimum_interchain_heavy_distance_angstrom"])
            assert pose["severe_clash_screen"] == ("pass" if minimum >= 2 else "fail")
