import importlib.util
import json
import shutil
from pathlib import Path

import pytest

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "export_run_cases", PROJECT / "scripts/export_run_cases.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_real_mixed_run_exports_audit_cases_without_biological_labels(tmp_path):
    source = PROJECT / "assets/independent-candidate-demo"
    output = tmp_path / "cases"
    manifest = module.export(source, output)
    rows = [json.loads(line) for line in (output / "cases.jsonl").read_text().splitlines()]
    assert manifest["case_count"] == 2 and manifest["unprocessed_count"] == 0
    assert manifest["source_status"] == "completed_with_failures"
    assert manifest["cases_sha256"] == module.sha(output / "cases.jsonl")
    assert [row["execution_status"] for row in rows] == ["failed", "requires_further_validation"]
    assert [row["candidate_sequence"] for row in rows] == ["VQLVESGG", "AC"]
    assert all(row["biological_binding_label"] is None for row in rows)
    assert all(row["measured_affinity"] is None for row in rows)
    assert all(row["dataset_split"] == "unassigned" for row in rows)
    assert all(row["antibody_source_sha256"] is None for row in rows)
    assert len({row["case_id"] for row in rows}) == 2


def test_tampered_child_report_rejected_without_output(tmp_path):
    root = tmp_path / "source"
    shutil.copytree(PROJECT / "assets/independent-candidate-demo", root)
    (root / "candidate-000002/report.json").write_text("{}")
    output = tmp_path / "output"
    with pytest.raises(ValueError, match="recorded hash"):
        module.export(root, output)
    assert not output.exists()


def test_running_aggregate_is_not_exported_as_complete(tmp_path):
    root = tmp_path / "run"
    root.mkdir()
    (root / "independent-candidates.json").write_text('{"status":"running"}')
    with pytest.raises(ValueError, match="terminal state"):
        module.export(root, tmp_path / "output")
    assert not (tmp_path / "output").exists()


def test_interrupted_run_preserves_unprocessed_count_without_inventing_cases(tmp_path):
    root = tmp_path / "source"
    root.mkdir()
    report = {
        "status": "interrupted",
        "total": 2,
        "target_pdb_sha256": "a" * 64,
        "input_fasta_sha256": "b" * 64,
        "candidates": [{"index": 1, "sequence": "AC", "status": "interrupted"}],
    }
    (root / "independent-candidates.json").write_text(json.dumps(report))
    manifest = module.export(root, tmp_path / "out")
    assert manifest["case_count"] == 1
    assert manifest["unprocessed_count"] == 1
    row = json.loads((tmp_path / "out/cases.jsonl").read_text())
    assert row["execution_status"] == "interrupted"
    assert row["child_report_sha256"] is None
    assert row["biological_binding_label"] is None


def test_published_example_matches_fresh_deterministic_projection(tmp_path):
    published = PROJECT / "assets/agent-case-example"
    manifest = json.loads((published / "manifest.json").read_text())
    new = tmp_path / "new"
    module.export(PROJECT / "assets/independent-candidate-demo", new)
    assert (published / "cases.jsonl").read_bytes() == (new / "cases.jsonl").read_bytes()
    assert manifest["cases_sha256"] == module.sha(published / "cases.jsonl")
    assert manifest["exporter_sha256"] == module.sha(PROJECT / "scripts/export_run_cases.py")


def test_changed_completed_pose_is_rejected_before_writing_output(tmp_path):
    root = tmp_path / "source"
    shutil.copytree(PROJECT / "assets/independent-candidate-demo", root)
    (root / "candidate-000002/AC/poses.pdbqt").write_text("not a pose")
    output = tmp_path / "out"
    with pytest.raises(ValueError, match="pose file"):
        module.export(root, output)
    assert not output.exists()
