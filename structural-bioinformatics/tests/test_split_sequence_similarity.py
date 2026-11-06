"""Optional positional-identity warning is conservative, capped and fails closed."""

import importlib.util
import json
import math
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "split_audit_similarity", ROOT / "scripts/audit_agent_split.py"
)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def rows_for(spec):
    rows = []
    for idx, (split, sequence) in enumerate(spec):
        rows.append(
            {
                "case_id": f"case-{idx}",
                "dataset_split": split,
                "target_pdb_sha256": f"{idx + 1:064x}",
                "antibody_source_sha256": f"{idx + 4:064x}",
                "input_fasta_sha256": f"{idx + 7:064x}",
                "source_run_sha256": f"{idx + 10:064x}",
                "candidate_sequence": sequence,
                "antibody_seed": ["CE", "CF", "CG", "CH", "CI", "CK"][idx % 6],
            }
        )
    return rows


def write(tmp_path, rows):
    path = tmp_path / "cases.jsonl"
    path.write_text("".join(json.dumps(row) + "\n" for row in rows))
    return path


def test_threshold_flags_at_or_above_and_not_below(tmp_path):
    rows = rows_for(
        [
            ("train", "AAAAAA"),
            ("validation", "AAAAAC"),
            ("test", "CCCCCC"),
        ]
    )
    path = write(tmp_path, rows)
    flagged = MODULE.audit(path, similarity_threshold=5 / 6)
    section = flagged["pairwise_sequence_similarity"]
    assert section["metric"] == "positional_identity"
    assert section["comparisons"] == 3
    assert section["violating_cross_split_pairs"] == 1
    pair = section["violating_pairs"][0]
    assert pair["sequence_a"] == "AAAAAA" and pair["sequence_b"] == "AAAAAC"
    assert pair["positional_identity"] == pytest.approx(5 / 6)
    assert not section["similarity_warning_check_passed"]
    clean = MODULE.audit(path, similarity_threshold=0.9)
    assert clean["pairwise_sequence_similarity"]["violating_cross_split_pairs"] == 0
    assert clean["pairwise_sequence_similarity"]["similarity_warning_check_passed"]


def test_only_same_length_across_different_splits_are_compared(tmp_path):
    rows = rows_for(
        [
            ("train", "AAAA"),
            ("validation", "AAAA"),
            ("train", "CCCC"),
            ("train", "AA"),
            ("validation", "AA"),
            ("test", "AAAAAA"),
        ]
    )
    section = MODULE.audit(write(tmp_path, rows), similarity_threshold=1.0)[
        "pairwise_sequence_similarity"
    ]
    assert section["comparisons"] == 3
    assert section["violating_cross_split_pairs"] == 2
    assert {(pair["sequence_a"], pair["sequence_b"]) for pair in section["violating_pairs"]} == {
        ("AA", "AA"),
        ("AAAA", "AAAA"),
    }


@pytest.mark.parametrize("threshold", [-0.1, 1.1, float("nan"), float("inf"), True])
def test_invalid_threshold_is_rejected(tmp_path, threshold):
    path = write(tmp_path, rows_for([("train", "AA"), ("validation", "AC")]))
    with pytest.raises(ValueError, match="threshold must be a number between 0 and 1"):
        MODULE.audit(path, similarity_threshold=threshold)


def test_comparison_cap_fails_explicitly_without_skipping(tmp_path):
    rows = rows_for(
        [
            ("train", "AA"),
            ("validation", "AC"),
            ("test", "AD"),
        ]
    )
    path = write(tmp_path, rows)
    with pytest.raises(ValueError, match="Comparison cap exceeded"):
        MODULE.audit(path, similarity_threshold=0.5, max_comparisons=2)
    section = MODULE.audit(path, similarity_threshold=0.5, max_comparisons=3)[
        "pairwise_sequence_similarity"
    ]
    assert section["comparisons"] == 3


def test_missing_sequence_or_split_fails_closed_even_with_threshold(tmp_path):
    rows = rows_for([("train", "AA"), ("validation", "AC")])
    del rows[1]["candidate_sequence"]
    with pytest.raises(ValueError, match="candidate_sequence"):
        MODULE.audit(write(tmp_path, rows), similarity_threshold=0.5)
    rows = rows_for([("train", "AA"), ("validation", "AC")])
    del rows[1]["dataset_split"]
    with pytest.raises(ValueError, match="split must be train, validation or test"):
        MODULE.audit(write(tmp_path, rows), similarity_threshold=0.5)


def test_default_behavior_is_unchanged(tmp_path):
    path = write(tmp_path, rows_for([("train", "AAAA"), ("validation", "CCCC"), ("test", "GGGG")]))
    report = MODULE.audit(path)
    schema_version_1_keys = {
        "schema_version",
        "input_sha256",
        "counts",
        "cross_split_exact_identity_groups",
        "missing_splits",
        "exact_identity_check_passed",
        "training_ready",
        "limitations",
    }
    assert set(report) == schema_version_1_keys
    assert report["exact_identity_check_passed"]
    assert report["training_ready"] is False
    report_one = MODULE.audit(path, similarity_threshold=1.0)
    assert report_one["pairwise_sequence_similarity"]["max_comparisons"] == 100_000


def test_threshold_zero_flags_every_compared_pair(tmp_path):
    rows = rows_for([("train", "AAAA"), ("validation", "CCCC")])
    section = MODULE.audit(write(tmp_path, rows), similarity_threshold=0.0)[
        "pairwise_sequence_similarity"
    ]
    assert section["comparisons"] == 1
    assert section["violating_cross_split_pairs"] == 1
    assert section["violating_pairs"][0]["positional_identity"] == 0.0


def test_cli_exit_codes_for_warning_rejection_and_invalid_threshold(tmp_path):
    path = write(tmp_path, rows_for([("train", "AAAA"), ("validation", "AAAC"), ("test", "GGGG")]))
    script = str(ROOT / "scripts/audit_agent_split.py")
    warned = subprocess.run(
        [sys.executable, script, "--input", str(path), "--similarity-threshold", "0.75"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert warned.returncode == 1
    payload = json.loads(warned.stdout)
    assert payload["pairwise_sequence_similarity"]["violating_cross_split_pairs"] == 1
    rejected = subprocess.run(
        [sys.executable, script, "--input", str(path), "--similarity-threshold", "2"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert rejected.returncode == 2
    assert "Split audit rejected" in rejected.stderr
    default = subprocess.run(
        [sys.executable, script, "--input", str(path)],
        capture_output=True,
        text=True,
        check=False,
    )
    assert default.returncode == 0
    assert "pairwise_sequence_similarity" not in json.loads(default.stdout)


def test_non_finite_threshold_reaches_cli_guard(tmp_path):
    path = write(tmp_path, rows_for([("train", "AA"), ("validation", "AC")]))
    with pytest.raises(ValueError, match="threshold must be a number between 0 and 1"):
        MODULE.audit(path, similarity_threshold=math.nan)


def test_cap_applies_before_same_split_quadratic_work(tmp_path):
    rows = rows_for([("train", "AAAA"), ("train", "AAAC"), ("train", "AAAD")])
    with pytest.raises(ValueError, match="Comparison cap exceeded"):
        MODULE.audit(write(tmp_path, rows), similarity_threshold=0.5, max_comparisons=2)
