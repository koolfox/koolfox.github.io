"""Build the nine-chapter reader from canonical topic files; no classroom calendar."""

import json
import re
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def render(project=PROJECT):
    course = json.loads((project / "data/metadata/learning-course.json").read_text())
    syllabus = json.loads((project / "data/metadata/course-syllabus.json").read_text())
    out = [
        "# درس‌نامهٔ نه فصل؛ از پایه تا مرور انتقادی",
        "",
        "این نسخهٔ یک‌جای [مسیر اصلی](../index.html) است. نه فصل از "
        "[سرفصل رسمی شریف](https://docs.ce.sharif.edu/courses/40553) می‌آیند. "
        "تقسیم درونی به مباحث آموزشی متعلق به سایت است و تقویم کلاس نیست. "
        "هر مبحث یک زنجیرهٔ درس، پژوهش و ارائه دارد. تمرین عملی در مرحلهٔ پژوهش است. "
        "انتخاب و سرعت مطالعه آزاد است؛ آزمون تعاملی در مسیر اصلی اجرا می‌شود.",
        "",
    ]
    thread = json.loads((project / "data/metadata/research-thread.json").read_text())
    steps = {s["topic"]: s for s in thread["steps"]}
    out.extend(["**پرسش اصلی پژوهش:** " + thread["question"], "", thread["plain_question"], ""])
    for index, block in enumerate(syllabus["blocks"], 1):
        out.extend([f"## فصل {index}. {block['title']}", ""])
        topics = [s for s in course["sessions"] if s["block"] == block["id"]]
        for number, entry in enumerate(topics, 1):
            step = steps[entry["session"]]
            text = (project / entry["path"]).read_text().split("\n", 1)[1]
            segments = re.split(r"<!-- course:(lesson|practice|research|presentation) -->", text)
            parts = {segments[i]: segments[i + 1] for i in range(1, len(segments), 2)}
            definitions = "\n\n".join(f"**{t['term']}:** {t['meaning']}" for t in step["terms"])
            research = parts["research"] + "\n\nانجام عملی همین بررسی:\n\n" + parts["practice"]
            research += (
                "\n\n**نوع شاهد:** "
                + thread["status_labels"][step["evidence_status"]]
                + "\n\n"
                + step["result"]
                + "\n\n**محصول این قدم:** "
                + step["output"]
            )
            out.extend(
                [
                    f"### مبحث {number}. {entry['title']}",
                    "",
                    "پرسش این قدم: " + step["question"],
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
