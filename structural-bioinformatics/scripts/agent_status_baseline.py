#!/usr/bin/env python3
"""Conservative deterministic interpretation of verified execution observations."""

import argparse
import hashlib
import json
from pathlib import Path

from evaluate_agent_cases import read_jsonl

FIELDS = {
    "case_id",
    "candidate_sequence",
    "process_exit_code",
    "child_report_present_and_verified",
    "failure_detail_recorded",
}


def predict(observations_dir):
    directory = Path(observations_dir)
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    payload = (directory / "observations.jsonl").read_bytes()
    if (
        not isinstance(manifest, dict)
        or type(manifest.get("schema_version")) is not int
        or manifest["schema_version"] != 1
        or manifest.get("observations_sha256") != hashlib.sha256(payload).hexdigest()
    ):
        raise ValueError("Invalid observation manifest or SHA-256")
    records = read_jsonl(payload)
    if type(manifest.get("count")) is not int or manifest["count"] != len(records):
        raise ValueError("Observation count does not match")
    seen = set()
    responses = []
    for record in records:
        case_id = record.get("case_id")
        if (
            set(record) != FIELDS
            or not isinstance(case_id, str)
            or not case_id
            or case_id in seen
            or not isinstance(record["candidate_sequence"], str)
            or not record["candidate_sequence"]
            or (
                record["process_exit_code"] is not None
                and type(record["process_exit_code"]) is not int
            )
            or type(record["child_report_present_and_verified"]) is not bool
            or type(record["failure_detail_recorded"]) is not bool
        ):
            raise ValueError("Invalid observation fields or duplicate case ID")
        seen.add(case_id)
        responses.append(
            {
                "case_id": case_id,
                "execution_status": "unknown",
                "binding_claim": "unknown",
            }
        )
    return responses


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--observations-dir", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    try:
        responses = predict(args.observations_dir)
        payload = "".join(json.dumps(row, sort_keys=True) + "\n" for row in responses)
        with args.output.open("x", encoding="utf-8") as output:
            output.write(payload)
    except (OSError, ValueError, TypeError) as exc:
        parser.exit(2, f"Baseline rejected: {exc}\n")


if __name__ == "__main__":
    main()
