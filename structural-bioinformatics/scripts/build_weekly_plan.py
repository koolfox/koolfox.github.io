"""Recover the substantive study/presentation guide within the nine course chapters."""

import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def render(*_args):
    mapping = json.loads((PROJECT / "data/metadata/course-map.json").read_text())
    thread = json.loads((PROJECT / "data/metadata/research-thread.json").read_text())
    prior = json.loads((PROJECT / "data/metadata/archive/weekly-plan.json").read_text())
    out = [
        "# راهنمای کار و ارائه در نه فصل درس",
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
        matched = [
            w
            for w in prior["weeks"]
            if any(b["id"] == chapter["block"] for b in w["course"]["blocks"])
        ]
        seen = set()
        for week in matched:
            for paper in week.get("papers", []):
                if paper["label"] in seen:
                    continue
                seen.add(paper["label"])
                out.extend(["### مقاله‌ای که در این فصل می‌خوانیم: " + paper["label"], ""])
                for key, label in (
                    ("question", "پرسش مقاله"),
                    ("method", "روش"),
                    ("result", "نتیجهٔ گزارش‌شده"),
                    ("limit", "نکته‌ای برای نقد"),
                    ("our_use", "کاربرد در مطالعهٔ ما"),
                ):
                    out.extend([f"**{label}:** {paper[key]}", ""])
        for step in (s for s in thread["steps"] if s["unit"] == unit):
            topic = step["topic"]
            out.extend(
                [
                    "### " + step["title"],
                    "",
                    f"[خواندن درس](../index.html?topic={topic}&part=lesson#basics) · "
                    f"[انجام پژوهش](../index.html?topic={topic}&part=research#basics) · "
                    f"[اسلایدهای این قدم](../presentation.html?topic={topic})",
                    "",
                    "**درس چه چیزی را روشن می‌کند؟** " + step["example"],
                    "",
                    "**پرسش پژوهش در این قدم:** " + step["question"],
                    "",
                    step["connection"],
                    "",
                    "**انجام کار:**",
                    "",
                    *[f"{i}. {action}" for i, action in enumerate(step["actions"], 1)],
                    "",
                    "**چیزی که آماده می‌کنیم:** " + step["output"],
                    "",
                    "**توضیح پیشنهادی برای ارائه:** " + step["speaker_notes"],
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
