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
        "هر مبحث چهار بخش دارد: درس، کارگاه، خواندن مقاله و ارائه/آزمون. "
        "انتخاب و سرعت مطالعه آزاد است؛ آزمون تعاملی در مسیر اصلی اجرا می‌شود.",
        "",
    ]
    labels = {
        "lesson": "درس و توضیح مفهوم",
        "practice": "کارگاه و خروجی قابل بررسی",
        "research": "خواندن مقاله و کاربرد پژوهشی",
        "presentation": "تمرین ارائه",
    }
    for index, block in enumerate(syllabus["blocks"], 1):
        out.extend([f"## فصل {index}. {block['title']}", ""])
        topics = [s for s in course["sessions"] if s["block"] == block["id"]]
        for number, entry in enumerate(topics, 1):
            text = (project / entry["path"]).read_text().split("\n", 1)[1]
            text = re.sub(r"^(#{2,4}) ", r"\1## ", text, flags=re.M)
            for marker, label in labels.items():
                text = text.replace(f"<!-- course:{marker} -->", f"#### {label}")
            text = re.sub(r"\]\(\.\./([^\s)]+)\)", r"](\1)", text)
            out.extend([f"### مبحث {number}. {entry['title']}", "", text.strip(), ""])
    return "\n".join(out)


if __name__ == "__main__":
    (PROJECT / "docs/course-sessions.fa.md").write_text(render())
