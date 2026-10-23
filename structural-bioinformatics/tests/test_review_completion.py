"""Protect the finished teaching package, real independent check and full slide ledger."""

import hashlib
import json
import re
from pathlib import Path

import pytest

PROJECT = Path(__file__).resolve().parents[1]


def record(path):
    return json.loads((PROJECT / path).read_text())


def test_old_completion_is_explicitly_a_superseded_historical_snapshot():
    completion = record("data/metadata/review-completion.json")
    assert completion["status"] == "superseded_editorial_snapshot"
    assert (PROJECT / completion["superseded_by"]).is_file()
    assert "historical" in completion["supersession_reason"]
    # Historical hashes must not force future teaching content to remain unchanged.
    for item in completion["required_outputs"] + completion["document_inventory"]:
        assert (PROJECT / item["path"]).is_file()


def test_surface_control_conserves_area_and_checks_both_implementations_and_algorithms():
    result = record("data/processed/surface-crosscheck.json")
    for key, path in (
        ("input_sha256", "assets/3wd5.pdb"),
        ("generator_sha256", "scripts/crosscheck_surface.py"),
        ("reference_sha256", "data/processed/full-epitope.json"),
    ):
        assert (
            result["provenance"][key] == hashlib.sha256((PROJECT / path).read_bytes()).hexdigest()
        )
    assert result["software"]["freesasa"] == "2.2.1"
    assert set(result["results"]) == {"shrake_rupley", "lee_richards"}
    for method in result["results"].values():
        assert method["trimer"]["target_atom_count"] == 3 * method["deposited"]["target_atom_count"]
        for calculation in method.values():
            total = calculation["total_delta_sasa_angstrom2"]
            assert total == pytest.approx(
                calculation["isolated_target_angstrom2"]
                + calculation["isolated_fab_angstrom2"]
                - calculation["complex_angstrom2"],
                abs=2e-6,
            )
            assert calculation["half_delta_sasa_angstrom2"] * 2 == pytest.approx(total, abs=2e-6)
            assert abs(calculation["separated_total_delta_sasa_angstrom2"]) < 1e-6
            # A numerical comparison tolerance, not a biological uncertainty interval.
            assert abs(calculation["relative_difference_from_biopython"]) < 0.005
        assert (
            method["trimer"]["total_delta_sasa_angstrom2"]
            > method["deposited"]["total_delta_sasa_angstrom2"]
        )


def test_every_slide_content_block_has_an_explicit_audit_record():
    text = (PROJECT / "docs/class-presentation.fa.md").read_text()
    expected = []
    for chapter, body in enumerate(re.split(r"^## .*$", text, flags=re.M)[1:], 1):
        expected.extend((chapter, p.strip()) for p in body.strip().split("\n\n") if p.strip())
    blocks = record("data/metadata/scientific-claim-audit.json")["blocks"]
    assert [(r["chapter"], r["exact_text"]) for r in blocks] == expected
    assert len({r["id"] for r in blocks}) == len(blocks)
    ledger = record("data/metadata/scientific-claim-audit.json")
    sources = {r["id"] for r in ledger["sources"] + ledger["additional_primary_sources"]}
    assert all(set(r.get("source_ids", [])) <= sources for r in blocks)


def test_handout_is_from_the_current_markdown_and_method_reference_checks_are_resolved():
    handout = record("data/metadata/preparation-guide-datasets.json")["handout"]
    for kind in ("source", "pdf", "export_script"):
        assert (
            hashlib.sha256((PROJECT / handout[f"{kind}_path"]).read_bytes()).hexdigest()
            == handout[f"{kind}_sha256"]
        )
    for reference in record("data/metadata/method-reference-review.json")["records"]:
        assert reference["status"] == "match"
        assert reference["observed_doi"].lower() == reference["expected_doi"].lower()
    search = record("data/metadata/final-literature-search.json")
    controls = {q["id"]: q for q in search["queries"] if q["id"].startswith("known_")}
    assert set(controls) == {"known_hu_control", "known_ubah_control"}
    assert all(q["hit_count"] == 1 for q in controls.values())
