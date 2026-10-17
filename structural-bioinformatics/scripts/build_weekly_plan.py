"""Write docs/weekly-plan.fa.md from data/metadata/weekly-plan.json.

Run from repository root; no network is needed:
uv run --project structural-bioinformatics python \
    structural-bioinformatics/scripts/build_weekly_plan.py

The JSON is the single source for the week order; the page widget and the slide filter
(`presentation.html?week=N`) read the same file, so the document must be regenerated after
any change to it. Slide numbers count the title slide: presentation chapter N is slide N+1.
"""

import argparse
import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
PERSIAN_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def fa(value):
    return str(value).translate(PERSIAN_DIGITS)


def slide_titles(project):
    lines = (project / "docs/class-presentation.fa.md").read_text().splitlines()
    return [line[3:].split(". ", 1)[1] for line in lines if line.startswith("## ")]


def render(plan, titles):
    goal = plan["paper_goal"]
    out = [
        "# برنامهٔ هفته‌به‌هفتهٔ ارائه",
        "",
        "**چرا هفته‌به‌هفته؟** همهٔ تحلیل‌ها، اسلایدها و خرده‌آزمایش‌ها از قبل ساخته شده‌اند؛ "
        "ولی هر هفته فقط **یک گام** را در کلاس ارائه می‌کنیم تا از کلاس جلو نزنیم و هر گام "
        "روی گام قبلی سوار شود. هر هفته شش بخش دارد: پرسش، اسلایدهای همان هفته، خواندنی‌ها، "
        "یک خرده‌آزمایش با عددهایی که باید ببینید، یک تحویلی ارائه و یک گام مقاله.",
        "",
        "**اسلایدهای هر هفته جدا باز می‌شوند.** پیوند «ارائهٔ این هفته» فقط صفحهٔ عنوان و "
        "اسلایدهای همان هفته را نشان می‌دهد. ارائهٔ کامل همچنان در "
        "[همهٔ اسلایدها](../presentation.html#slide-1) هست.",
        "",
        "**هدف نهایی: یک مقالهٔ کوتاه در پایان هفتهٔ ۸**",
        "",
        f"**عنوان کاری:** {goal['title']}",
        "",
        f"**نوع:** {goal['type']}",
        "",
        f"**ادعای اصلی:** {goal['claim']}",
        "",
        f"**چرا طراحی دارو؟** {goal['design_framing']}",
        "",
        "هر هفته علاوه بر ارائه، **یک بخش مشخص از "
        f"[پیش‌نویس مقاله]({goal['document']})** را می‌نویسد. ترتیب نوشتن با ترتیب مقاله "
        "فرق دارد: اول زمینه و روش، بعد نتایج و بحث، و چکیده در آخر؛ چون چکیده فقط باید از "
        "نتایجی ساخته شود که واقعاً نوشته شده‌اند.",
        "",
        "| هفته | گام ارائه | اسلایدها | بخش مقاله |",
        "| --- | --- | --- | --- |",
    ]
    for week in plan["weeks"]:
        slides = "، ".join(fa(c + 1) for c in week["chapters"])
        section = week["manuscript"]["section"]
        out.append(f"| {fa(week['week'])} | {week['title']} | {slides} | {section} |")
    out += [
        "",
        "شمارهٔ اسلاید با احتساب صفحهٔ عنوان است؛ یعنی فصل N متن ارائه، اسلاید N+1 است. "
        "در ارائهٔ هر هفته، اسلایدها از ۱ (صفحهٔ عنوان) دوباره شماره می‌خورند.",
        "",
    ]
    for week in plan["weeks"]:
        number = week["week"]
        out += [
            f"## هفتهٔ {fa(number)}. {week['title']}",
            "",
            f"**پرسش این هفته:** {week['question']}",
            "",
            f"**ارائهٔ این هفته:** [اسلایدهای هفتهٔ {fa(number)}]"
            f"(../presentation.html?week={number}#slide-1)",
            "",
        ]
        out += [f"- اسلاید {fa(c + 1)}: {titles[c - 1]}" for c in week["chapters"]]
        out += ["", "**پیش از کلاس بخوانید:**", ""]
        for item in week["reading"]:
            query = "" if item["chapter"] == "intro" else f"?chapter={item['chapter']}"
            out.append(f"- [{item['label']}]({item['document']}{query})")
        experiment = week["experiment"]
        out += [
            "",
            f"**خرده‌آزمایش:** [{experiment['label']}](../{experiment['href']})",
            "",
            f"> آنچه باید ببینید: {experiment['expect']}",
            "",
            f"**تحویلی ارائه:** {week['deliverable']}",
            "",
        ]
        paper = week["manuscript"]
        out += [
            f"**گام مقاله — [{paper['section']}]"
            f"({paper['document']}?chapter={paper['chapter']}):** {paper['task']}",
            "",
            f"- خروجی: {paper['output']}",
            f"- وقتی تمام است که: {paper['done_when']}",
            "",
        ]
    out += [
        "## اگر برنامهٔ کلاس فرق داشت",
        "",
        "تعداد هفته‌ها و ترتیب در `data/metadata/weekly-plan.json` ثبت شده است. اگر کلاس "
        "تعداد جلسهٔ دیگری داشت، دو هفتهٔ پشت‌سرهم را ادغام کنید (مثلاً ۵ و ۶، یا ۷ و ۸)؛ "
        "ترتیب گام‌ها را تغییر ندهید، چون هر گام به گام قبلی تکیه دارد. یک تست خودکار کنترل "
        "می‌کند که این سند و فایل JSON با هم یکی بمانند.",
        "",
    ]
    return "\n".join(out)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--project", type=Path, default=PROJECT)
    project = parser.parse_args().project.resolve()
    plan = json.loads((project / "data/metadata/weekly-plan.json").read_text())
    (project / "docs/weekly-plan.fa.md").write_text(render(plan, slide_titles(project)))


if __name__ == "__main__":
    main()
