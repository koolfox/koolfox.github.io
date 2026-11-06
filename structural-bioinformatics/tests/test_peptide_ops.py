"""Workflow failure must stop before the next stage and leave an audit trail."""

import json
import subprocess
import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def test_invalid_reference_region_stops_before_docking(tmp_path):
    out = tmp_path / "run"
    command = [
        sys.executable,
        str(PROJECT / "scripts/run_peptide_ops.py"),
        "--drug-pdb",
        str(PROJECT / "assets/3wd5.pdb"),
        "--drug-chain",
        "H",
        "--start",
        "999",
        "--end",
        "1000",
        "--position",
        "1",
        "--target-pdb",
        str(PROJECT / "assets/course/gromacs/1ubq-protein.pdb"),
        "--target-chain",
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
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    assert result.returncode != 0
    report = json.loads((out / "workflow.json").read_text())
    assert report["status"] == "failed"
    assert report["steps"] == [{"step": "candidate_generation", "status": "failed", "exit_code": 1}]
    assert "outside observed chain" in (out / "candidate_generation.stderr.txt").read_text()
    assert not (out / "docking").exists()


def test_real_recorded_workflow_chain_is_traceable():
    import hashlib

    root = PROJECT / "assets/peptide-ops-batched-demo"
    report = json.loads((PROJECT / "data/processed/peptide-ops-demo.json").read_text())
    assert report["status"] == "requires_further_validation"
    assert (
        report["workflow_sha256"]
        == hashlib.sha256(
            (PROJECT / "tests/fixtures/docking-provenance/peptide-ops.py.txt").read_bytes()
        ).hexdigest()
    )
    html = (root / "report.html").read_text()
    assert "گزارش آزمایش پپتید" in html
    assert '<bdi dir="ltr">-' in html
    assert [step["status"] for step in report["steps"]] == [
        "sequences_generated",
        "requires_further_validation",
    ]
    for step in report["steps"]:
        assert hashlib.sha256((root / step["artifact"]).read_bytes()).hexdigest() == step["sha256"]
    candidates = json.loads((root / "candidates/manifest.json").read_text())
    batches = json.loads((root / "docking/batch-workflow.json").read_text())
    assert candidates["fasta_sha256"] == batches["input_fasta_sha256"]
    assert [b["input_count"] for b in batches["batches"]] == [2, 2, 1]
    outputs = []
    for b in batches["batches"]:
        file = root / "docking" / f"batch-{b['batch']:06d}" / "docking/report.json"
        assert hashlib.sha256(file.read_bytes()).hexdigest() == b["report_sha256"]
        outputs.extend(json.loads(file.read_text())["candidates"])
    assert [(r["id"], r["sequence"]) for r in candidates["candidates"]] == [
        (r["input_id"], r["sequence"]) for r in outputs
    ]


def test_interrupted_stage_is_not_recorded_as_success(tmp_path, monkeypatch):
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "peptide_ops", PROJECT / "scripts/run_peptide_ops.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    out = tmp_path / "interrupted"
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "run_peptide_ops.py",
            "--drug-pdb",
            str(PROJECT / "assets/3wd5.pdb"),
            "--drug-chain",
            "H",
            "--start",
            "2",
            "--end",
            "3",
            "--position",
            "1",
            "--target-pdb",
            str(PROJECT / "assets/course/gromacs/1ubq-protein.pdb"),
            "--target-chain",
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
        ],
    )

    def interrupt(*args, **kwargs):
        raise KeyboardInterrupt

    monkeypatch.setattr(module.subprocess, "run", interrupt)
    import pytest

    with pytest.raises(SystemExit) as result:
        module.main()
    assert result.value.code == 130
    report = json.loads((out / "workflow.json").read_text())
    assert report["status"] == "interrupted"
    assert report["steps"][-1]["status"] == "interrupted"
