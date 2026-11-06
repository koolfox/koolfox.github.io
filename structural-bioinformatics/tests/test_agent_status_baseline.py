"""The status baseline must not turn incomplete evidence into a success claim."""

import hashlib
import importlib.util
import json
import sys
from pathlib import Path

import pytest

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT / "scripts"))
spec = importlib.util.spec_from_file_location(
    "agent_status_baseline", PROJECT / "scripts/agent_status_baseline.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def fixture(path, rows):
    payload = "".join(json.dumps(row) + "\n" for row in rows).encode()
    (path / "observations.jsonl").write_bytes(payload)
    (path / "manifest.json").write_text(
        json.dumps(
            {
                "schema_version": 1,
                "count": len(rows),
                "observations_sha256": hashlib.sha256(payload).hexdigest(),
            }
        )
    )


def observation(case_id="case-1", **changes):
    row = {
        "case_id": case_id,
        "candidate_sequence": "ACD",
        "process_exit_code": 0,
        "child_report_present_and_verified": True,
        "failure_detail_recorded": False,
    }
    row.update(changes)
    return row


def test_observations_do_not_distinguish_statuses(tmp_path):
    fixture(tmp_path, [observation(), observation("case-2", failure_detail_recorded=True)])
    assert module.predict(tmp_path) == [
        {"case_id": "case-1", "execution_status": "unknown", "binding_claim": "unknown"},
        {"case_id": "case-2", "execution_status": "unknown", "binding_claim": "unknown"},
    ]


@pytest.mark.parametrize(
    "rows",
    [
        [observation(), observation()],
        [observation(process_exit_code=True)],
        [observation(failure_detail_recorded=1)],
        [observation(candidate_sequence="")],
        [observation(unexpected="secret")],
    ],
)
def test_rejects_ambiguous_or_invalid_observations(tmp_path, rows):
    fixture(tmp_path, rows)
    with pytest.raises(ValueError):
        module.predict(tmp_path)


def test_rejects_changed_observations(tmp_path):
    fixture(tmp_path, [observation()])
    (tmp_path / "observations.jsonl").write_text("{}\n")
    with pytest.raises(ValueError, match="SHA-256"):
        module.predict(tmp_path)
