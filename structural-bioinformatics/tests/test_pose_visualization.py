"""The 3D export must remain tied to the recorded docking and its source files."""

import hashlib
import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_visualization_files_are_traceable_to_real_docking():
    root = PROJECT / "assets/docked-ac-visualization"
    manifest = json.loads((root / "manifest.json").read_text())
    report = json.loads((PROJECT / "data/processed/general-docking-demo.json").read_text())
    assert manifest["status"] == "visualization_exported"
    assert manifest["sequence"] == "AC"
    assert manifest["source_report_sha256"] == digest(
        PROJECT / "data/processed/general-docking-demo.json"
    )
    assert manifest["source_receptor_sha256"] == digest(root / "receptor.pdb")
    assert manifest["source_poses_sha256"] == next(
        r["poses_sha256"] for r in report["candidates"] if r["sequence"] == "AC"
    )
    assert manifest["exporter_sha256"] == digest(
        PROJECT / "tests/fixtures/docking-provenance/export-poses.py.txt"
    )
    assert len(manifest["files"]) == 3
    for row in manifest["files"]:
        assert digest(root / row["sdf"]) == row["sdf_sha256"]
        assert digest(root / row["pymol_script"]) == row["pymol_sha256"]


def test_actual_export_and_tampered_input_are_detected(tmp_path):
    import importlib.util
    import shutil

    import pytest

    pytest.importorskip("meeko")
    spec = importlib.util.spec_from_file_location(
        "export_docked_poses", PROJECT / "scripts/export_docked_poses.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    run = tmp_path / "run"
    (run / "AC").mkdir(parents=True)
    shutil.copyfile(PROJECT / "data/processed/general-docking-demo.json", run / "report.json")
    shutil.copyfile(
        PROJECT / "assets/general-docking-demo/selected-chain.pdb", run / "selected-chain.pdb"
    )
    shutil.copyfile(PROJECT / "assets/general-docking-demo/AC/poses.pdbqt", run / "AC/poses.pdbqt")
    shutil.copyfile(PROJECT / "assets/general-docking-demo/receptor.pdbqt", run / "receptor.pdbqt")
    result = module.export(run, "AC", tmp_path / "view")
    assert len(result["files"]) == 3
    with pytest.raises(FileExistsError):
        module.export(run, "AC", tmp_path / "view")
    (run / "AC/poses.pdbqt").write_text("altered")
    with pytest.raises(ValueError, match="hash"):
        module.export(run, "AC", tmp_path / "other")
