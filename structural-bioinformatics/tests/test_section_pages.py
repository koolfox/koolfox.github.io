"""Publication and content boundaries for the independent project sections."""

import importlib.util
import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def builder():
    spec = importlib.util.spec_from_file_location(
        "section_builder", PROJECT / "scripts/build_section_pages.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_published_pages_match_their_content_fragments_and_navigation():
    config = json.loads((PROJECT / "data/metadata/site-sections.json").read_text())
    pages = builder().render_pages(PROJECT)
    assert len(config["sections"]) == 9
    assert len(pages) == 10
    for name, source in pages.items():
        assert (PROJECT / name).read_text() == source + "\n"
        primary = source.split('id="section-nav"', 1)[1].split("</nav>", 1)[0]
        assert primary.count("<a ") == 2
        for area in config["areas"]:
            assert f'href="{area["page"]}"' in primary
        assert 'id="research-tabs"' not in source
        assert 'id="chapter-context"' not in source
    assert 'id="sessions"' not in pages["index.html"]
    assert 'id="quiz-form"' not in pages["course.html"]
    assert 'id="molecular-stage"' not in pages["research.html"]
    assert 'id="molecular-stage"' in pages["structures.html"]
    assert 'id="datasets-table"' in pages["datasets.html"]
    assert 'id="docking-validation"' in pages["docking.html"]
    assert 'id="epitope-lab"' in pages["exercises.html"]
    assert 'id="epitope-lab"' not in pages["structures.html"]


def test_topic_sources_separate_lessons_practice_research_and_speaker_notes():
    course = json.loads((PROJECT / "data/metadata/learning-course.json").read_text())
    for topic in course["sessions"]:
        paths = [topic[k] for k in ("path", "exercise_path", "research_path", "presentation_path")]
        assert len(set(paths)) == 4
        for path in paths:
            text = (PROJECT / path).read_text()
            assert text.strip()
            assert "<!-- course:" not in text
        lesson = (PROJECT / topic["path"]).read_text()
        assert "کار این فصل در مقاله" not in lesson
        assert "## یادداشت ارائه" not in lesson


def test_general_education_is_independent_and_keeps_official_chapter_order():
    import hashlib

    course = json.loads((PROJECT / "data/metadata/learning-course.json").read_text())
    syllabus = json.loads((PROJECT / "data/metadata/course-syllabus.json").read_text())
    provenance = json.loads(
        (PROJECT / "data/metadata/education-content-provenance.json").read_text()
    )
    assert [*dict.fromkeys(t["block"] for t in course["sessions"])] == [
        b["id"] for b in syllabus["blocks"]
    ]
    assert all("project_use" not in b and "weeks" not in b for b in syllabus["blocks"])
    for topic, record in zip(course["sessions"], provenance["lessons"], strict=True):
        text = (PROJECT / topic["path"]).read_text()
        assert not any(name in text for name in ("آدالیموماب", "TOP2A", "3WD5", "Bianchi", "Hu"))
        assert "## مثال آموزشی" in text and "## خودآزمایی" in text
        assert (
            hashlib.sha256((PROJECT / topic["path"]).read_bytes()).hexdigest() == record["sha256"]
        )
        assert (PROJECT / topic["case_lesson_path"]).is_file()


def test_parallel_research_applications_are_explicit_and_optional():
    mapping = json.loads((PROJECT / "data/metadata/education-research-map.json").read_text())
    syllabus = json.loads((PROJECT / "data/metadata/course-syllabus.json").read_text())
    config = json.loads((PROJECT / "data/metadata/site-sections.json").read_text())
    assert [a["id"] for a in config["areas"]] == ["education", "research"]
    assert [a["chapter"] for a in mapping["chapters"]] == [b["title"] for b in syllabus["blocks"]]
    assert next(s["area"] for s in config["sections"] if s["id"] == "docking") == "education"
    for row in mapping["chapters"]:
        assert row["application"] and row["output"]
        assert all((PROJECT / "docs" / d["file"]).is_file() for d in row["reading"])
