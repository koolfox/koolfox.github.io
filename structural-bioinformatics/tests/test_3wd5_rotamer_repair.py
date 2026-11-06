"""Numerical and negative controls for the bounded rotamer experiment."""

import sys
from pathlib import Path

import numpy as np
import pytest
from Bio.PDB import PDBParser

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT / "scripts"))
import explore_3wd5_rotamer_repair as repair  # noqa: E402


def test_rotation_preserves_covalent_geometry_and_round_trips():
    chain = PDBParser(QUIET=True).get_structure("p", repair.SOURCE)[0]["A"]
    residue = chain[69]
    original = residue["SG"].coord.astype(float)
    moved = repair.rotate(residue, [87])[0]
    restored = repair.rotate(residue, [-87], moved)[0]
    np.testing.assert_allclose(restored, original, atol=1e-12)
    assert np.linalg.norm(moved - residue["CB"].coord) == pytest.approx(
        np.linalg.norm(original - residue["CB"].coord), abs=1e-12
    )
    axis = residue["CA"].coord - residue["CB"].coord
    assert np.dot(moved - residue["CB"].coord, axis) == pytest.approx(
        np.dot(original - residue["CB"].coord, axis), abs=1e-12
    )


def test_real_3wd5_candidate_meets_explicit_screens():
    model = PDBParser(QUIET=True).get_structure("p", repair.SOURCE)[0]
    rows = repair.enumerate_candidates(model["A"], repair.neighbors(model, "A"))
    assert len(rows) == 10
    first = rows[0]
    assert first["rotation_degrees"] == [-90, -10]
    assert 1.9 <= first["sg_sg_angstrom"] <= 2.2
    assert all(95 <= value <= 115 for value in first["angles_degrees"])
    assert 60 <= abs(first["dihedral_degrees"]) <= 120
    assert min(first["nearest_other_heavy_angstrom"]) >= 2.5
    assert first["displacement_from_input_angstrom"][0] > 2.3


def test_7ta3_recovery_control_and_clash_negative_control():
    model = PDBParser(QUIET=True).get_structure("p", repair.TEMPLATE)[0]
    chain = model["B"]
    native = [chain[n]["SG"].coord.astype(float) for n in (69, 101)]
    start = [repair.rotate(chain[n], [d])[0] for n, d in ((69, 20), (101, -20))]
    nearby = repair.neighbors(model, "B")
    rows = repair.enumerate_candidates(chain, nearby, start=start)
    assert rows
    rmsd = np.sqrt(
        np.mean([np.sum((a - b) ** 2) for a, b in zip(rows[0]["positions"], native, strict=True)])
    )
    assert rmsd == pytest.approx(0.2041, abs=0.001)
    # A cloud occupying the full rotational path must reject every candidate.
    cloud = np.concatenate([repair.rotate(chain[69], np.arange(-180, 180, 2)), nearby])
    assert not repair.enumerate_candidates(chain, cloud, start=start)


def test_interchain_sulfur_pairs_include_all_copies_and_detect_collision():
    positions = {
        (chain, residue): np.array([float(ci * 20 + ri), 0.0, 0.0])
        for ci, chain in enumerate("ABC")
        for ri, residue in enumerate((69, 101))
    }
    pairs = repair.interchain_sulfur_pairs(positions)
    assert len(pairs) == 12
    labels = {tuple(pair["atoms"]) for pair in pairs}
    assert len(labels) == 12
    assert all(left[0] != right[0] for left, right in labels)
    for pair in pairs:
        a, b = [label.split(":") for label in pair["atoms"]]
        expected = np.linalg.norm(positions[(a[0], int(a[1]))] - positions[(b[0], int(b[1]))])
        assert pair["distance_angstrom"] == pytest.approx(expected)
    positions[("C", 101)] = positions[("A", 69)].copy()
    colliding = repair.interchain_sulfur_pairs(positions)
    assert min(pair["distance_angstrom"] for pair in colliding) == 0
    with pytest.raises(ValueError, match="six"):
        repair.interchain_sulfur_pairs({("A", 69): np.zeros(3)})


def test_pdb_and_pdbqt_summary_hashes_counts_and_invalid_records():
    import hashlib

    line = next(
        line for line in repair.TRIMER.read_text().splitlines() if line.startswith("ATOM  ")
    )
    pdb = (line + "\nEND\n").encode("ascii")
    summary = repair.summarize_atom_records(pdb)
    assert summary["sha256"] == hashlib.sha256(pdb).hexdigest()
    assert summary["record_types"] == {"ATOM": 1}
    assert summary["chains"] == {"A": {"atom_records": 1, "residues": 1}}
    pdbqt_line = line[:70].ljust(70) + f"{-0.123:6.3f}" + " " + "C"
    pdbqt = (pdbqt_line + "\n").encode("ascii")
    output = repair.summarize_atom_records(pdbqt, pdbqt=True)
    assert output["sha256"] == hashlib.sha256(pdbqt).hexdigest()
    assert output["autodock_atom_types"] == {"C": 1}
    assert output["sum_of_rounded_partial_charges"] == -0.123
    changed = pdbqt.replace(b"-0.123", b"-0.124")
    assert repair.summarize_atom_records(changed, pdbqt=True)["sha256"] != output["sha256"]
    with pytest.raises(ValueError, match="Truncated"):
        repair.summarize_atom_records(b"ATOM\n", pdbqt=True)


def test_actual_candidate_interchain_pairs_follow_symmetry():
    model = PDBParser(QUIET=True).get_structure("p", repair.SOURCE)[0]
    row = repair.enumerate_candidates(model["A"], repair.neighbors(model, "A"))[0]
    sulfurs = repair.candidate_sulfurs(row["positions"])
    pairs = repair.interchain_sulfur_pairs(sulfurs)
    assert len(pairs) == 12
    assert min(pair["distance_angstrom"] for pair in pairs) == pytest.approx(14.360986, abs=0.00001)


def test_recorded_meeko_output_replays_when_same_local_environment_exists():
    import hashlib
    import json

    executable = Path("/opt/anaconda3/envs/tnf-docking/bin/mk_prepare_receptor.py")
    if not executable.is_file():
        pytest.skip("Recorded Meeko executable is not installed")
    evidence = json.loads(
        (PROJECT / "data/processed/3wd5-rotamer-repair-exploration.json").read_text()
    )["temporary_candidate_probe"]
    if hashlib.sha256(executable.read_bytes()).hexdigest() != evidence["meeko_program_sha256"]:
        pytest.skip("Meeko executable differs from recorded environment")
    try:
        environment = repair.meeko_environment(executable)
    except (OSError, ValueError, repair.subprocess.SubprocessError):
        pytest.skip("Recorded Meeko interpreter is unavailable")
    if environment != evidence["environment"]:
        pytest.skip("Meeko runtime versions differ from recorded environment")
    model = PDBParser(QUIET=True).get_structure("p", repair.SOURCE)[0]
    selected = repair.enumerate_candidates(model["A"], repair.neighbors(model, "A"))[0]
    actual = repair.probe_candidate(selected, executable)
    assert actual["guard"] == "passed"
    assert actual["input_atom_selection"] == evidence["input_atom_selection"]
    assert actual["meeko"]["exit_code"] == 0
    assert actual["meeko"]["output_pdbqt"] == evidence["meeko"]["output_pdbqt"]
