"""Group the audited slide-source blocks under the one nine-chapter course map."""

import json
import re
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def render(project=PROJECT):
    mapping = json.loads((project / "data/metadata/course-map.json").read_text())
    text = (project / "docs/class-presentation.fa.md").read_text()
    sections = re.split(r"^## (.+)$", text, flags=re.M)[1:]
    slides = {i: (sections[2 * i - 2], sections[2 * i - 1]) for i in range(1, 39)}
    out = [
        "# ارائه‌های درس در همان نه فصل",
        "",
        "این متن و نمایش اسلایدی از بانک جمله‌های ممیزی‌شدهٔ پروژه ساخته می‌شوند؛ "
        "ترتیب و انتخاب اسلایدها تابع همان فصل‌های درس است، نه برنامهٔ هفتگیِ جدا. "
        "پیوست‌های بالینی و RNA-seq با برچسب مکمل می‌آیند. "
        "[بازگشت به صفحهٔ واحد درس](../index.html)",
        "",
    ]
    for chapter in mapping["chapters"]:
        out.extend([f"## فصل {chapter['unit']}. {chapter['title']}", ""])
        for kind, ids in (
            ("", chapter["slides"]),
            ("مکمل این فصل: ", chapter["supplementary_slides"]),
        ):
            for number in ids:
                title, body = slides[number]
                title = re.sub(r"^[\d۰-۹]+\.\s*", "", title)
                out.extend([f"### {kind}{title}", "", body.strip(), ""])
    return "\n".join(out)


if __name__ == "__main__":
    (PROJECT / "docs/chapter-presentation.fa.md").write_text(render())
