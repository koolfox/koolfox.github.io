"""Exact overlap detection is not a substitute for homology-aware splits."""

import importlib.util
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("split_audit", ROOT / "scripts/audit_agent_split.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def sample():
    rows = []
    for idx, split in enumerate(("train", "validation", "test")):
        rows.append(
            {
                "case_id": f"case-{idx}",
                "dataset_split": split,
                "target_pdb_sha256": f"{idx + 1:064x}",
                "antibody_source_sha256": f"{idx + 4:064x}",
                "input_fasta_sha256": f"{idx + 7:064x}",
                "source_run_sha256": f"{idx + 10:064x}",
                "candidate_sequence": ["AA", "AC", "AD"][idx],
                "antibody_seed": ["CE", "CF", "CG"][idx],
            }
        )
    return rows


def write(tmp_path, rows):
    path = tmp_path / "cases.jsonl"
    path.write_text("".join(json.dumps(row) + "\n" for row in rows))
    return path


def test_disjoint_exact_groups_do_not_certify_training(tmp_path):
    report = MODULE.audit(write(tmp_path, sample()))
    assert report["exact_identity_check_passed"]
    assert report["training_ready"] is False
    assert "homologs" in report["limitations"]


@pytest.mark.parametrize("field", MODULE.GROUP_FIELDS)
def test_cross_split_identity_is_flagged(tmp_path, field):
    rows = sample()
    rows[1][field] = rows[0][field]
    report = MODULE.audit(write(tmp_path, rows))
    assert report["cross_split_exact_identity_groups"][field] == 1
    assert not report["exact_identity_check_passed"]


def test_missing_lineage_is_rejected_and_empty_test_reported(tmp_path):
    rows = sample()
    rows[0]["antibody_source_sha256"] = None
    with pytest.raises(ValueError, match="antibody_source_sha256"):
        MODULE.audit(write(tmp_path, rows))
    report = MODULE.audit(write(tmp_path, sample()[:2]))
    assert report["missing_splits"] == ["test"]
    assert not report["exact_identity_check_passed"]


def test_duplicate_id_or_unassigned_split_is_rejected(tmp_path):
    rows = sample()
    rows[1]["case_id"] = rows[0]["case_id"]
    with pytest.raises(ValueError, match="duplicate"):
        MODULE.audit(write(tmp_path, rows))
    rows = sample()
    rows[0]["dataset_split"] = "unassigned"
    with pytest.raises(ValueError, match="split"):
        MODULE.audit(write(tmp_path, rows))
