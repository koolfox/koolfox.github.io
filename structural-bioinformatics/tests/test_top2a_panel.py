"""Check donor pairing, whole-library normalization and limits of the RNA follow-up."""

import gzip
import hashlib
import importlib.util
import json
from pathlib import Path

import pytest

PROJECT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("panel", PROJECT / "scripts/inspect_top2a_panel.py")
PANEL = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PANEL)


def selection():
    return [
        {"column": col, "batch": donor, "treatment": treatment}
        for col, donor, treatment in (
            ("c1", "one", PANEL.CONTROL),
            ("d1", "one", PANEL.DRUG),
            ("c2", "two", PANEL.CONTROL),
            ("d2", "two", PANEL.DRUG),
        )
    ]


def write_counts(path, target):
    with gzip.open(path, "wt") as f:
        f.write("gene_id\tgene_name\tc1\td1\tc2\td2\n")
        f.write("target\tTOP2A\t" + "\t".join(map(str, target)) + "\n")
        f.write("other\tOTHER\t90\t190\t80\t90\n")


def test_normalization_uses_background_and_pairs_before_summarizing(tmp_path):
    path = tmp_path / "counts.gz"
    write_counts(path, [10, 10, 20, 10])
    r = PANEL.inspect_panel(path, selection(), ("TOP2A",))
    assert r["biological_donors"] == 2
    assert r["selected_libraries"] == 4
    assert r["panel"][0]["median_paired_cpm_ratio"] == pytest.approx(0.5)
    assert r["panel"][0]["lower_cpm_pairs"] == 2
    wrong = selection()
    wrong[1]["treatment"] = "Ada + Dapiro"
    with pytest.raises(ValueError, match="matched control"):
        PANEL.inspect_panel(path, wrong, ("TOP2A",))


def test_zero_ratios_are_not_hidden_with_a_pseudocount(tmp_path):
    path = tmp_path / "counts.gz"
    write_counts(path, [0, 1, 2, 0])
    row = PANEL.inspect_panel(path, selection(), ("TOP2A",))["panel"][0]
    assert row["valid_ratio_pairs"] == 1
    assert row["valid_log_ratio_pairs"] == 0
    assert row["median_paired_log2_cpm_ratio"] is None


def test_published_panel_is_traceable_and_does_not_claim_inference():
    data = json.loads((PROJECT / "data/processed/top2a-panel-inspection.json").read_text())
    assert data["status"] == "descriptive_only_not_differential_expression"
    assert data["biological_donors"] == 4 and data["matrix_libraries"] == 64
    assert {r["gene"] for r in data["panel"]} == set(PANEL.PANEL)
    assert (
        data["provenance"]["script_sha256"]
        == hashlib.sha256((PROJECT / "scripts/inspect_top2a_panel.py").read_bytes()).hexdigest()
    )
    pilot = json.loads((PROJECT / "data/processed/top2a-count-inspection.json").read_text())
    expected = sorted(p["ratio"] for p in pilot["donor_pairs"])
    row = next(r for r in data["panel"] if r["gene"] == "TOP2A")
    assert row["median_paired_cpm_ratio"] == pytest.approx((expected[1] + expected[2]) / 2)
    for r in data["panel"]:
        for name in ("survey-draft.fa.md", "top2a-count-inspection.fa.md"):
            assert f"{r['median_paired_cpm_ratio']:.3f}" in (PROJECT / "docs" / name).read_text()
