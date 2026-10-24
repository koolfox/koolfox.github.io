"""Build the nine-chapter reader from canonical topic files; no classroom calendar."""

import json
import re
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def render(project=PROJECT):
    course = json.loads((project / "data/metadata/learning-course.json").read_text())
    syllabus = json.loads((project / "data/metadata/course-syllabus.json").read_text())
    out = [
        "# درسنامهٔ بیوانفورماتیک ساختاری",
        "",
        "بیوانفورماتیک ساختاری، رابطهٔ شکل مولکول‌های زیستی با کار آن‌ها را بررسی می‌کند. "
        "در این درس، ساختمان مولکول‌ها و روش‌های تحلیل ساختار را با مطالعهٔ اتصال "
        "آدالیموماب به TNF می‌آموزیم. [تمرین‌ها و ابزارهای تعاملی](../index.html) "
        "در صفحهٔ پروژه در دسترس‌اند.",
        "",
    ]
    thread = json.loads((project / "data/metadata/research-thread.json").read_text())
    steps = {s["topic"]: s for s in thread["steps"]}
    out.extend(["**پرسش مورد مطالعه:** " + thread["question"], ""])
    for index, block in enumerate(syllabus["blocks"], 1):
        out.extend([f"## فصل {index}. {block['title']}", ""])
        argument = thread["chapter_arguments"][index - 1]
        out.extend(
            [argument["explanation"], "", "**سهم این فصل در مقاله:** " + argument["manuscript"], ""]
        )
        topics = [s for s in course["sessions"] if s["block"] == block["id"]]
        for number, entry in enumerate(topics, 1):
            step = steps[entry["session"]]
            text = (project / entry["path"]).read_text().split("\n", 1)[1]
            segments = re.split(r"<!-- course:(lesson|practice|research|presentation) -->", text)
            parts = {segments[i]: segments[i + 1] for i in range(1, len(segments), 2)}
            research_intro = (
                "\n\n### "
                + argument["title"]
                + "\n\n"
                + argument["explanation"]
                + "\n\n**کار این فصل در مقاله:** "
                + argument["manuscript"]
            )
            parts["research"] = parts["research"].replace(research_intro, "", 1)
            presentation_intro = "\n\n### پاسخ این فصل به پرسش مرور\n\n" + argument["presentation"]
            parts["presentation"] = parts["presentation"].replace(presentation_intro, "", 1)
            definitions = "\n\n".join(f"**{t['term']}:** {t['meaning']}" for t in step["terms"])
            research = parts["research"] + "\n\nتمرین عملی:\n\n" + parts["practice"]
            research += (
                "\n\n**نوع شاهد:** "
                + thread["status_labels"][step["evidence_status"]]
                + "\n\n"
                + step["result"]
                + "\n\n**گزارش تمرین:** "
                + step["output"]
            )
            out.extend(
                [
                    f"### مبحث {number}. {entry['title']}",
                    "",
                    "پرسش: " + step["question"],
                    "",
                ]
            )
            for heading, body in (
                ("۱. درس", definitions + "\n\n" + step["example"] + "\n\n" + parts["lesson"]),
                ("۲. پژوهش", research),
                ("۳. ارائه", parts["presentation"]),
            ):
                body = re.sub(r"^(#{2,4}) ", r"\1### ", body, flags=re.M)
                body = re.sub(r"\]\(\.\./([^\s)]+)\)", r"](\1)", body)
                out.extend([f"#### {heading}", "", body.strip(), ""])

    return "\n".join(out)


if __name__ == "__main__":
    (PROJECT / "docs/course-sessions.fa.md").write_text(render())
