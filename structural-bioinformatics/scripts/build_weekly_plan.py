"""Write docs/weekly-plan.fa.md from data/metadata/weekly-plan.json.

Run from repository root; no network is needed:
uv run --project structural-bioinformatics python \
    structural-bioinformatics/scripts/build_weekly_plan.py

The JSON is the single source for the week order; the page widget and the slide filter
(`presentation.html?week=N`) read the same file, so the document must be regenerated after
any change to it. Week order follows data/metadata/course-syllabus.json, so a week only uses
a concept the class has already taught. Slide numbers count the title slide: presentation
chapter N is slide N+1.
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


def reader_link(item, label):
    chapter = "" if item["chapter"] == "intro" else f"?chapter={item['chapter']}"
    return f"[{label}]({item['document']}{chapter})"


def sessions_label(first, last):
    if first == last:
        return f"جلسهٔ {fa(first)}"
    return f"جلسات {fa(first)} تا {fa(last)}"


def course_heading(course):
    """Name the syllabus blocks a week sits in, with their session ranges."""
    parts = [
        f"بخش «{block['title']}» ({sessions_label(block['first_session'], block['last_session'])})"
        for block in course["blocks"]
    ]
    return " و ".join(parts)


def block_topics(week, syllabus):
    """Split a week's topic list back into the syllabus blocks it belongs to."""
    grouped = {block["id"]: [] for block in syllabus["blocks"]}
    for entry in week["course"]["topics"]:
        grouped[entry["block"]].append(entry)
    return grouped


def coverage_summary(entries, legend):
    counts = {}
    for entry in entries:
        counts[entry["status"]] = counts.get(entry["status"], 0) + 1
    if not counts:
        return "—"
    parts = [
        f"{fa(counts[status])} {legend[status]['label']}" for status in legend if status in counts
    ]
    return "، ".join(parts)


def goal_block(goal, weeks):
    return [
        f"**هدف نهایی: یک مقالهٔ کوتاه در پایان هفتهٔ {fa(len(weeks))}**",
        "",
        f"**عنوان کاری:** {goal['title']}",
        "",
        f"**نوع:** {goal['type']}",
        "",
        f"**ادعای اصلی:** {goal['claim']}",
        "",
        f"**چرا طراحی دارو؟** {goal['design_framing']}",
        "",
        f"**هم‌گامی با درس:** {goal['course_fit']}",
        "",
        "هر هفته علاوه بر ارائه، **یک بخش مشخص از "
        f"[پیش‌نویس مقاله]({goal['document']})** را می‌نویسد. ترتیب نوشتن با ترتیب مقاله "
        "فرق دارد: اول زمینه و روش، بعد نتایج و بحث، و چکیده در آخر؛ چون چکیده فقط باید از "
        "نتایجی ساخته شود که واقعاً نوشته شده‌اند.",
        "",
    ]


def course_sessions(course):
    blocks = course["blocks"]
    if len(blocks) == 1:
        return sessions_label(blocks[0]["first_session"], blocks[0]["last_session"])
    ranges = " و ".join(
        f"{fa(block['first_session'])} تا {fa(block['last_session'])}" for block in blocks
    )
    return f"جلسات {ranges}"


def overview_table(plan):
    rows = [
        "| هفته | بخش سرفصل درس | جلسات | گام ارائهٔ ما | اسلایدها |",
        "| --- | --- | --- | --- | --- |",
    ]
    for week in plan["weeks"]:
        slides = "، ".join(fa(c + 1) for c in week["chapters"])
        course = week["course"]
        titles = " و ".join(block["title"] for block in course["blocks"])
        rows.append(
            f"| {fa(week['week'])} | {titles} | {course_sessions(course)} | "
            f"{week['title']} | {slides} |"
        )
    return rows


def syllabus_map(plan, syllabus):
    """The whole course outline next to the coverage this project actually reached."""
    legend = plan["coverage_legend"]
    rows = [
        "| بخش سرفصل درس | جلسات | هفتهٔ ارائه | اسلایدها | موضوع‌ها | پوشش ما |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for block in syllabus["blocks"]:
        week = block["weeks"][0]
        entries = block_topics(plan["weeks"][week - 1], syllabus)[block["id"]]
        count = fa(len(block["topics"])) if block["topics"] else "—"
        sessions = sessions_label(block["first_session"], block["last_session"])
        slides = sorted({slide for entry in entries for slide in entry.get("slide", [])})
        slide_text = "، ".join(fa(slide) for slide in slides) if slides else "—"
        rows.append(
            f"| {block['title']} | {sessions} | {fa(week)} | {slide_text} | {count} | "
            f"{coverage_summary(entries, legend)} |"
        )
    return rows


def legend_list(legend):
    return [f"- **{item['label']}**: {item['meaning']}" for item in legend.values()]


def week_section(week, titles, legend):
    number = week["week"]
    course = week["course"]
    out = [
        f"## هفتهٔ {fa(number)}. {week['title']}",
        "",
        f"**پرسش این هفته:** {week['question']}",
        "",
        f"**جای این هفته در درس:** {course_heading(course)}. {course['uses']}",
        "",
    ]
    if course.get("ahead"):
        out += [f"> جلوتر از کلاس: {course['ahead']}", ""]
    out += ["**سرفصل این هفته و پوشش ما در پروژه:**", ""]
    if course["topics"]:
        out += [
            "| موضوع سرفصل | اسلاید | وضعیت | آنچه در این پروژه هست |",
            "| --- | --- | --- | --- |",
        ]
        for entry in course["topics"]:
            status = legend[entry["status"]]
            slides = "، ".join(fa(slide) for slide in entry.get("slide", []))
            out.append(f"| {entry['topic']} | {slides} | {status['label']} | {entry['note']} |")
    else:
        out.append("این بخش از سرفصل موضوع جداگانه‌ای ندارد؛ فقط جای پروژه در درس تعریف می‌شود.")
    out += [""]
    out += [
        f"**۱. ارائهٔ این هفته:** [اسلایدهای هفتهٔ {fa(number)}]"
        f"(../presentation.html?week={number}#slide-1)",
        "",
    ]
    out += [f"- اسلاید {fa(c + 1)}: {titles[c - 1]}" for c in week["chapters"]]
    out += ["", "**۲. پیش از کلاس بخوانید:**", ""]
    for item in week["reading"]:
        out.append("- " + reader_link(item, item["label"]))
    if week["papers"]:
        out += ["", "**۳. مقالهٔ این هفته:**", ""]
        for paper in week["papers"]:
            out += [
                f"**{paper['label']} — {paper['focus']}**",
                "",
                f"- پرسش مقاله: {paper['question']}",
                f"- روش: {paper['method']}",
                f"- نتیجهٔ خودِ مقاله: {paper['result']}",
                f"- محدودیت: {paper['limit']}",
                f"- چرا ما به آن نیاز داریم: {paper['our_use']}",
                "",
            ]
    else:
        out += [
            "",
            "**۳. مقالهٔ این هفته:** این هفته مقالهٔ تازه‌ای معرفی نمی‌شود؛ تمرکز روی "
            "کمیت‌های اندازه‌گیری و تحلیل اجراشدهٔ خودمان است.",
            "",
        ]
    out += ["**۴. واژه‌های کلاسی که این هفته به کار می‌بریم:**", ""]
    for concept in week["concepts"]:
        out.append(f"- **{concept['term']}**: {concept['meaning']}")
    out += ["", "**۵. ترتیب گفتن مطلب در کلاس:**", ""]
    out += [f"{fa(index)}. {beat}" for index, beat in enumerate(week["talk"], start=1)]
    experiment = week["experiment"]
    out += [
        "",
        f"**۶. خرده‌آزمایش:** [{experiment['label']}](../{experiment['href']})",
        "",
        f"> آنچه باید ببینید: {experiment['expect']}",
        "",
    ]
    if experiment.get("ahead_note"):
        out += [f"> همان کار با ابزار کلاس: {experiment['ahead_note']}", ""]
    out += ["**۷. پرسش‌هایی که احتمالاً می‌پرسند:**", ""]
    for item in week["expect_questions"]:
        out += [f"**پرسش:** {item['q']}", "", f"**پاسخ کوتاه:** {item['a']}", ""]
    paper = week["manuscript"]
    out += [
        f"**۸. تحویلی ارائه:** {week['deliverable']}",
        "",
        f"**۹. گام مقاله — {reader_link(paper, paper['section'])}:** {paper['task']}",
        "",
        f"- خروجی: {paper['output']}",
        f"- وقتی تمام است که: {paper['done_when']}",
        "",
    ]
    return out


def appendix_section(appendix, titles):
    out = [
        f"## {appendix['title']}",
        "",
        f"**چرا جدا؟** {appendix['why']}",
        "",
    ]
    for item in appendix["items"]:
        slides = "، ".join(fa(c + 1) for c in item["chapters"])
        out += [
            f"**{item['label']}** — اسلایدهای {slides}",
            "",
            "- پیش‌خوانی: "
            + "، ".join(reader_link(entry, entry["label"]) for entry in item["reading"]),
            f"- خرده‌آزمایش: [{item['experiment']['label']}](../{item['experiment']['href']})",
            f"- آنچه باید ببینید: {item['experiment']['expect']}",
            f"- اگر پرسیدند: {item['if_asked']}",
            "",
        ]
    return out


def render(plan, titles, syllabus):
    out = [
        "# برنامهٔ هفته‌به‌هفتهٔ ارائه",
        "",
        "**چرا هفته‌به‌هفته؟** همهٔ تحلیل‌ها، اسلایدها و خرده‌آزمایش‌ها از قبل ساخته شده‌اند؛ "
        "ولی هر هفته فقط **یک گام** را در کلاس ارائه می‌کنیم تا از کلاس جلو نزنیم و هر گام "
        "روی گام قبلی سوار شود.",
        "",
        f"**ترتیب از سرفصل درس آمده است.** درس «{syllabus['course']}» "
        f"{fa(syllabus['total_sessions'])} جلسه دارد. هر هفتهٔ ارائهٔ ما به یک بخش سرفصل گره "
        "خورده و فقط مفهومی را به کار می‌برد که کلاس تا آن جلسه گفته است؛ جایی که جلو می‌زنیم، "
        "با برچسب «جلوتر از کلاس» مشخص شده است.",
        "",
        "**پوشش، جداست از سرفصل.** برای هر موضوع سرفصل نوشته شده که این پروژه تا کجا آن را "
        "باز کرده است: «اجرا شده» یعنی با دادهٔ واقعی محاسبه شده، «بخشی» یعنی تنها بخشی از آن "
        "پوشش داده شده، «مفهومی» یعنی فقط برای توضیح و تعیین مرز می‌آید، و «هنوز اجرا نشده» "
        "یعنی برنامه‌ریزی‌شده ولی در این پروژه انجام نشده است. این جدول وضعیت ارائهٔ ماست، نه "
        "برنامهٔ استاد درس.",
        "",
        "پیش از این بخش‌ها، پرسش هفته، جای آن در سرفصل و جدول پوشش موضوع‌های سرفصل می‌آید. "
        "هر هفته نُه بخش شماره‌گذاری‌شده دارد: ارائه، پیش از کلاس، مقاله، واژه‌های کلاسی، "
        "ترتیب گفتن مطلب، خرده‌آزمایش، پرسش‌های احتمالی کلاس، تحویلی ارائه و گام مقاله.",
        "",
        "**اسلایدهای هر هفته جدا باز می‌شوند.** پیوند «ارائهٔ این هفته» فقط صفحهٔ عنوان و "
        "اسلایدهای همان هفته را نشان می‌دهد. ارائهٔ کامل همچنان در "
        "[همهٔ اسلایدها](../presentation.html#slide-1) هست.",
        "",
    ]
    out += goal_block(plan["paper_goal"], plan["weeks"])
    out += overview_table(plan)
    out += [
        "",
        "**نقشهٔ سرفصل درس و پوشش ما:**",
        "",
    ]
    out += syllabus_map(plan, syllabus)
    out += [
        "",
        "شمارهٔ اسلاید با احتساب صفحهٔ عنوان است؛ یعنی فصل N متن ارائه، اسلاید N+1 است. "
        "در ارائهٔ هر هفته، اسلایدها از ۱ (صفحهٔ عنوان) دوباره شماره می‌خورند.",
        "",
    ]
    for week in plan["weeks"]:
        out += week_section(week, titles, plan["coverage_legend"])
    out += appendix_section(plan["appendix"], titles)
    out += [
        "## اگر برنامهٔ کلاس فرق داشت",
        "",
        "ترتیب هفته‌ها در `data/metadata/weekly-plan.json` و سرفصل درس در "
        "`data/metadata/course-syllabus.json` ثبت شده است. اگر کلاس جلو یا عقب افتاد، همان "
        "هفته را جابه‌جا کنید ولی **ترتیب گام‌ها را عوض نکنید**، چون هر گام به گام قبلی و به "
        "مفهومی که کلاس گفته تکیه دارد. اگر جلسه‌ها کمتر شد، دو هفتهٔ پشت‌سرهم را ادغام کنید "
        "(مثلاً ۵ و ۶). یک تست خودکار کنترل می‌کند که این سند، فایل JSON و شمارهٔ اسلایدها با "
        "هم یکی بمانند.",
        "",
        "**معنی چهار وضعیت پوشش:**",
        "",
    ]
    out += legend_list(plan["coverage_legend"])
    out += [
        "",
        "وضعیت هر موضوع در `data/metadata/weekly-plan.json` نگه داشته می‌شود و یک تست خودکار "
        "کنترل می‌کند که هر موضوع سرفصل دقیقاً یک‌بار و با همان متن سرفصل پوشش داده شده باشد.",
        "",
    ]
    return "\n".join(out)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--project", type=Path, default=PROJECT)
    project = parser.parse_args().project.resolve()
    plan = json.loads((project / "data/metadata/weekly-plan.json").read_text())
    syllabus = json.loads((project / "data/metadata/course-syllabus.json").read_text())
    document = render(plan, slide_titles(project), syllabus)
    (project / "docs/weekly-plan.fa.md").write_text(document)


if __name__ == "__main__":
    main()
