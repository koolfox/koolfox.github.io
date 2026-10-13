"""Check scientific denominator/pairing invariants and the current claim ledger."""

import gzip
import hashlib
import importlib.util
import json
from pathlib import Path

import pytest

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "inspect_counts", PROJECT / "scripts/inspect_top2a_counts.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_count_inspection_maps_samples_and_uses_whole_library(tmp_path):
    counts = tmp_path / "counts.gz"
    with gzip.open(counts, "wt") as handle:
        handle.write(
            "gene_id\tgene_name\tSH14181_SA2\tSH14181_SA1\n"
            "ENSG00000131747\tTOP2A\t20\t10\n"
            "other\tOTHER\t80\t90\n"
        )
    metadata = tmp_path / "metadata.soft"
    metadata.write_text(
        "^SAMPLE = GSM1\n!Sample_characteristics_ch1 = treatment: IgG1+IgG1\n"
        "!Sample_characteristics_ch1 = batch: Donor A\n!Sample_title = SH14181_SA1\n"
        "^SAMPLE = GSM2\n!Sample_characteristics_ch1 = treatment: Ada + IgG1\n"
        "!Sample_characteristics_ch1 = batch: Donor A\n!Sample_title = SH14181_SA2\n"
    )
    result = module.inspect_counts(counts, metadata)
    pair = result["donor_pairs"][0]
    assert pair["control_cpm"] == 100_000
    assert pair["adalimumab_cpm"] == 200_000
    assert pair["ratio"] == 2
    metadata.write_text(metadata.read_text().replace("SH14181_SA2", "SH14181_SA9"))
    with pytest.raises(ValueError, match="do not agree"):
        module.inspect_counts(counts, metadata)


def test_curated_pilot_is_four_donors_and_traceable_to_current_code():
    pilot = json.loads((PROJECT / "data/processed/top2a-count-inspection.json").read_text())
    assert len(pilot["selected_libraries"]) == 8
    assert len({s["accession"] for s in pilot["selected_libraries"]}) == 8
    assert len(pilot["donor_pairs"]) == 4
    assert pilot["status"] == "descriptive_only_not_differential_expression"
    for record in pilot["selected_libraries"]:
        assert record["cpm"] == pytest.approx(
            record["estimated_count"] / record["library_estimated_count_sum"] * 1e6
        )
    assert (
        pilot["provenance"]["script_sha256"]
        == hashlib.sha256((PROJECT / "scripts/inspect_top2a_counts.py").read_bytes()).hexdigest()
    )
    assert (
        pilot["figure"]["sha256"]
        == hashlib.sha256((PROJECT / "assets/top2a-paired-cpm.png").read_bytes()).hexdigest()
    )


def test_claim_audit_matches_current_presentation_and_all_chapters():
    ledger = json.loads((PROJECT / "data/metadata/scientific-claim-audit.json").read_text())
    source = (PROJECT / ledger["reviewed_file"]).read_bytes()
    assert ledger["reviewed_sha256"] == hashlib.sha256(source).hexdigest()
    assert {b["chapter"] for b in ledger["blocks"]} == set(range(1, 24))
    for block in ledger["blocks"]:
        assert block["exact_text"] in source.decode()
