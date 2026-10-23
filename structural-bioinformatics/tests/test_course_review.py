"""Curriculum routing, generated lessons and explicit provenance boundaries."""

import importlib.util
import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def read(name):
    return json.loads((PROJECT / "data/metadata" / name).read_text())


def test_thirty_sessions_follow_exact_syllabus_ranges_and_resolve_sources():
    sessions = read("course-sessions.json")["sessions"]
    blocks = read("course-syllabus.json")["blocks"]
    sources = {row["id"] for row in read("review-sources.json")["sources"]}
    assert [row["session"] for row in sessions] == list(range(1, 31))
    for block in blocks:
        actual = [row["session"] for row in sessions if row["block"] == block["id"]]
        assert actual == list(range(block["first_session"], block["last_session"] + 1))
    for row in sessions:
        assert set(row["sources"]) <= sources
        assert all(
            row[field].strip()
            for field in (
                "question",
                "lesson",
                "exercise",
                "deliverable",
                "worked_example",
                "self_check",
                "answer",
            )
        )


def test_published_course_lessons_match_their_editable_source():
    spec = importlib.util.spec_from_file_location(
        "course_renderer", PROJECT / "scripts/build_course_sessions.py"
    )
    renderer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(renderer)
    assert (PROJECT / "docs/course-sessions.fa.md").read_text() == renderer.render(PROJECT)


def test_hu_identity_and_printed_kinetic_anomalies_remain_explicit():
    record = read("hu-2013-mutations.json")
    assert "23943614" in json.dumps(record)
    assert "23904290" not in json.dumps(record)
    rows = {row["label"]: row for row in record["table_3"]["rows"]}
    p113 = rows["TNF P113A"]
    assert p113["kd_as_printed"] == 1394.0
    assert p113["kd"] == 0.001394
    v91 = rows["TNF V91A"]
    assert abs(v91["kd"] / v91["ka"] - v91["KD"]) / v91["KD"] > 0.2
    assert "V91A" in json.dumps(record["table_3"]["internal_consistency_audit"])


def test_review_destinations_exist_and_are_registered():
    registry = (PROJECT / "assets/markdown-reader.js").read_text()
    for slug in ("course-guide", "course-sessions", "rnaseq-research-plan", "comprehensive-review"):
        assert (PROJECT / f"docs/{slug}.fa.md").is_file()
        assert slug in registry


def test_reference_identity_review_covers_current_literature_pairs():
    expected = set()

    def walk(value):
        if isinstance(value, dict):
            if value.get("pmid") and value.get("doi"):
                expected.add((str(value["pmid"]), value["doi"].lower()))
            for nested in value.values():
                walk(nested)
        elif isinstance(value, list):
            for nested in value:
                walk(nested)

    walk(read("literature.json"))
    records = read("reference-identity-review.json")["records"]
    assert {(row["pmid"], row["expected_doi"].lower()) for row in records} == expected
    for row in records:
        assert row["status"] == "match"
        assert row["expected_doi"].lower() == row["observed_doi"].lower()
        assert len(row["sha256"]) == 64
