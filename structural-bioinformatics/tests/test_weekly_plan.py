"""One active chapter map replaces the superseded parallel study/week routes."""

import importlib.util
import json
import re
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
MAP = json.loads((PROJECT / "data/metadata/course-map.json").read_text())


def load_script(name):
    spec = importlib.util.spec_from_file_location(name, PROJECT / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_every_topic_and_live_tool_has_one_syllabus_owner():
    syllabus = json.loads((PROJECT / "data/metadata/course-syllabus.json").read_text())
    topics = json.loads((PROJECT / "data/metadata/learning-course.json").read_text())["sessions"]
    assert [c["block"] for c in MAP["chapters"]] == [b["id"] for b in syllabus["blocks"]]
    assert [c["unit"] for c in MAP["chapters"]] == list(range(1, 10))
    owners = [tool for c in MAP["chapters"] for tool in c["tools"]]
    assert len(owners) == len(set(owners)) == len(MAP["tools"])
    for tool in MAP["tools"]:
        assert tool["id"] in MAP["chapters"][tool["unit"] - 1]["tools"]
    assert all(sum(t["block"] == c["block"] for c in MAP["chapters"]) == 1 for t in topics)


def test_every_document_is_chapter_scoped_or_an_explicit_retired_alias():
    reader = (PROJECT / "assets/markdown-reader.js").read_text()
    assigned = {name for c in MAP["chapters"] for name in c["documents"]}
    files = {p.name for p in (PROJECT / "docs").glob("*.md") if p.name != "surface-brief.md"}
    assert assigned | set(MAP["document_aliases"]) == files
    for name in assigned:
        assert f'"{name}"' in reader
    assert not assigned & set(MAP["document_aliases"])


def test_every_audited_slide_is_assigned_once_and_preserved_in_generated_chapter_reader():
    source = (PROJECT / "docs/class-presentation.fa.md").read_text()
    numbers = [n for c in MAP["chapters"] for n in c["slides"] + c["supplementary_slides"]]
    assert sorted(numbers) == list(range(1, len(re.findall(r"^## ", source, re.M)) + 1))
    generated = load_script("build_chapter_presentation").render(PROJECT)
    assert (PROJECT / "docs/chapter-presentation.fa.md").read_text() == generated
    assert len(re.findall(r"^## ", generated, re.M)) == 9
    for section in re.split(r"^## .*$", source, flags=re.M)[1:]:
        assert section.strip() in generated


def test_sections_replace_the_embedded_workspace_without_a_second_course():
    index = (PROJECT / "index.html").read_text()
    course = (PROJECT / "course.html").read_text()
    assert 'id="sessions"' in course and 'id="sessions"' not in index
    assert 'id="research-tabs"' not in index + course
    assert "legacy-routes.js" in index
    assert (PROJECT / "docs/weekly-plan.fa.md").read_text() == load_script(
        "build_weekly_plan"
    ).render()
    for filename in ("weekly-plan.json", "learning-journey.json"):
        old = json.loads((PROJECT / "data/metadata/archive" / filename).read_text())
        assert old["status"] == "superseded_by_single_chapter_course"
