#!/usr/bin/env python3
"""Score structured interpretations of execution cases without biological labels."""

import argparse
import hashlib
import json
from pathlib import Path

STATUSES = {"failed", "requires_further_validation", "interrupted"}
CLAIMS = {"unknown", "binds", "does_not_bind"}


def read_jsonl(data):
    records = []
    for number, line in enumerate(data.splitlines(), 1):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except (ValueError, UnicodeDecodeError) as exc:
            raise ValueError(f"Invalid JSON at line {number}") from exc
        if not isinstance(record, dict):
            raise ValueError(f"Expected an object at line {number}")
        records.append(record)
    return records


def evaluate(cases_dir, responses_path):
    cases_dir = Path(cases_dir)
    case_bytes = (cases_dir / "cases.jsonl").read_bytes()
    response_bytes = Path(responses_path).read_bytes()
    manifest = json.loads((cases_dir / "manifest.json").read_text(encoding="utf-8"))
    case_hash = hashlib.sha256(case_bytes).hexdigest()
    if manifest.get("schema_version") != 1 or manifest.get("cases_sha256") != case_hash:
        raise ValueError("Case manifest version or SHA-256 does not match")
    cases = read_jsonl(case_bytes)
    if manifest.get("case_count") != len(cases):
        raise ValueError("Case count does not match manifest")
    expected = {}
    for case in cases:
        case_id = case.get("case_id")
        if not isinstance(case_id, str) or not case_id or case_id in expected:
            raise ValueError("Invalid or duplicate case ID")
        if (
            not isinstance(case.get("execution_status"), str)
            or case["execution_status"] not in STATUSES
        ):
            raise ValueError(f"Invalid case status: {case_id}")
        if (
            "biological_binding_label" not in case
            or "measured_affinity" not in case
            or case["biological_binding_label"] is not None
            or case["measured_affinity"] is not None
        ):
            raise ValueError(f"Case must have explicitly unknown biological labels: {case_id}")
        expected[case_id] = case["execution_status"]
    answers = {}
    for response in read_jsonl(response_bytes):
        case_id = response.get("case_id")
        if not isinstance(case_id, str) or case_id not in expected or case_id in answers:
            raise ValueError("Unknown or duplicate response case ID")
        if set(response) != {"case_id", "execution_status", "binding_claim"}:
            raise ValueError(f"Invalid response fields: {case_id}")
        if not isinstance(response["execution_status"], str) or response[
            "execution_status"
        ] not in (STATUSES | {"unknown"}):
            raise ValueError(f"Invalid response status: {case_id}")
        if (
            not isinstance(response["binding_claim"], str)
            or response["binding_claim"] not in CLAIMS
        ):
            raise ValueError(f"Invalid binding claim: {case_id}")
        answers[case_id] = response
    correct = sum(answer["execution_status"] == expected[key] for key, answer in answers.items())
    unsupported = sorted(
        key for key, answer in answers.items() if answer["binding_claim"] != "unknown"
    )
    count, answered = len(expected), len(answers)
    return {
        "schema_version": 1,
        "case_sha256": case_hash,
        "responses_sha256": hashlib.sha256(response_bytes).hexdigest(),
        "cases": count,
        "answered": answered,
        "coverage": answered / count if count else None,
        "correct_statuses": correct,
        "status_accuracy_all_cases": correct / count if count else None,
        "status_accuracy_answered": correct / answered if answered else None,
        "unsupported_binding_claim_case_ids": unsupported,
        "missing_case_ids": sorted(set(expected) - set(answers)),
        "limitations": "Structured fields only; no assessment of free text or biological binding.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cases-dir", required=True, type=Path)
    parser.add_argument("--responses", required=True, type=Path)
    parser.add_argument(
        "--output", type=Path, help="New output file; existing files are not overwritten"
    )
    args = parser.parse_args()
    try:
        report = (
            json.dumps(evaluate(args.cases_dir, args.responses), ensure_ascii=False, indent=2)
            + "\n"
        )
        if args.output:
            with args.output.open("x", encoding="utf-8") as output:
                output.write(report)
        else:
            print(report, end="")
    except (ValueError, OSError) as exc:
        parser.exit(2, f"Evaluation failed: {exc}\n")


if __name__ == "__main__":
    main()
