"""Offline checks for execution-only agent evaluation."""

import importlib.util
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "agent_evaluator", ROOT / "scripts/evaluate_agent_cases.py"
)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
CASES = ROOT / "assets/agent-case-example"


def responses(tmp_path, rows):
    path = tmp_path / "responses.jsonl"
    path.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
    return path


def answer(index, status, claim="unknown"):
    cases = MODULE.read_jsonl((CASES / "cases.jsonl").read_bytes())
    return {"case_id": cases[index]["case_id"], "execution_status": status, "binding_claim": claim}


def test_correct_execution_interpretation(tmp_path):
    rows = [answer(0, "failed"), answer(1, "requires_further_validation")]
    report = MODULE.evaluate(CASES, responses(tmp_path, rows))
    assert (report["cases"], report["answered"], report["correct_statuses"]) == (2, 2, 2)
    assert report["coverage"] == report["status_accuracy_all_cases"] == 1
    assert report["unsupported_binding_claim_case_ids"] == []


def test_missing_case_and_unsupported_negative_claim(tmp_path):
    row = answer(0, "failed", "does_not_bind")
    report = MODULE.evaluate(CASES, responses(tmp_path, [row]))
    assert report["coverage"] == report["status_accuracy_all_cases"] == 0.5
    assert report["status_accuracy_answered"] == 1
    assert report["unsupported_binding_claim_case_ids"] == [row["case_id"]]
    assert report["missing_case_ids"] == [answer(1, "unknown")["case_id"]]


def test_empty_answers_are_not_imputed(tmp_path):
    report = MODULE.evaluate(CASES, responses(tmp_path, []))
    assert report["coverage"] == 0
    assert report["status_accuracy_all_cases"] == 0
    assert report["status_accuracy_answered"] is None


@pytest.mark.parametrize("kind", ["duplicate", "unknown", "bad_status", "extra_field"])
def test_invalid_responses_fail(tmp_path, kind):
    row = answer(0, "failed")
    rows = [row]
    if kind == "duplicate":
        rows.append(row)
    elif kind == "unknown":
        row["case_id"] = "unknown"
    elif kind == "bad_status":
        row["execution_status"] = "success"
    else:
        row["explanation"] = "extra"
    with pytest.raises(ValueError):
        MODULE.evaluate(CASES, responses(tmp_path, rows))


def test_tampered_cases_rejected(tmp_path):
    source = tmp_path / "source"
    source.mkdir()
    (source / "manifest.json").write_bytes((CASES / "manifest.json").read_bytes())
    (source / "cases.jsonl").write_bytes((CASES / "cases.jsonl").read_bytes() + b" ")
    with pytest.raises(ValueError, match="SHA-256"):
        MODULE.evaluate(source, responses(tmp_path, []))
