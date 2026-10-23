"""The week-by-week class plan stays consistent with its sources and generated document."""

import importlib.util
import json
import re
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "build_weekly_plan", PROJECT / "scripts/build_weekly_plan.py"
)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
PLAN = json.loads((PROJECT / "data/metadata/weekly-plan.json").read_text())
SYLLABUS = json.loads((PROJECT / "data/metadata/course-syllabus.json").read_text())


def chapter_count(document):
    text = (PROJECT / "docs" / document).read_text()
    return sum(1 for line in text.splitlines() if line.startswith("## "))


def test_generated_document_matches_plan():
    expected = builder.render(PLAN, builder.slide_titles(PROJECT), SYLLABUS)
    assert (PROJECT / "docs/weekly-plan.fa.md").read_text() == expected
    # One chapter per week, then the appendix and the closing note, so chapter-N is week N.
    assert chapter_count("weekly-plan.fa.md") == len(PLAN["weeks"]) + 2


def test_weeks_are_ordered_and_reference_existing_content():
    assert [w["week"] for w in PLAN["weeks"]] == list(range(1, len(PLAN["weeks"]) + 1))
    slides = len(builder.slide_titles(PROJECT))
    index = (PROJECT / "index.html").read_text()
    reader = (PROJECT / "assets/markdown-reader.js").read_text()
    assert '"weekly-plan.fa.md"' in reader
    covered = set()
    for week in PLAN["weeks"]:
        assert week["chapters"] == sorted(week["chapters"])
        assert all(1 <= c <= slides for c in week["chapters"])
        covered.update(week["chapters"])
        for item in week["reading"]:
            assert f'"{item["document"]}"' in reader
            if item["chapter"] != "intro":
                number = int(item["chapter"].removeprefix("chapter-"))
                assert 1 <= number <= chapter_count(item["document"])
        tab, section = re.fullmatch(r"\?tab=(\w+)#([\w-]+)", week["experiment"]["href"]).groups()
        assert f'id="panel-{tab}"' in index and f'id="{section}"' in index
        # The section must sit inside the named tab panel.
        panel = index.index(f'id="panel-{tab}"')
        following = [
            index.find(f'id="panel-{t}"', panel + 1)
            for t in ("basics", "lab", "sequences", "literature", "methods", "reading")
        ]
        end = min([p for p in following if p > panel], default=len(index))
        assert panel < index.index(f'id="{section}"') < end
    # Every research slide is presented in some week or kept in the optional appendix.
    appendix = set(PLAN["appendix"]["chapters"])
    assert covered | appendix == set(range(1, slides + 1))
    # The appendix holds the material that is outside this course's syllabus.
    assert appendix == set(SYLLABUS["outside_syllabus"]["chapters"])
    assert not appendix & covered


def test_every_week_builds_the_survey_from_an_existing_protocol_or_draft_section():
    assert PLAN["paper_goal"]["document"] == "survey-draft.fa.md"
    for week in PLAN["weeks"]:
        paper = week["manuscript"]
        assert paper["document"] in {"survey-protocol.fa.md", "survey-draft.fa.md"}
        sections = chapter_count(paper["document"])
        assert 1 <= int(paper["chapter"].removeprefix("chapter-")) <= sections
        assert paper["task"] and paper["output"] and paper["done_when"]
    assert PLAN["weeks"][-1]["manuscript"]["chapter"] == "chapter-1"


def test_each_week_follows_the_course_syllabus():
    blocks = {block["id"]: block for block in SYLLABUS["blocks"]}
    assert sum(block["sessions"] for block in SYLLABUS["blocks"]) == SYLLABUS["total_sessions"]
    reached = 0
    for week in PLAN["weeks"]:
        course = week["course"]
        assert course["blocks"]
        first = min(block["first_session"] for block in course["blocks"])
        # A week may not present material the class has not reached yet.
        assert first >= reached
        reached = first
        for entry in course["blocks"]:
            block = blocks[entry["id"]]
            # The plan repeats the outline, so it must repeat it exactly.
            assert entry["title"] == block["title"]
            assert entry["first_session"] == block["first_session"]
            assert entry["last_session"] == block["last_session"]
            assert week["week"] in block["weeks"]
        assert week["papers"] is not None and week["concepts"] and week["talk"]
        assert week["expect_questions"]
    # Every syllabus block is claimed by the week it was assigned to.
    for block in SYLLABUS["blocks"]:
        for number in block["weeks"]:
            assert PLAN["weeks"][number - 1]["week"] == number
            assert block["id"] in [
                entry["id"] for entry in PLAN["weeks"][number - 1]["course"]["blocks"]
            ]


def test_the_plan_covers_every_syllabus_topic():
    legend = PLAN["coverage_legend"]
    blocks = {block["id"]: block for block in SYLLABUS["blocks"]}
    seen = {}
    for week in PLAN["weeks"]:
        week_blocks = [entry["id"] for entry in week["course"]["blocks"]]
        for entry in week["course"]["topics"]:
            assert entry["status"] in legend
            assert entry["note"].strip()
            assert entry["block"] in week_blocks
            # The topic wording is the syllabus wording, not a paraphrase.
            assert entry["topic"] in blocks[entry["block"]]["topics"]
            assert entry["topic"] not in seen
            seen[entry["topic"]] = (week["week"], entry["status"])
    # Every topic of the syllabus is covered exactly once.
    syllabus_topics = [topic for block in SYLLABUS["blocks"] for topic in block["topics"]]
    assert sorted(seen) == sorted(syllabus_topics)
    # A topic is only claimed as covered in the week that teaches its block.
    for block in SYLLABUS["blocks"]:
        for topic in block["topics"]:
            assert seen[topic][0] in block["weeks"]


def test_quoted_rnaseq_medians_match_the_published_summary():
    summary = json.loads((PROJECT / "data/processed/rnaseq-group-summary.json").read_text())
    tnf = next(g for g in summary["genes"] if g["symbol"] == "TNF")["groups"]
    expect = PLAN["appendix"]["items"][0]["experiment"]["expect"]
    for response in ("good", "moderate", "no"):
        value = f"{tnf[response]['median']:g}".replace(".", "٫")
        assert builder.fa(value) in expect
        assert builder.fa(tnf[response]["n"]) in expect
