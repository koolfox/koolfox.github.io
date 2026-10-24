"""The study argument must connect real study roles to the existing syllabus."""

import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads((PROJECT / path).read_text())


def test_scope_and_study_roles_agree_across_the_actual_entry_points():
    thread = read("data/metadata/research-thread.json")
    design = thread["study_design"]
    evidence = read("data/processed/survey-evidence.json")
    assert set(design["core_studies"]).isdisjoint(design["context_studies"])
    for role in ("core", "context"):
        assert {s["study_id"] for s in evidence["studies"] if s["question_role"] == role} == set(
            design[role + "_studies"]
        )
    for name in (
        "index.html",
        "docs/research-questions.fa.md",
        "docs/survey-protocol.fa.md",
        "docs/course-guide.fa.md",
        "docs/survey-draft.fa.md",
        "docs/paper-writing-guide.fa.md",
        "docs/class-presentation.fa.md",
    ):
        assert design["question"] in (PROJECT / name).read_text()


def test_chapter_arguments_are_available_in_lessons_and_have_a_writing_output():
    thread = read("data/metadata/research-thread.json")
    assert [a["unit"] for a in thread["chapter_arguments"]] == list(range(1, 10))
    book = (PROJECT / "docs/course-sessions.fa.md").read_text()
    for argument in thread["chapter_arguments"]:
        # The printed book introduces the chapter argument once, not once per topic.
        assert book.count(argument["explanation"]) == 1
        assert argument["manuscript"]
    for step in thread["steps"]:
        argument = thread["chapter_arguments"][step["unit"] - 1]
        text = (PROJECT / f"docs/course/session-{step['topic']:02}.fa.md").read_text()
        assert argument["explanation"] in text
        assert argument["presentation"] in text


def test_active_question_data_is_in_the_default_chapter_presentations():
    mapping = read("data/metadata/course-map.json")["chapters"]
    thread = read("data/metadata/research-thread.json")
    assert {33, 34} <= set(mapping[1]["slides"])
    assert {36, 38} <= set(mapping[3]["slides"])
    assert {36, 38} <= set(thread["steps"][12]["slides"])
