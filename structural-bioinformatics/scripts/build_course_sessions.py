"""Build a single printable reader from the canonical individual course lessons."""

import json
import re
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def render(project=PROJECT):
    course = json.loads((project / "data/metadata/learning-course.json").read_text())
    out = [
        "# دورهٔ سی جلسه؛ از پایه تا مرور انتقادی",
        "",
        "نسخهٔ خواندنی یک‌جای همان درس‌های [مسیر اصلی](../learn.html). "
        "هر جلسه چهار بخش دارد: درس، کارگاه، خواندن مقاله و تمرین ارائه. "
        "همهٔ جلسه‌ها آزادند؛ پیش‌نیازها برای کمک به انتخاب ترتیب هستند. "
        "هشت بستهٔ ارائه، جای سی جلسهٔ سیلابس را نمی‌گیرند.",
        "",
    ]
    for entry in course["sessions"]:
        text = (project / entry["path"]).read_text().split("\n", 1)[1]
        # Keep exactly one reader chapter per syllabus session.
        text = re.sub(r"^(#{2,5}) ", r"\1# ", text, flags=re.M)
        labels = {
            "lesson": "درس و توضیح مفهوم",
            "practice": "کارگاه و خروجی قابل بررسی",
            "research": "خواندن مقاله و کاربرد پژوهشی",
            "presentation": "تمرین ارائه",
        }
        for marker, label in labels.items():
            text = text.replace(f"<!-- course:{marker} -->", f"### {label}")
        # Files are one directory deeper than this combined reader.
        text = re.sub(r"\]\(\.\./([^\s)]+)\)", r"](\1)", text)
        out.extend([f"## جلسهٔ {entry['session']}. {entry['title']}", "", text.strip(), ""])
    return "\n".join(out)


if __name__ == "__main__":
    (PROJECT / "docs/course-sessions.fa.md").write_text(render())
