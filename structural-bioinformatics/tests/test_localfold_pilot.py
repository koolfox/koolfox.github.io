"""Offline checks on actual exported models and on the reject-before-docking gate."""

import hashlib
import importlib.util
import json
from pathlib import Path

import numpy as np
import pytest
from Bio.PDB import PDBIO, PDBParser

from peptide_lab.structure import compare_ca, main, screen_structure

PROJECT = Path(__file__).resolve().parents[1]
ASSETS = PROJECT / "assets/localfold-pilot"
UBIQUITIN = "MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG"


def analyzer():
    spec = importlib.util.spec_from_file_location(
        "pilot_analyzer", PROJECT / "scripts/analyze_localfold_pilot.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_report_recomputes_from_unchanged_export_bytes_without_inference():
    report = json.loads((PROJECT / "data/processed/localfold-pilot.json").read_text())
    assert analyzer().analyze() == report
    rows = {r["id"]: r for r in report["runs"]}
    assert rows["ubiquitin-msa"]["experimental_comparison"]["matched_ca"] == 76
    assert rows["ubiquitin-msa"]["experimental_comparison"]["rmsd_angstrom"] < 1
    assert rows["ubiquitin-single-sequence"]["experimental_comparison"]["rmsd_angstrom"] > 10
    assert all(r["docking"] == r["functional_test"] == "not_run" for r in rows.values())
    provenance = json.loads((PROJECT / "data/metadata/localfold-pilot-provenance.json").read_text())
    for name, expected in provenance["analysis_files_sha256"].items():
        assert hashlib.sha256((PROJECT / name).read_bytes()).hexdigest() == expected
    for screenshot in provenance["screenshots"]:
        actual_hash = hashlib.sha256((PROJECT / screenshot["path"]).read_bytes()).hexdigest()
        assert actual_hash == screenshot["sha256"]


def test_short_exports_fail_geometry_even_when_confidence_is_higher(capsys):
    ar = screen_structure(ASSETS / "ar.pdb", "AR")
    ara = screen_structure(ASSETS / "ara.pdb", "ARA")
    assert ar["connections"][0]["c_n_angstrom"] > 19
    assert all(link["c_n_angstrom"] < 1 for link in ara["connections"])
    assert ara["mean_ca_b_column"] > ar["mean_ca_b_column"]
    assert ar["docking_gate"] == ara["docking_gate"] == "blocked_geometry"
    with pytest.raises(SystemExit) as error:
        main(["--pdb", str(ASSETS / "ara.pdb"), "--sequence", "ARA"])
    assert error.value.code == 1
    assert json.loads(capsys.readouterr().out)["cn_screen"] == "fail"


def test_passing_connectivity_does_not_approve_docking_or_certify_the_fold():
    report = screen_structure(ASSETS / "ubiquitin-single-sequence.pdb", UBIQUITIN)
    assert report["cn_screen"] == "pass"
    assert report["docking_gate"] == "requires_further_validation"


def test_ca_comparison_is_rigid_transform_invariant_and_keeps_every_residue(tmp_path):
    reference = PROJECT / "assets/course/gromacs/1ubq-protein.pdb"
    model = PDBParser(QUIET=True).get_structure("ref", reference)
    rotation = np.array([[0, -1, 0], [1, 0, 0], [0, 0, 1]])
    for atom in model.get_atoms():
        atom.transform(rotation, np.array([13.0, -7.0, 4.0]))
    path = tmp_path / "moved.pdb"
    writer = PDBIO()
    writer.set_structure(model)
    writer.save(str(path))
    comparison, _, _ = compare_ca(path, reference)
    assert comparison["matched_ca"] == 76
    assert len(comparison["per_residue_displacement_angstrom"]) == 76
    assert comparison["rmsd_angstrom"] < 0.001


def test_wrong_sequence_and_occupied_backbone_omissions_stop_processing(tmp_path):
    with pytest.raises(ValueError, match="sequence"):
        screen_structure(ASSETS / "ar.pdb", "RA")
    text = (ASSETS / "ar.pdb").read_text()
    text = (
        "\n".join(
            line[:54] + "  0.00" + line[60:]
            if line.startswith("ATOM") and line[12:16].strip() == "N"
            else line
            for line in text.splitlines()
        )
        + "\n"
    )
    path = tmp_path / "unoccupied.pdb"
    path.write_text(text)
    with pytest.raises(ValueError, match="Missing occupied backbone"):
        screen_structure(path, "AR")


def test_numbering_gaps_are_not_bridged(tmp_path):
    text = (ASSETS / "ar.pdb").read_text()
    text = (
        "\n".join(
            line[:22] + "   9" + line[26:]
            if line.startswith("ATOM") and int(line[22:26]) == 2
            else line
            for line in text.splitlines()
        )
        + "\n"
    )
    path = tmp_path / "gap.pdb"
    path.write_text(text)
    report = screen_structure(path, "AR")
    assert report["connections"][0]["author_numbering_adjacent"] is False
    assert report["docking_gate"] == "blocked_geometry"


def test_multichain_inputs_are_rejected_instead_of_silently_concatenated(tmp_path):
    lines = (ASSETS / "ar.pdb").read_text().splitlines()
    path = tmp_path / "complex.pdb"
    path.write_text(
        "\n".join(
            line[:21] + "B" + line[22:]
            if line.startswith("ATOM") and int(line[22:26]) == 2
            else line
            for line in lines
        )
        + "\n"
    )
    with pytest.raises(ValueError, match="one protein chain"):
        screen_structure(path, "AR")
