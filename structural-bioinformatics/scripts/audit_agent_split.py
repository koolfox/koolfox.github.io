"""Detect exact-identity leaks in a proposed agent dataset split; offline only."""

import argparse
import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path

SPLITS = {"train", "validation", "test"}
HASH_FIELDS = (
    "target_pdb_sha256",
    "antibody_source_sha256",
    "input_fasta_sha256",
    "source_run_sha256",
)
GROUP_FIELDS = (*HASH_FIELDS, "candidate_sequence", "antibody_seed")


def audit(path):
    data = Path(path).read_bytes()
    records = []
    for number, line in enumerate(data.splitlines(), 1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except ValueError as exc:
            raise ValueError(f"Invalid JSON at line {number}") from exc
        if not isinstance(row, dict):
            raise ValueError(f"Expected object at line {number}")
        records.append(row)
    if not records:
        raise ValueError("No records")
    seen_ids = set()
    groups = {field: defaultdict(set) for field in GROUP_FIELDS}
    counts = dict.fromkeys(sorted(SPLITS), 0)
    for row in records:
        case_id, split = row.get("case_id"), row.get("dataset_split")
        if not isinstance(case_id, str) or not case_id or case_id in seen_ids:
            raise ValueError("Missing or duplicate case_id")
        if not isinstance(split, str) or split not in SPLITS:
            raise ValueError(f"Case {case_id}: split must be train, validation or test")
        seen_ids.add(case_id)
        counts[split] += 1
        for field in HASH_FIELDS:
            if not isinstance(row.get(field), str) or not re.fullmatch(r"[0-9a-f]{64}", row[field]):
                raise ValueError(f"Case {case_id}: missing or invalid {field}")
        for field in ("candidate_sequence", "antibody_seed"):
            if not isinstance(row.get(field), str) or not re.fullmatch(
                r"[ACDEFGHIKLMNPQRSTVWY]+", row[field]
            ):
                raise ValueError(f"Case {case_id}: missing or invalid {field}")
        for field in GROUP_FIELDS:
            groups[field][row[field]].add(split)
    leaks = {
        field: sum(len(splits) > 1 for splits in values.values())
        for field, values in groups.items()
    }
    missing_splits = [split for split, count in counts.items() if not count]
    return {
        "schema_version": 1,
        "input_sha256": hashlib.sha256(data).hexdigest(),
        "counts": counts,
        "cross_split_exact_identity_groups": leaks,
        "missing_splits": missing_splits,
        "exact_identity_check_passed": not any(leaks.values()) and not missing_splits,
        "training_ready": False,
        "limitations": "Exact identity only; source truth, homologs, similarity, family leakage, "
        "pretraining contamination, independent labels and sufficient sample size are not checked.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    args = parser.parse_args()
    try:
        report = audit(args.input)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        if not report["exact_identity_check_passed"]:
            raise SystemExit(1)
    except (OSError, ValueError) as exc:
        parser.exit(2, f"Split audit rejected: {exc}\n")


if __name__ == "__main__":
    main()
