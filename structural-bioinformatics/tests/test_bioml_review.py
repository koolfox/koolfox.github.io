"""Offline checks for the published exploratory BioML review assets."""

import ast
import hashlib
import json
import runpy
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def test_displayed_values_match_recorded_run():
    source = (PROJECT / "playgrounds/bioml-review/app.py").read_text()
    tree = ast.parse(source)
    constants = {
        node.targets[0].id: ast.literal_eval(node.value)
        for node in tree.body
        if isinstance(node, ast.Assign)
        and len(node.targets) == 1
        and isinstance(node.targets[0], ast.Name)
        and node.targets[0].id in {"SCORES", "DISTANCES"}
    }
    report = json.loads((PROJECT / "data/processed/bioml-review.json").read_text())
    for sequence, arm in report["arms"].items():
        poses = arm["report"]["candidates"][0]["poses"]
        assert constants["SCORES"][sequence] == [p["vina_score_kcal_mol"] for p in poses]
        assert constants["DISTANCES"][sequence] == [
            p["minimum_heavy_atom_distance_angstrom"] for p in poses
        ]


def test_review_staging_verifies_and_prepares_six_pymol_scenes(tmp_path):
    exporter = runpy.run_path(str(PROJECT / "scripts/export_course_lab.py"))
    target = tmp_path / "staged"
    exporter["stage_bioml"](target)
    report = json.loads((PROJECT / "data/processed/bioml-review.json").read_text())
    data = target / "www/data"
    for sequence in ("TWNSGHID", "DIHGNSWT"):
        run = report["arms"][sequence]["report"]
        candidate = run["candidates"][0]
        assert (
            hashlib.sha256((data / f"{sequence}.pdbqt").read_bytes()).hexdigest()
            == (candidate["poses_sha256"])
        )
        assert (
            hashlib.sha256((data / "receptor.pdbqt").read_bytes()).hexdigest()
            == (run["receptor_pdbqt_sha256"])
        )
        for pose in (1, 2, 3):
            script = (data / f"{sequence}-{pose}.pml").read_text(encoding="ascii")
            assert f"pose_{sequence}_{pose}" in script
            assert "binding or inhibition is not established" in script
    assert (target / "www/vendor/three.module.js").exists()
    assert 'from "./vendor/three.module.js";' in (target / "www/molecular-scene.js").read_text()
    assert not list(target.rglob("__pycache__"))
