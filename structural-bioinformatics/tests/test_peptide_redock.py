"""Atom correspondence and fixed-frame RMSD are essential to redocking validation."""

import pytest

from peptide_lab.redock import atoms, compare


def test_fixed_receptor_frame_does_not_align_away_a_translation():
    reference = {1: (0.0, 0.0, 0.0), 2: (1.0, 0.0, 0.0)}
    shifted = {1: (3.0, 4.0, 0.0), 2: (4.0, 4.0, 0.0)}
    assert compare(reference, reference) == 0
    assert compare(reference, shifted) == 5


def test_atom_identity_mismatch_is_rejected():
    with pytest.raises(ValueError, match="serials differ"):
        compare({1: (0.0, 0.0, 0.0)}, {2: (0.0, 0.0, 0.0)})


def test_duplicate_atom_identifiers_are_rejected():
    line = "ATOM      1  C   UNK A   1       1.000   2.000   3.000  1.00  0.00     0.000 C"
    with pytest.raises(ValueError, match="Duplicate"):
        atoms(line + "\n" + line)


def test_pdbqt_gate_detects_shifted_or_missing_heavy_atom(tmp_path):
    import importlib.util
    from pathlib import Path

    script = Path(__file__).resolve().parents[1] / "scripts/run_tnf_redock.py"
    spec = importlib.util.spec_from_file_location("tnf_runner", script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    pdb = tmp_path / "model.pdb"
    pdbqt = tmp_path / "model.pdbqt"
    prefix = "ATOM      1  CA  GLY A   1       1.000   2.000   3.000  1.00  0.00"
    pdb.write_text(prefix.ljust(76) + " C\n")
    pdbqt.write_text(prefix + "    +0.000 C\n")
    assert module.validate_pdbqt_coordinates(pdb, pdbqt)["heavy_atoms"] == 1
    pdbqt.write_text(pdbqt.read_text().replace("   1.000", "   2.000", 1))
    with pytest.raises(ValueError, match="coordinate change"):
        module.validate_pdbqt_coordinates(pdb, pdbqt)


def test_published_run_recomputes_from_actual_pose_files():
    import hashlib
    import json
    from pathlib import Path

    from peptide_lab.redock import score_files

    root = Path(__file__).resolve().parents[1]
    assets = root / "assets/tnf-peptide"
    report = json.loads((root / "data/processed/tnf-peptide-redock.json").read_text())
    for name, expected in report["files_sha256"].items():
        assert hashlib.sha256((assets / name).read_bytes()).hexdigest() == expected
    assert score_files(assets / "reference.pdbqt", assets / "native-pose.pdbqt") == report["scores"]
    assert (
        score_files(assets / "reference.pdbqt", assets / "rotated-pose.pdbqt")
        == report["repeat"]["scores_vs_experimental"]
    )
    assert report["saved_poses"] == 1


def test_runner_fails_closed_on_shifted_input_before_creating_output(tmp_path):
    import subprocess
    import sys
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    files = root / "assets/tnf-peptide"
    work = tmp_path / "inputs"
    work.mkdir()
    for name in ("peptide.pdb", "receptor-repaired.pdb", "reference.pdbqt", "receptor.pdbqt"):
        target = "peptide.pdbqt" if name == "reference.pdbqt" else name
        (work / target).write_bytes((files / name).read_bytes())
    ligand = work / "peptide.pdbqt"
    ligand.write_text(ligand.read_text().replace("  -9.039", "  -8.039", 1))
    output = tmp_path / "must-not-exist"
    result = subprocess.run(
        [
            sys.executable,
            str(root / "scripts/run_tnf_redock.py"),
            "--input-dir",
            str(work),
            "--output-dir",
            str(output),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode != 0
    assert "Unexpected coordinate change" in result.stderr
    assert not output.exists()


def test_runner_records_failed_engine_instead_of_claiming_a_pose(tmp_path):
    import json
    import subprocess
    import sys
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    files = root / "assets/tnf-peptide"
    work = tmp_path / "inputs"
    work.mkdir()
    for name in ("peptide.pdb", "receptor-repaired.pdb", "reference.pdbqt", "receptor.pdbqt"):
        target = "peptide.pdbqt" if name == "reference.pdbqt" else name
        (work / target).write_bytes((files / name).read_bytes())
    engine = tmp_path / "fake-vina"
    engine.write_text('#!/bin/sh\nif [ "$1" = "--version" ]; then echo fake; exit 0; fi\nexit 7\n')
    engine.chmod(0o755)
    output = tmp_path / "run"
    result = subprocess.run(
        [
            sys.executable,
            str(root / "scripts/run_tnf_redock.py"),
            "--input-dir",
            str(work),
            "--output-dir",
            str(output),
            "--vina",
            str(engine),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode != 0
    manifest = json.loads((output / "run.json").read_text())
    assert manifest["status"] == "failed"
    assert manifest["exit_code"] == 7
    assert "comparison" not in manifest
