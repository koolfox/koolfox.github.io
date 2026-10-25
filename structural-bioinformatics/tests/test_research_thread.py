"""Keep the teaching-to-research-to-presentation chain traceable and complete."""

import json
import re
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def read(name):
    return json.loads((PROJECT / "data/metadata" / name).read_text())


def test_every_topic_has_a_concrete_research_step_and_valid_evidence_paths():
    course = read("learning-course.json")
    mapping = read("course-map.json")
    thread = read("research-thread.json")
    assert thread["question"] != course["question"]
    assert course["research_question_file"] == "data/metadata/research-thread.json"
    assert [s["topic"] for s in thread["steps"]] == [t["session"] for t in course["sessions"]]
    sources = {s["id"] for s in read("review-sources.json")["sources"]}
    for step in thread["steps"]:
        chapter = mapping["chapters"][step["unit"] - 1]
        assert set(step["slides"]) <= set(chapter["slides"] + chapter["supplementary_slides"])
        assert set(step["documents"]) <= set(chapter["documents"])
        if step["tool"]:
            assert step["tool"] in chapter["tools"]
        assert step["evidence_status"] in thread["status_labels"]
        assert set(step["source_ids"]) <= sources
        for path in step["source_paths"]:
            assert (PROJECT / path).is_file()
        lesson = (PROJECT / course["sessions"][step["topic"] - 1]["case_lesson_path"]).read_text()
        assert step["teaching_point"] in lesson
        assert len(step["terms"]) >= 3 and len(step["actions"]) >= 3
        assert all(
            step[field]
            for field in (
                "question",
                "connection",
                "output",
                "speaker_notes",
                "result",
                "next_step",
                "previous_gain",
            )
        )


def test_numeric_bridge_examples_match_existing_recorded_results():
    steps = {s["topic"]: s for s in read("research-thread.json")["steps"]}
    controls = json.loads((PROJECT / "data/processed/course-lab-controls.json").read_text())
    assert controls["translation_control"]["ca_count"] == 152
    assert "۱۵۲" in steps[8]["result"]
    mutations = json.loads((PROJECT / "data/processed/hu-mutation-comparison.json").read_text())
    q21 = next(m for m in mutations["comparison"] if m["mutant"] == "TNF Q21A")
    assert round(q21["authors_kd_fold_change_vs_wild_type"]) == 203
    assert "۲۰۳" in steps[18]["result"]
    assert steps[20]["evidence_status"] == "existing_toy_only"
    assert steps[28]["evidence_status"] == "proposal"
    assert steps[30]["evidence_status"] == "survey_in_progress"


def test_printable_textbook_has_nine_chapters_and_no_research_phases():
    text = (PROJECT / "docs/course-sessions.fa.md").read_text()
    assert len(re.findall(r"^## ", text, re.M)) == 9
    assert "<!-- course:" not in text
    assert "#### کار این فصل در مقاله" not in text
    assert "#### یادداشت ارائه" not in text
