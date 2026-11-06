"""Exercise separation of model observations and reference outcomes."""

import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
RUN = ROOT / "assets/independent-candidate-demo"
CASES = ROOT / "assets/agent-case-example"
SCRIPT = ROOT / "scripts/export_agent_observations.py"


def invoke(run_dir, output):
    return subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--run-dir",
            str(run_dir),
            "--cases-dir",
            str(CASES),
            "--output-dir",
            str(output),
        ],
        capture_output=True,
        text=True,
        check=False,
    )


def test_real_run_exports_only_observable_fields(tmp_path):
    output = tmp_path / "observations"
    result = invoke(RUN, output)
    assert result.returncode == 0, result.stderr
    observations = [
        json.loads(line) for line in (output / "observations.jsonl").read_text().splitlines()
    ]
    assert len(observations) == 2
    assert [row["process_exit_code"] for row in observations] == [1, 0]
    assert all(
        set(row)
        == {
            "case_id",
            "candidate_sequence",
            "process_exit_code",
            "child_report_present_and_verified",
            "failure_detail_recorded",
        }
        for row in observations
    )
    assert not (output / "cases.jsonl").exists()
    assert json.loads((output / "manifest.json").read_text())["count"] == 2
    assert invoke(RUN, output).returncode != 0


def test_modified_report_is_rejected_without_output(tmp_path):
    fake = tmp_path / "run"
    fake.mkdir()
    (fake / "independent-candidates.json").write_bytes(
        (RUN / "independent-candidates.json").read_bytes() + b" "
    )
    output = tmp_path / "output"
    assert invoke(fake, output).returncode != 0
    assert not output.exists()


@pytest.mark.parametrize("exit_code", [0, None])
def test_failed_case_with_zero_or_unknown_exit_is_preserved(tmp_path, exit_code):
    run_dir = tmp_path / "run"
    shutil.copytree(RUN, run_dir)
    source_path = run_dir / "independent-candidates.json"
    source = json.loads(source_path.read_text())
    source["candidates"][0]["exit_code"] = exit_code
    source_path.write_text(json.dumps(source))
    source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
    cases_dir = tmp_path / "cases"
    shutil.copytree(CASES, cases_dir)
    cases_path = cases_dir / "cases.jsonl"
    cases = [json.loads(line) for line in cases_path.read_text().splitlines()]
    for index, case in enumerate(cases, 1):
        case["case_id"] = f"{source_hash[:16]}-{index:06d}"
    cases_path.write_text("".join(json.dumps(case) + "\n" for case in cases))
    manifest_path = cases_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["source_report_sha256"] = source_hash
    manifest["cases_sha256"] = hashlib.sha256(cases_path.read_bytes()).hexdigest()
    manifest_path.write_text(json.dumps(manifest))
    output = tmp_path / "out"
    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--run-dir",
            str(run_dir),
            "--cases-dir",
            str(cases_dir),
            "--output-dir",
            str(output),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    observation = json.loads((output / "observations.jsonl").read_text().splitlines()[0])
    assert observation["process_exit_code"] == exit_code
    assert observation["failure_detail_recorded"] is True
