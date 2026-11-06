"""Detect exact-identity leaks in a proposed agent dataset split; offline only."""

import argparse
import hashlib
import json
import math
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
DEFAULT_MAX_COMPARISONS = 100_000


def positional_identity(sequence_a, sequence_b):
    """Fraction of positions with identical residues; not an alignment score."""
    if not sequence_a or len(sequence_a) != len(sequence_b):
        raise ValueError("Positional identity requires non-empty sequences of equal length")
    return sum(a == b for a, b in zip(sequence_a, sequence_b, strict=True)) / len(sequence_a)


def pairwise_sequence_similarity(records, threshold, max_comparisons):
    """Optional conservative warning over same-length candidate_sequence cross-split pairs."""
    if isinstance(threshold, bool) or not isinstance(threshold, (int, float)):
        raise ValueError("similarity threshold must be a number between 0 and 1")
    threshold = float(threshold)
    if not math.isfinite(threshold) or not 0.0 <= threshold <= 1.0:
        raise ValueError("similarity threshold must be a number between 0 and 1")
    if isinstance(max_comparisons, bool) or not isinstance(max_comparisons, int):
        raise ValueError("max_comparisons must be a non-negative integer")
    if max_comparisons < 0:
        raise ValueError("max_comparisons must be a non-negative integer")
    sequence_splits = defaultdict(set)
    for row in records:
        sequence = row.get("candidate_sequence")
        split = row.get("dataset_split")
        if not isinstance(sequence, str) or not sequence:
            raise ValueError("Missing candidate_sequence; pairwise similarity fails closed")
        if split not in SPLITS:
            raise ValueError("Missing or invalid dataset_split; pairwise similarity fails closed")
        sequence_splits[sequence].add(split)
    unique_sequences = sorted(sequence_splits)
    by_length = defaultdict(list)
    for sequence in unique_sequences:
        by_length[len(sequence)].append(sequence)
    # Refuse before constructing or walking a quadratic pair list. The bound is
    # conservative: same-split pairs are included in the budget estimate.
    inspected_bound = sum(
        len(bucket) * (len(bucket) - 1) // 2
        + sum(len(sequence_splits[sequence]) > 1 for sequence in bucket)
        for bucket in by_length.values()
    )
    if inspected_bound > max_comparisons:
        raise ValueError(
            f"Comparison cap exceeded: conservative bound {inspected_bound} exceeds "
            f"max_comparisons={max_comparisons}"
        )
    comparisons = 0
    violations = []
    for length in sorted(by_length):
        bucket = by_length[length]
        for i, sequence_a in enumerate(bucket):
            splits_a = sequence_splits[sequence_a]
            start = i if len(splits_a) > 1 else i + 1
            for sequence_b in bucket[start:]:
                splits_b = sequence_splits[sequence_b]
                if not any(split_a != split_b for split_a in splits_a for split_b in splits_b):
                    continue
                comparisons += 1
                identity = positional_identity(sequence_a, sequence_b)
                if identity >= threshold:
                    violations.append(
                        {
                            "sequence_a": sequence_a,
                            "sequence_b": sequence_b,
                            "splits_a": sorted(splits_a),
                            "splits_b": sorted(splits_b),
                            "positional_identity": identity,
                        }
                    )
    return {
        "metric": "positional_identity",
        "pair_unit": "distinct sequence values, including the same value across splits",
        "limitations": "Same-length positions only; no gaps, variable-length comparisons, "
        "homology, structural similarity or biological independence are assessed.",
        "threshold": threshold,
        "max_comparisons": max_comparisons,
        "comparisons": comparisons,
        "conservative_pair_bound": inspected_bound,
        "violating_cross_split_pairs": len(violations),
        "violating_pairs": violations,
        "status": "no_comparable_pairs"
        if not comparisons
        else "warnings"
        if violations
        else "no_warnings",
        "similarity_warning_check_passed": bool(comparisons) and not violations,
    }


def audit(path, similarity_threshold=None, max_comparisons=DEFAULT_MAX_COMPARISONS):
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
    report = {
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
    if similarity_threshold is not None:
        similarity = pairwise_sequence_similarity(records, similarity_threshold, max_comparisons)
        report["pairwise_sequence_similarity"] = similarity
        if not similarity["similarity_warning_check_passed"]:
            report["limitations"] += (
                " Positional identity warnings found; same-length positional identity is a "
                "warning only, not alignment or homology screening."
            )
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument(
        "--similarity-threshold",
        type=float,
        default=None,
        help="Optional: flag same-length cross-split candidate_sequence pairs whose "
        "positional identity is at or above this value (0..1); not alignment or homology.",
    )
    parser.add_argument(
        "--max-comparisons",
        type=int,
        default=DEFAULT_MAX_COMPARISONS,
        help="Maximum conservative bound on same-length sequence-pair candidates; larger bounds "
        "fail before comparison. Includes same-split pairs.",
    )
    args = parser.parse_args()
    try:
        report = audit(args.input, args.similarity_threshold, args.max_comparisons)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        section = report.get("pairwise_sequence_similarity")
        failed = not report["exact_identity_check_passed"] or (
            section is not None and not section["similarity_warning_check_passed"]
        )
        if failed:
            raise SystemExit(1)
    except (OSError, ValueError) as exc:
        parser.exit(2, f"Split audit rejected: {exc}\n")


if __name__ == "__main__":
    main()
