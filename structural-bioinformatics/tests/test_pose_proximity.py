"""Audit actual stored 1FCC poses and fail-closed downstream export."""

import hashlib
import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

from peptide_lab.pose_geometry import FAR, ISSUE, NEAR, classify, verify_recorded_geometry

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT / "assets/multichain-1fcc-demo"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


@pytest.mark.parametrize(
    ("name", "expected", "lower", "upper"),
    [("interface-run", NEAR, 2.9, 3.1), ("off-target-box-run", FAR, 33, 39)],
)
def test_real_1fcc_poses_are_classified_from_unchanged_files(name, expected, lower, upper):
    run = ROOT / name
    report_file = run / "report.json"
    report = json.loads(report_file.read_text())
    row = report["candidates"][0]
    receptor, poses = run / "receptor.pdbqt", run / "AC/poses.pdbqt"
    before = [digest(p) for p in (report_file, receptor, poses)]
    assert before[1:] == [report["receptor_pdbqt_sha256"], row["poses_sha256"]]
    observed = verify_recorded_geometry(receptor.read_text(), poses.read_text(), row["poses"])
    assert len(observed) == 3
    assert all(p["proximity"] == expected for p in observed)
    assert all(lower < p["minimum_heavy_atom_distance_angstrom"] < upper for p in observed)
    assert [digest(p) for p in (report_file, receptor, poses)] == before
    screen = json.loads((ROOT / "geometric-screen.json").read_text())
    recorded = screen["runs"][name]
    assert screen["cutoff_angstrom"] == 4.5
    assert recorded["source_report_sha256"] == before[0]
    assert recorded["receptor_pdbqt_sha256"] == before[1]
    assert recorded["poses_sha256"] == before[2]
    assert recorded["poses"] == observed
    assert recorded["proximity_status"] == (
        ISSUE if expected == FAR else "requires_further_validation"
    )


def test_cutoff_and_invalid_distances():
    assert classify(4.5) == NEAR
    assert classify(4.5001) == FAR
    for bad in (-1, float("nan"), float("inf")):
        with pytest.raises(ValueError):
            classify(bad)


def test_actual_export_rechecks_legacy_and_new_reports(tmp_path):
    python = os.environ.get("TNF_DOCKING_PYTHON")
    if not python:
        pytest.skip("Set TNF_DOCKING_PYTHON to an existing Meeko/RDKit environment")
    script = PROJECT / "scripts/export_docked_poses.py"
    near = ROOT / "interface-run"
    far = ROOT / "off-target-box-run"

    def export(run, name):
        return subprocess.run(
            [
                python,
                str(script),
                "--run-dir",
                str(run),
                "--sequence",
                "AC",
                "--output-dir",
                str(tmp_path / name),
            ],
            capture_output=True,
            text=True,
            check=False,
        )

    result = export(near, "near")
    assert result.returncode == 0, result.stderr
    manifest = json.loads((tmp_path / "near/manifest.json").read_text())
    assert manifest["proximity_cutoff_angstrom"] == 4.5
    assert all(p["proximity"] == NEAR for p in manifest["files"])
    result = export(far, "far")
    assert result.returncode != 0 and "no heavy atoms within 4.5" in result.stderr
    assert not (tmp_path / "far").exists()

    tampered = tmp_path / "tampered"
    shutil.copytree(near, tampered)
    report_file = tampered / "report.json"
    report = json.loads(report_file.read_text())
    report["proximity_screen"] = {"cutoff_angstrom": 4.5}
    report["candidates"][0]["poses"][0]["proximity"] = FAR
    report_file.write_text(json.dumps(report))
    result = export(tampered, "tampered-view")
    assert result.returncode != 0 and "proximity is missing" in result.stderr
    assert not (tmp_path / "tampered-view").exists()

    report["status"] = ISSUE
    report["candidates"][0]["status"] = ISSUE
    for pose in report["candidates"][0]["poses"]:
        pose["proximity"] = FAR
    report_file.write_text(json.dumps(report))
    result = export(tampered, "false-proximity")
    assert result.returncode != 0 and "differs from coordinates" in result.stderr


def test_summary_does_not_present_far_or_unclassified_score(tmp_path):
    import importlib.util

    spec = importlib.util.spec_from_file_location("ops", PROJECT / "scripts/run_peptide_ops.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    folder = tmp_path / "docking/batch-000001/docking"
    folder.mkdir(parents=True)
    (folder / "report.json").write_text(
        json.dumps(
            {
                "candidates": [
                    {
                        "sequence": "AC",
                        "status": ISSUE,
                        "poses": [{"proximity": FAR, "vina_score_kcal_mol": 0.0}],
                    },
                    {
                        "sequence": "AD",
                        "status": "requires_further_validation",
                        "poses": [{"vina_score_kcal_mol": -9.876}],
                    },
                ]
            }
        )
    )
    module.write_summary(tmp_path, {"status": "failed", "steps": [], "target_input_sha256": "x"})
    page = (tmp_path / "report.html").read_text()
    assert "0.0" not in page and "-9.876" not in page
    assert "بدون نزدیکی" in page and "غربال فاصله در گزارش موجود نیست" in page


def test_blocked_minimum_matches_full_pairwise_calculation():
    import numpy as np

    from peptide_lab.pose_geometry import minimum_distance

    rng = np.random.default_rng(712)
    for left, right in [(1, 1), (7, 19), (270, 520)]:
        a = rng.normal(size=(left, 3))
        b = rng.normal(size=(right, 3))
        expected = float(np.linalg.norm(a[:, None, :] - b[None, :, :], axis=2).min())
        assert minimum_distance(a, b, block_size=17) == pytest.approx(expected, abs=1e-12)
    with pytest.raises(ValueError):
        minimum_distance(np.empty((0, 3)), np.ones((2, 3)))
