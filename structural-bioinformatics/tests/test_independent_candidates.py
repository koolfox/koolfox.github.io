import hashlib
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace

import pytest

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "independent_candidates", PROJECT / "scripts/run_independent_candidates.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_failure_does_not_drop_later_candidates_and_reports_are_traceable(tmp_path):
    fasta, pdb = tmp_path / "input.fasta", tmp_path / "target.pdb"
    fasta.write_text(">first\nAC\n>second\nAR\n>third\nAC\n")
    pdb.write_text("test receptor\n")
    pdb_hash = hashlib.sha256(pdb.read_bytes()).hexdigest()
    calls = []

    def runner(cmd, **_kwargs):
        sequence = cmd[cmd.index("--sequence") + 1]
        folder = Path(cmd[cmd.index("--output-dir") + 1])
        folder.mkdir()
        calls.append(sequence)
        if len(calls) == 1:
            child = {"status": "failed", "error": "clash", "candidates": []}
            code = 1
        elif len(calls) == 2:
            child = {
                "status": "requires_further_validation",
                "input": {"source_sha256": pdb_hash},
                "candidates": [{"sequence": sequence, "status": "requires_further_validation"}],
            }
            code = 0
        else:
            return SimpleNamespace(returncode=1, stdout="", stderr="failed")
        (folder / "report.json").write_text(json.dumps(child))
        return SimpleNamespace(returncode=code, stdout="", stderr="")

    output = tmp_path / "run"
    result = module.run(fasta, pdb, "A", [1, 2, 3], [10, 10, 10], "prep", "vina", output, runner)
    assert calls == ["AC", "AR", "AC"]
    assert result["status"] == "completed_with_failures"
    assert [r["status"] for r in result["candidates"]] == [
        "failed",
        "requires_further_validation",
        "failed",
    ]
    assert result["candidates"][0]["error"] == "clash"
    assert result["candidates"][2]["error"] == "No child report was produced"
    assert result == json.loads((output / "independent-candidates.json").read_text())


def test_preflight_rejects_duplicate_id_without_creating_output(tmp_path):
    fasta, pdb, output = tmp_path / "bad.fasta", tmp_path / "target.pdb", tmp_path / "run"
    fasta.write_text(">same\nAC\n>same\nAR\n")
    pdb.write_text("test receptor\n")
    with pytest.raises(ValueError, match="duplicate FASTA ID"):
        module.run(fasta, pdb, "A", [1, 2, 3], [10, 10, 10], "prep", "vina", output)
    assert not output.exists()


def test_interrupted_candidate_is_recorded_without_marking_later_as_complete(tmp_path):
    fasta, pdb = tmp_path / "input.fasta", tmp_path / "target.pdb"
    fasta.write_text(">first\nAC\n>later\nAR\n")
    pdb.write_text("test receptor\n")

    def interrupt(*_args, **_kwargs):
        raise KeyboardInterrupt

    output = tmp_path / "run"
    with pytest.raises(KeyboardInterrupt):
        module.run(fasta, pdb, "A", [1, 2, 3], [10, 10, 10], "prep", "vina", output, interrupt)
    result = json.loads((output / "independent-candidates.json").read_text())
    assert result["status"] == "interrupted"
    assert [(r["input_id"], r["status"]) for r in result["candidates"]] == [
        ("first", "interrupted")
    ]
    assert result["total"] == 2


def test_recorded_vina_run_preserves_failed_and_later_completed_candidate():
    root = PROJECT / "assets/independent-candidate-demo"
    manifest = json.loads((root / "manifest.json").read_text())
    summary = json.loads((root / "independent-candidates.json").read_text())
    assert summary["status"] == "completed_with_failures" and summary["total"] == 2
    assert summary["input_fasta_sha256"] == module.digest(root / "input.fasta")
    assert summary["target_pdb_sha256"] == module.digest(root / "target.pdb")
    for path, expected in manifest["files"].items():
        assert module.digest(root / path) == expected
    first, second = summary["candidates"]
    assert (first["sequence"], first["status"], first["exit_code"]) == ("VQLVESGG", "failed", 1)
    assert "clash" in first["error"]
    assert (second["sequence"], second["status"], second["exit_code"]) == (
        "AC",
        "requires_further_validation",
        0,
    )
    for row in (first, second):
        child = root / row["report_path"]
        assert module.digest(child) == row["report_sha256"]
    report = json.loads((root / second["report_path"]).read_text())
    assert (
        module.digest(root / "candidate-000002/AC/poses.pdbqt")
        == report["candidates"][0]["poses_sha256"]
    )
