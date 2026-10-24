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
        for section in config["sections"]:
            assert f'href="{section["page"]}"' in source
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
