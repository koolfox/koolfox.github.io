"""Recover the substantive study/presentation guide within the nine course chapters."""

import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def render(*_args):
    mapping = json.loads((PROJECT / "data/metadata/course-map.json").read_text())
    thread = json.loads((PROJECT / "data/metadata/research-thread.json").read_text())
    evidence = json.loads((PROJECT / "data/processed/survey-evidence.json").read_text())
    papers = {row["study_id"]: row for row in evidence["studies"]}
    reading = {
        1: ["ho", "marguerie"],
        2: ["hu", "marguerie"],
        3: ["hu"],
        4: ["ho", "veerasubramanian", "tao"],
        5: ["hu"],
        6: ["bianchi"],
        7: ["hu", "bianchi"],
        8: ["hu"],
        9: ["marguerie", "veerasubramanian"],
    }
    out = [
        "# راهنمای مطالعه و تمرین",
        "",
        "هر فصل با یادگیری یک مفهوم شروع می‌شود، آن را در مطالعهٔ آدالیموماب به کار "
        "می‌برد و با آماده‌کردن توضیح و اسلاید پایان می‌یابد. این راهنما "
        "خواندنی‌ها، روش بررسی مقاله و خروجی هر قدم را کنار هم نگه می‌دارد. "
        "[درس و ابزارها](../index.html#basics) · [درسنامهٔ کامل](course-sessions.fa.md)",
        "",
        "**پرسش مقالهٔ مرور:** " + thread["question"],
        "",
    ]
    for chapter in mapping["chapters"]:
        unit = chapter["unit"]
        out.extend([f"## فصل {unit}. {chapter['title']}", ""])
        argument = thread["chapter_arguments"][unit - 1]
        out.extend(
            [
                argument["explanation"],
                "",
                "**بخشی که به مقاله اضافه می‌شود:** " + argument["manuscript"],
                "",
            ]
        )
        for ident in reading[unit]:
            paper = papers[ident]
            out.extend(["### مطالعهٔ این فصل: " + paper["title"], ""])
            for key, label in (
                ("system", "نمونه"),
                ("comparison", "مقایسه"),
                ("method", "روش"),
                ("finding", "یافته"),
                ("limitations", "محدودیت"),
            ):
                out.extend([f"**{label}:** {paper[key]}", ""])
            out.extend([f"[منبع اولیه]({paper['source_url']})", ""])
        for step in (s for s in thread["steps"] if s["unit"] == unit):
            topic = step["topic"]
            out.extend(
                [
                    "### " + step["title"],
                    "",
                    f"[خواندن درس](../index.html?topic={topic}&part=lesson#basics) · "
                    f"[انجام پژوهش](../index.html?topic={topic}&part=research#basics) · "
                    f"[اسلایدهای این مبحث](../presentation.html?topic={topic})",
                    "",
                    "**مثال:** " + step["example"],
                    "",
                    "**پرسش:** " + step["question"],
                    "",
                    step["connection"],
                    "",
                    "**تمرین:**",
                    "",
                    *[f"{i}. {action}" for i, action in enumerate(step["actions"], 1)],
                    "",
                    "**گزارش تمرین:** " + step["output"],
                    "",
                    "**یادداشت ارائه:** " + step["speaker_notes"],
                    "",
                    "**پرسش کلاس:** " + step["question_and_answer"]["question"],
                    "",
                    step["question_and_answer"]["answer"],
                    "",
                    "**ادامهٔ بحث:** " + step["next_step"],
                    "",
                ]
            )
    return "\n".join(out)


if __name__ == "__main__":
    (PROJECT / "docs/weekly-plan.fa.md").write_text(render())
