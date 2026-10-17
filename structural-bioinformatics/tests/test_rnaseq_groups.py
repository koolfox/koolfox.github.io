"""The published RNA-seq summary holds only group aggregates from the recorded GEO files."""

import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
SUMMARY = json.loads((PROJECT / "data/processed/rnaseq-group-summary.json").read_text())
RECORD = json.loads((PROJECT / "data/metadata/ra-rnaseq-learning.json").read_text())


def test_summary_comes_from_the_recorded_downloads():
    recorded = {Path(item["url"]).name: item["sha256"] for item in RECORD["provenance"]}
    assert SUMMARY["inputs"] == recorded
    assert SUMMARY["accession"] == RECORD["accession"] == "GSE138746"


def test_only_group_aggregates_are_published():
    expected_n = RECORD["PBMC_normalized_matrix"]["ADA_response_labels"]
    assert sum(expected_n.values()) == RECORD["PBMC_normalized_matrix"]["ADA_columns"]
    for gene in SUMMARY["genes"]:
        assert gene["ensembl_gene_id"].startswith("ENSG")
        assert set(gene["groups"]) == set(expected_n)
        for response, group in gene["groups"].items():
            # No per-participant values, extremes or identifiers: four numbers per group.
            assert set(group) == {"n", "q1", "median", "q3"}
            assert group["n"] == expected_n[response] >= 5
            assert 0 <= group["q1"] <= group["median"] <= group["q3"]
    text = json.dumps(SUMMARY)
    for forbidden in ("PBMC_A_", "BIO-20", "studysubjectid", "p_value", "fold_change"):
        assert forbidden not in text
