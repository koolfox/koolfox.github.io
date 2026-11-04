"""Boundaries and failure handling for the exploratory batch runner."""

import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace

import pytest

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "peptide_batches", PROJECT / "scripts/run_peptide_batches.py"
)
batches = importlib.util.module_from_spec(spec)
spec.loader.exec_module(batches)


def test_combinations_are_complete_and_bounded():
    seqs = batches.combinations("AR", [2, 3], 12)
    assert len(seqs) == len(set(seqs)) == 12
    assert {"AA", "AR", "RA", "RR", "AAA", "RRR"} <= set(seqs)
    for args in (("AR", [2, 3], 11), ("AX", [2], 12), ("AR", [4], 12), ("AA", [2], 12)):
        with pytest.raises(ValueError):
            batches.combinations(*args)


def test_failed_engine_is_recorded_and_existing_output_is_protected(tmp_path, monkeypatch):
    receptor = tmp_path / "receptor.pdbqt"
    receptor.write_text("input")
    monkeypatch.setattr(
        batches.subprocess,
        "run",
        lambda *a, **k: SimpleNamespace(returncode=1, stdout="", stderr="engine failure"),
    )
    output = tmp_path / "run"
    with pytest.raises(RuntimeError):
        batches.run("A", [2], 1, receptor, "vina", output)
    report = json.loads((output / "batch-report.json").read_text())
    assert report["status"] == "failed"
    assert report["batches"][0]["status"] == "failed"
    assert (output / "batch-001.stderr.txt").read_text() == "engine failure"
    with pytest.raises(FileExistsError):
        batches.run("A", [2], 1, receptor, "vina", output)
