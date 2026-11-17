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


def test_score_rejects_changed_atom_identity_with_same_serial(tmp_path):
    from peptide_lab.redock import score_files

    line = "ATOM      1  CA  GLY A   1       1.000   2.000   3.000  1.00  0.00     0.000 C"
    reference = tmp_path / "reference.pdbqt"
    pose = tmp_path / "pose.pdbqt"
    reference.write_text(line + "\n")
    pose.write_text(
        "MODEL 1\nREMARK VINA RESULT: -1.0 0 0\n" + line.replace(" CA ", " CB ") + "\nENDMDL\n"
    )
    with pytest.raises(ValueError, match="identities differ"):
        score_files(reference, pose)


def test_published_poses_and_rotated_start_in_receptor_frame():
    import math
    from pathlib import Path

    from peptide_lab.redock import atom_identities

    assets = Path(__file__).resolve().parents[1] / "assets/tnf-peptide"
    names = ("reference.pdbqt", "native-pose.pdbqt", "rotated-start.pdbqt", "rotated-pose.pdbqt")
    texts = {name: (assets / name).read_text() for name in names}
    identities = {name: atom_identities(text) for name, text in texts.items()}
    assert len(identities[names[0]]) == 253
    assert all(identities[name] == identities[names[0]] for name in names)
    coords = {name: atoms(text) for name, text in texts.items()}
    assert compare(coords[names[0]], coords[names[1]]) == pytest.approx(0.1368105785)
    assert compare(coords[names[0]], coords[names[3]]) == pytest.approx(0.1367980971)
    assert compare(coords[names[0]], coords[names[2]]) == pytest.approx(13.23116188496)
    # This fit checks only whether the start is a rigid transform, not pose RMSD.
    import numpy as np

    ids = sorted(coords[names[0]])
    ref = np.array([coords[names[0]][i] for i in ids])
    moved = np.array([coords[names[2]][i] for i in ids])
    ref_centered, moved_centered = ref - ref.mean(axis=0), moved - moved.mean(axis=0)
    u, _, vt = np.linalg.svd(moved_centered.T @ ref_centered)
    handedness = np.eye(3)
    handedness[2, 2] = np.linalg.det(u @ vt)
    rotation = u @ handedness @ vt
    assert np.linalg.det(rotation) == pytest.approx(1.0)
    assert np.sqrt(np.mean(np.sum((moved_centered @ rotation - ref_centered) ** 2, axis=1))) < 1e-10
    assert compare(coords[names[1]], coords[names[3]]) == pytest.approx(0.0002811608)
    differences = [math.dist(coords[names[1]][i], coords[names[3]][i]) for i in coords[names[1]]]
    assert sum(d > 0 for d in differences) == 20
    assert max(differences) == pytest.approx(0.001)
    assert all("TORSDOF 0" in text for text in texts.values())


def test_published_receptor_frame_and_terminal_oxygen_swap():
    import importlib.util
    import math
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    assets = root / "assets/tnf-peptide"
    spec = importlib.util.spec_from_file_location("tnf_runner", root / "scripts/run_tnf_redock.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    receptor = module.heavy_atom_coordinates(assets / "receptor-repaired.pdb")
    prepared = module.heavy_atom_coordinates(assets / "receptor.pdbqt", pdbqt=True)
    assert module.validate_pdbqt_coordinates(
        assets / "receptor-repaired.pdb", assets / "receptor.pdbqt", True
    )["terminal_oxygen_names_swapped"]
    for name, partner in (("O", "OXT"), ("OXT", "O")):
        key = ("B", " 157 ", name)
        partner_key = ("B", " 157 ", partner)
        assert math.dist(receptor[key], prepared[partner_key]) == 0

    source = {}
    alternate_occupancies = set()
    for line in (assets / "7ta3.pdb").read_text().splitlines():
        if not line.startswith("ATOM  ") or line[21] != "B":
            continue
        if line[76:78].strip() in ("H", "D"):
            continue
        if line[22:26].strip() == "32" and line[16] in ("A", "B"):
            alternate_occupancies.add((line[16], float(line[54:60])))
        if line[16] not in (" ", "A"):
            continue
        key = (line[21], line[22:27], line[12:16].strip())
        assert key not in source
        source[key] = tuple(float(line[i : i + 8]) for i in (30, 38, 46))
    assert alternate_occupancies == {("A", 0.41), ("B", 0.59)}
    assert len(source) == 1091
    assert source.keys() <= receptor.keys()
    assert len(receptor.keys() - source.keys()) == 20
    assert all(math.dist(xyz, receptor[key]) == 0 for key, xyz in source.items())
