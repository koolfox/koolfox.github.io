"""Check topic routing and keyword anchors, not completeness or scientific truth.

The plan records, for every syllabus topic, the slides that cover it. This test
checks three things: the recorded slides belong to the week that teaches the
topic, the slide really contains the terms of that topic, and no slide of the
deck is left without a week or without the appendix.
"""

import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
PLAN = json.loads((PROJECT / "data/metadata/archive/weekly-plan.json").read_text())
SYLLABUS = json.loads((PROJECT / "data/metadata/course-syllabus.json").read_text())
DECK = (PROJECT / "docs/class-presentation.fa.md").read_text()
HISTORICAL = json.loads(
    (PROJECT / "data/metadata/archive/syllabus-project-annotations.json").read_text()
)
WEEKS = {b["id"]: b["weeks"] for b in HISTORICAL["blocks"]}

# Terms each syllabus topic has to meet in the slides that are recorded for it,
# keyed by a keyword that identifies the topic in the syllabus record.
TOPIC_TERMS = {
    "مونومری": ["زنجیره", "پروتئین"],
    "شیمی نوکلئیک": ["باز نیتروژنی", "کدون"],
    "پلی‌پپتید": ["توالی", "ساختار دوم"],
    "ساختار اول": ["ساختار اول", "ساختار چهارم"],
    "طبقه‌بندی": ["DSSP"],
    "DNA و RNA": ["DNA", "RNA"],
    "TCL": ["TCL"],
    "خصوصیات ساختاری سه‌بعدی": ["RMSD", "شعاع دوران", "SASA"],
    "VMD": ["VMD"],
    "توالی‌های پروتئین": ["UniProt", "NCBI"],
    "پایگاه داده ساختار سه‌بعدی": ["PDB", "پرتو X", "گروه فضایی"],
    "مولکول‌های کوچک شیمیایی": ["مؤلفهٔ شیمیایی", "PC"],
    "مناظر انرژی": ["منظر انرژی"],
    "Fold": ["تاشدن"],
    "بهینه‌سازی ژئومتری": ["بهینه‌سازی ژئومتری"],
    "بی‌نظم": ["بی‌نظم ذاتی"],
    "مکانیک مولکولی": ["مکانیک مولکولی", "میدان نیرو"],
    "اصول و انواع شبیه‌سازی": ["شبیه‌سازی دینامیک مولکولی"],
    "ساختار دوم پروتئین‌ها": ["ساختار دوم"],
    "Homology": ["همولوژی"],
    "Threading": ["تردینگ"],
    "یادگیری ماشین": ["یادگیری ماشین"],
    "مولکول‌های شیمیایی": ["بازداکینگ", "1B09"],
    "پروتئین و پروتئین": ["پروتئین–پروتئین"],
    "برهم‌کنش اسیدهای": ["شبکهٔ برهم‌کنش اسیدآمینه"],
    "انرژی پروتئین": ["شبکهٔ انرژی"],
}


def terms_for(topic):
    for keyword, terms in TOPIC_TERMS.items():
        if keyword in topic:
            return terms
    raise AssertionError(f"no required terms for {topic}")


def slide_text(slide):
    """The text of one slide of the deck; slide 1 is the title slide."""
    chapters = DECK.split("\n## ")
    index = slide - 1
    assert 1 <= index < len(chapters), slide
    return chapters[index]


def test_every_syllabus_topic_has_keyword_anchors_in_its_assigned_slides():
    topics = {topic for block in SYLLABUS["blocks"] for topic in block["topics"]}
    assert len(topics) == len(TOPIC_TERMS)
    for week in PLAN["weeks"]:
        week_slides = {chapter + 1 for chapter in week["chapters"]}
        for entry in week["course"]["topics"]:
            taught = entry["slide"]
            assert taught, entry["topic"]
            # The slides that teach a topic belong to the week that teaches its block.
            assert set(taught) <= week_slides, (entry["topic"], taught, week["week"])
            for slide in taught:
                text = slide_text(slide)
                assert text.strip(), slide
            # The terms of the topic appear across the slides that teach it.
            combined = "\n".join(slide_text(slide) for slide in taught)
            for term in terms_for(entry["topic"]):
                assert term in combined, (entry["topic"], taught, term)
            assert WEEKS[entry["block"]] == [week["week"]]


def test_the_deck_order_follows_the_syllabus_blocks():
    """The weeks present contiguous slide ranges, in the order of the syllabus."""
    weeks = PLAN["weeks"]
    for earlier, later in zip(weeks, weeks[1:], strict=False):
        assert max(earlier["chapters"]) < min(later["chapters"]), (earlier["week"], later["week"])
    covered = [chapter for week in weeks for chapter in week["chapters"]]
    appendix = PLAN["appendix"]["chapters"]
    assert covered + appendix == list(range(1, len(covered) + len(appendix) + 1))
    for week, block in zip(weeks, SYLLABUS["blocks"], strict=False):
        if block["id"] == "docking":
            continue
        assert WEEKS[block["id"]] == [week["week"]], (block["id"], week["week"])


def test_the_number_of_slides_matches_the_plan():
    chapters = [line for line in DECK.splitlines() if line.startswith("## ")]
    slides = len(chapters) + 1
    assert HISTORICAL["slide_deck"]["slides"] == slides
    assert slides == 39
