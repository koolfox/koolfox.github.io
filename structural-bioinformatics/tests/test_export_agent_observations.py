"""Exercise separation of model observations and reference outcomes."""

import json
import subprocess
import sys
from pathlib import Path

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
