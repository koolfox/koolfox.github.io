"""Streaming, failure and provenance checks without an external docking engine."""

import hashlib
import importlib.util
import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from Bio import SeqIO

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "fasta_batches", PROJECT / "scripts/run_fasta_batches.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def args_for(source, target, out):
    return [
        "run_fasta_batches.py",
        "--fasta",
        str(source),
        "--pdb",
        str(target),
        "--chain",
        "A",
        "--center",
        "30",
        "28",
        "15",
        "--size",
        "20",
        "20",
        "20",
        "--receptor-preparer",
        "unused",
        "--vina",
        "unused",
        "--output-dir",
        str(out),
    ]


def test_more_than_twenty_records_are_not_truncated(tmp_path, monkeypatch):
    source = tmp_path / "input.fasta"
    seqs = ["A" + letter for letter in "ACDEFGHIKLMNPQRSTVWY"] + ["AAA"]
    source.write_text("".join(f">id{i}\n{seq}\n" for i, seq in enumerate(seqs)))
    target = tmp_path / "target.pdb"
    target.write_text("target")
    out = tmp_path / "run"
    monkeypatch.setattr(sys, "argv", args_for(source, target, out))

    def fake_child(command, **kwargs):
        fasta = Path(command[command.index("--fasta") + 1])
        destination = Path(command[command.index("--output-dir") + 1])
        destination.mkdir()
        rows = [
            {"input_id": r.id, "sequence": str(r.seq)} for r in SeqIO.parse(str(fasta), "fasta")
        ]
        report = {
            "status": "requires_further_validation",
            "candidates": rows,
            "fasta_sha256": hashlib.sha256(fasta.read_bytes()).hexdigest(),
            "input": {"source_sha256": hashlib.sha256(target.read_bytes()).hexdigest()},
        }
        (destination / "report.json").write_text(json.dumps(report))
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    monkeypatch.setattr(module.subprocess, "run", fake_child)
    module.main()
    report = json.loads((out / "batch-workflow.json").read_text())
    assert report["total_sequences"] == report["completed_sequences"] == 21
    assert [b["input_count"] for b in report["batches"]] == [20, 1]
    assert report["status"] == "requires_further_validation"


def test_invalid_late_record_stops_before_any_docking(tmp_path, monkeypatch):
    source = tmp_path / "input.fasta"
    source.write_text(">good\nAA\n>bad\nAX\n")
    target = tmp_path / "target.pdb"
    target.write_text("target")
    out = tmp_path / "run"
    monkeypatch.setattr(sys, "argv", args_for(source, target, out))

    def forbidden(*args, **kwargs):
        raise AssertionError("No docking should start before all records pass preflight")

    monkeypatch.setattr(module.subprocess, "run", forbidden)
    with pytest.raises(SystemExit):
        module.main()
    report = json.loads((out / "batch-workflow.json").read_text())
    assert report["status"] == "failed"
    assert report["completed_sequences"] == 0
    assert report["batches"] == []


def test_actual_twenty_one_sequence_run_is_complete():
    root = PROJECT / "assets/batches-21-demo"
    report = json.loads((PROJECT / "data/processed/batches-21-demo.json").read_text())
    assert report["status"] == "requires_further_validation"
    assert report["total_sequences"] == report["completed_sequences"] == 21
    assert report["input_fasta_sha256"] == module.digest(root / "sequences.fasta")
    assert report["workflow_sha256"] == module.digest(
        PROJECT / "tests/fixtures/docking-provenance/fasta-batches.py.txt"
    )
    assert [row["input_count"] for row in report["batches"]] == [20, 1]
    for row in report["batches"]:
        folder = root / f"batch-{row['batch']:06d}"
        assert row["input_sha256"] == module.digest(folder / "input.fasta")
        assert row["report_sha256"] == module.digest(folder / "docking/report.json")
        docking = json.loads((folder / "docking/report.json").read_text())
        assert len(docking["candidates"]) == row["input_count"]
        for candidate in docking["candidates"]:
            assert candidate["poses_sha256"] == module.digest(
                folder / "docking" / candidate["sequence"] / "poses.pdbqt"
            )


def test_batch_stops_and_preserves_child_when_pose_has_no_close_contact(tmp_path, monkeypatch):
    source = tmp_path / "input.fasta"
    source.write_text(">sample\nAC\n")
    target = tmp_path / "target.pdb"
    target.write_text("target")
    out = tmp_path / "run"
    monkeypatch.setattr(sys, "argv", args_for(source, target, out))

    def fake_child(command, **kwargs):
        destination = Path(command[command.index("--output-dir") + 1])
        (destination / "AC").mkdir(parents=True)
        (destination / "AC/poses.pdbqt").write_text("original pose")
        (destination / "report.json").write_text(
            json.dumps({"status": "contains_poses_without_close_contact", "candidates": []})
        )
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    monkeypatch.setattr(module.subprocess, "run", fake_child)
    with pytest.raises(SystemExit):
        module.main()
    report = json.loads((out / "batch-workflow.json").read_text())
    assert report["status"] == "failed"
    assert "without close heavy-atom contact" in report["error"]
    assert report["batches"][0]["report_sha256"]
    assert (out / "batch-000001/docking/AC/poses.pdbqt").read_text() == "original pose"
