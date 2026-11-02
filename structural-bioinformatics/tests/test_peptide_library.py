"""Numerical library invariants and honest, bounded export behavior."""

import hashlib
import json
from pathlib import Path

import pytest

from peptide_lab.cli import main
from peptide_lab.library import LibrarySpec, export_library, plan_library


def test_order_repetition_and_length_counts_match_the_complete_export(tmp_path):
    spec = LibrarySpec("AR", 2, 3)
    manifest = export_library(spec, tmp_path / "library", max_sequences=12)
    lines = (tmp_path / "library/sequences.fasta").read_text().splitlines()
    sequences = lines[1::2]
    assert sequences == [
        "AA",
        "AR",
        "RA",
        "RR",
        "AAA",
        "AAR",
        "ARA",
        "ARR",
        "RAA",
        "RAR",
        "RRA",
        "RRR",
    ]
    assert len(set(sequences)) == manifest["total_sequences"] == 12
    assert manifest["counts_by_length"] == [{"length": 2, "count": 4}, {"length": 3, "count": 8}]


def test_canonical_counts_are_exact_without_sequence_enumeration():
    plan = plan_library(LibrarySpec(min_length=2, max_length=6))
    assert [row["count"] for row in plan["counts_by_length"]] == [
        400,
        8_000,
        160_000,
        3_200_000,
        64_000_000,
    ]
    assert plan["total_sequences"] == 67_368_400
    assert plan["docking"] == plan["structure_generation"] == "not_run"


@pytest.mark.parametrize("alphabet", ["", "AA", "AB", "AX", "A R", "OU"])
def test_ambiguous_or_repeated_symbols_are_rejected(alphabet):
    with pytest.raises(ValueError):
        LibrarySpec(alphabet, 2, 3)


@pytest.mark.parametrize("lengths", [(0, 3), (4, 3), (2, 51), (True, 3), (2, 3.5)])
def test_invalid_ranges_are_rejected(lengths):
    with pytest.raises(ValueError):
        LibrarySpec("AR", *lengths)


def test_budget_failure_creates_no_output_and_never_exports_a_prefix(tmp_path):
    destination = tmp_path / "must-not-exist"
    with pytest.raises(ValueError, match="400 sequences"):
        export_library(LibrarySpec(min_length=2, max_length=2), destination, 399)
    assert not destination.exists()


def test_existing_outputs_are_preserved(tmp_path):
    destination = tmp_path / "prior-run"
    destination.mkdir()
    original = destination / "sequences.fasta"
    original.write_text("prior evidence\n")
    with pytest.raises(FileExistsError):
        export_library(LibrarySpec("AR", 2, 2), destination)
    assert original.read_text() == "prior evidence\n"


def test_manifest_traces_exact_bytes_without_claiming_a_molecular_test(tmp_path):
    destination = tmp_path / "library"
    export_library(LibrarySpec(" ar ", 2, 2), destination)
    manifest = json.loads((destination / "manifest.json").read_text())
    assert manifest["settings"]["alphabet"] == "AR"
    assert manifest["exported_sequences"] == manifest["total_sequences"] == 4
    assert (
        manifest["files"]["sequences.fasta"]["sha256"]
        == hashlib.sha256((destination / "sequences.fasta").read_bytes()).hexdigest()
    )
    assert manifest["docking"] == manifest["functional_test"] == "not_run"
    assert manifest["stereochemistry"] == "not_built_or_checked"


def test_cli_reports_counts_and_budget_errors(capsys, tmp_path):
    main(["plan", "--alphabet", "AR", "--max-length", "3"])
    assert json.loads(capsys.readouterr().out)["total_sequences"] == 12
    with pytest.raises(SystemExit) as error:
        main(["generate", "--output-dir", str(tmp_path / "too-large")])
    assert error.value.code == 2
    assert not (tmp_path / "too-large").exists()


def test_recorded_workshop_libraries_reproduce_without_network_or_model_runs(tmp_path):
    project = Path(__file__).resolve().parents[1]
    evidence = json.loads((project / "data/metadata/peptide-workshop-provenance.json").read_text())
    for index, run in enumerate(evidence["runs"]):
        expected = run["manifest"]
        settings = expected["settings"]
        spec = LibrarySpec(settings["alphabet"], settings["min_length"], settings["max_length"])
        actual = export_library(spec, tmp_path / str(index), expected["export_budget"])
        assert actual["files"] == expected["files"]
        assert actual["exported_sequences"] == expected["exported_sequences"]
        assert actual["spec_sha256"] == expected["spec_sha256"]
    for filename, expected_hash in evidence["inputs_and_code_sha256"].items():
        assert hashlib.sha256((project / filename).read_bytes()).hexdigest() == expected_hash
    assert evidence["localfold_inference"] == evidence["peptide_docking"] == "not_run"
