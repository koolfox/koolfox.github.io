"""Build the nine-chapter textbook from lesson-only source files."""

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
        "آموزش عمومیِ مفاهیم و روش‌ها مطابق نه بخش "
        "[سرفصل درس ۴۰۵۵۳ شریف](https://docs.ce.sharif.edu/courses/40553). "
        "تقسیم داخلی به مباحث برای مطالعهٔ مرحله‌ای است و تقویم جلسات دانشگاه نیست.",
        "",
    ]
    for unit, block in enumerate(syllabus["blocks"], 1):
        out.extend([f"## فصل {unit}. {block['title']}", ""])
        for topic in (t for t in course["sessions"] if t["block"] == block["id"]):
            text = (project / topic["path"]).read_text().split("\n", 1)[1].strip()
            text = re.sub(r"(?<=\]\()\.\./", "", text)
            # Preserve the hierarchy below the single h2 chapter heading.
            lines = [("##" + line if line.startswith("#") else line) for line in text.splitlines()]
            out.extend([f"### {topic['title']}", "", "\n".join(lines), ""])
    return "\n".join(out)


if __name__ == "__main__":
    (PROJECT / "docs/course-sessions.fa.md").write_text(render())
