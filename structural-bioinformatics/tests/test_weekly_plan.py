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


def chapter_count(document):
    text = (PROJECT / "docs" / document).read_text()
    return sum(1 for line in text.splitlines() if line.startswith("## "))


def test_generated_document_matches_plan():
    expected = builder.render(PLAN, builder.slide_titles(PROJECT))
    assert (PROJECT / "docs/weekly-plan.fa.md").read_text() == expected
    # One chapter per week plus the closing note, so reader chapter-N is week N.
    assert chapter_count("weekly-plan.fa.md") == len(PLAN["weeks"]) + 1


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
    # Every research slide is presented in some week.
    assert covered == set(range(1, slides + 1))


def test_every_week_writes_an_existing_manuscript_section():
    assert PLAN["paper_goal"]["document"] == "manuscript-draft.fa.md"
    sections = chapter_count("manuscript-draft.fa.md")
    for week in PLAN["weeks"]:
        paper = week["manuscript"]
        assert paper["document"] == "manuscript-draft.fa.md"
        assert 1 <= int(paper["chapter"].removeprefix("chapter-")) <= sections
        assert paper["task"] and paper["output"] and paper["done_when"]
    # The abstract is written last, from results that already exist.
    assert PLAN["weeks"][-1]["manuscript"]["chapter"] == "chapter-1"


def test_quoted_rnaseq_medians_match_the_published_summary():
    summary = json.loads((PROJECT / "data/processed/rnaseq-group-summary.json").read_text())
    tnf = next(g for g in summary["genes"] if g["symbol"] == "TNF")["groups"]
    expect = PLAN["weeks"][3]["experiment"]["expect"]
    for response in ("good", "moderate", "no"):
        value = f"{tnf[response]['median']:g}".replace(".", "٫")
        assert builder.fa(value) in expect
        assert builder.fa(tnf[response]["n"]) in expect
