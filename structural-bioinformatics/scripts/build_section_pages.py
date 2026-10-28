"""Build independent public sections from shared scientific tool fragments."""

import html
import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def render_pages(project=PROJECT):
    config = json.loads((project / "data/metadata/site-sections.json").read_text())
    sections = config["sections"]
    course = json.loads((project / "data/metadata/learning-course.json").read_text())
    syllabus = json.loads((project / "data/metadata/course-syllabus.json").read_text())
    study = json.loads((project / "data/metadata/research-thread.json").read_text())

    def fragment(name):
        return (project / f"templates/sections/{name}.html").read_text()

    def reader(section):
        source = section["documents"][0]["file"]
        return fragment("reader").replace("research-questions.fa.md", source)

    def link(label, href, extra=""):
        return f'<a href="{html.escape(href, quote=True)}" {extra}>{html.escape(label)}</a>'

    def shell(ident, title, description, body, scripts=()):
        ids = {
            "course": "tab-basics",
            "structures": "tab-lab",
            "papers": "tab-literature",
            "datasets": "tab-methods",
            "library": "tab-reading",
        }
        current = next((section for section in sections if section["id"] == ident), None)
        area = current["area"] if current else None
        nav = "".join(
            link(
                entry["title"],
                entry["page"],
                ('aria-current="page"' if area == entry["id"] else ""),
            )
            for entry in config["areas"]
        )
        children = [section for section in sections if section["area"] == area]
        subnav = (
            '<nav id="research-nav" aria-label="بخش‌های پژوهش">'
            if area == "research"
            else '<nav id="education-nav" aria-label="بخش‌های آموزش">'
        )
        subnav += "".join(
            link(
                "درسنامه"
                if section["id"] == "course"
                else section["title"]
                if section["id"] != "research"
                else "موضوع مطالعه",
                section["page"],
                f'id="{ids.get(section["id"], "nav-" + section["id"])}"'
                + (' aria-current="page"' if section["id"] == ident else ""),
            )
            for section in children
        )
        subnav = subnav + "</nav>" if children else ""
        modules = "\n".join(
            f'<script type="module" src="assets/{name}?v=20261025-sections"></script>'
            for name in ["site.js", *scripts]
        )
        values = {
            "title": html.escape(title),
            "description": html.escape(description, quote=True),
            "section": ident,
            "scripts": modules,
            "nav": nav,
            "subnav": subnav,
            "body": body,
        }
        template = (project / "templates/page.html").read_text()
        if ident == "course":
            template = template.replace(
                '<link rel="stylesheet" href="assets/sections.css">',
                '<link rel="stylesheet" href="assets/sections.css">\n'
                '<link rel="stylesheet" href="assets/course-reading.css">',
            )
        for key, value in values.items():
            template = template.replace("@@" + key + "@@", value)
        return template.rstrip()

    def contents(page):
        out = []
        for number, block in enumerate(syllabus["blocks"], 1):
            topics = [t for t in course["sessions"] if t["block"] == block["id"]]
            out.append(f"<details><summary>فصل {number}: {html.escape(block['title'])}</summary>")
            out.extend(
                link(t["title"], f"{page}?topic={t['session']}", f'data-topic="{t["session"]}"')
                for t in topics
            )
            out.append("</details>")
        return (
            """<aside>
<details id="contents" open>
<summary>فصل‌ها و مباحث</summary>
<nav id="sessions" aria-label="فصل‌ها و مباحث">"""
            + "".join(out)
            + "</nav></details></aside>"
        )

    pages = {}
    home = (
        """<section class="section-directory" aria-label="فهرست بخش‌ها">"""
        + "".join(
            f"""<article>
<h2>{link(s["title"], s["page"])}</h2>
<p>{html.escape(s["description"])}</p>
</article>"""
            for s in config["areas"]
        )
        + "</section>"
    )
    pages["index.html"] = shell(
        "home",
        "بیوانفورماتیک ساختاری",
        "آموزش عمومی درس را مطالعه کنید؛ کاربرد آموخته‌ها در مطالعهٔ آدالیموماب و TOP2A "
        "در مسیر پژوهش دنبال می‌شود.",
        home,
        ["legacy-routes.js"],
    )
    for section in sections:
        ident = section["id"]
        scripts = []
        docnav = (
            '<nav class="section-documents" aria-label="متن‌های این بخش">'
            + "".join(
                link(d["title"], f"{section['page']}?document={d['file']}&chapter=all#reading")
                for d in section["documents"]
            )
            + "</nav>"
        )
        if ident in ("course", "exercises"):
            state = fragment("study-state")
            article = fragment("topic-article")
            article += (
                '<div id="dataset-workflow"></div>'
                + fragment("quiz").replace('id="check" hidden', 'id="check"')
                if ident == "exercises"
                else state
            )
            article += fragment("topic-navigation")
            body = '<div class="restored-course">' + contents(section["page"]) + article + "</div>"
            if ident == "course":
                outline = [
                    '<details id="syllabus-outline"><summary>سرفصل کامل و منبع درس</summary>'
                ]
                outline.append(
                    link("سیلابس درس ۴۰۵۵۳ شریف", "https://docs.ce.sharif.edu/courses/40553")
                )
                for block in syllabus["blocks"]:
                    outline.append("<h2>" + html.escape(block["title"]) + "</h2><ul>")
                    outline.extend(
                        "<li>" + html.escape(topic) + "</li>" for topic in block["topics"]
                    )
                    outline.append("</ul>")
                body = (
                    docnav
                    + '<div id="course-topics">'
                    + "".join(outline)
                    + "</details>"
                    + body
                    + "</div>"
                    + '<div id="course-reading" hidden>'
                    + link("بازگشت به مباحث درس", "course.html")
                    + reader(section)
                    + "</div>"
                )
            if ident == "exercises":
                body += (
                    """<section>
<h2>آزمایش تعاملی تماس و جایگزینی آلانین</h2>
<p>
آستانهٔ فاصله را تغییر دهید، شریک هر باقی‌مانده را ببینید و تماس‌های حذف‌شده را مقایسه
کنید. نتیجهٔ این ابزار هندسی است.</p>"""
                    + fragment("epitope")
                    + "</section>"
                )
                scripts += ["epitope-lab.js"]
            scripts += ["course.js"]
        elif ident == "structures":
            body = (
                '<nav class="local-nav">'
                + link("مدل‌های سه‌بعدی", "#structures", "")
                + link("زنجیره‌ها و توالی‌ها", "#sequences", 'id="tab-sequences"')
                + link("شکل آموزشی آنتی‌بادی", "#molecular-roles")
                + "</nav>"
                + fragment("structures")
                + fragment("sequences")
                + fragment("biology")
                + docnav
                + reader(section)
            )
            scripts = ["app.js", "codon-lesson.js"]
        elif ident == "datasets":
            body = (
                docnav
                + fragment("datasets")
                .replace(
                    '<details id="future-work" class="future-work">',
                    '<details id="future-work" class="future-work" open>',
                )
                .replace(
                    "اختیاری برای مرحلهٔ بعد: منابع پیشرفته و یادداشت‌های قبلی",
                    "جست‌وجو در فهرست منابع داده",
                )
                + reader(section)
            )
            scripts = ["app.js", "rnaseq-groups.js"]
        elif ident == "papers":
            body = docnav + fragment("papers") + reader(section)
            scripts = ["app.js"]
        elif ident == "docking":
            body = docnav + fragment("docking") + reader(section)
            scripts = ["docking-validation.js"]
        elif ident == "research":
            body = (
                f"""<section class="research-summary">
<h2>پرسش فعلی</h2>
<p>{html.escape(study["question"])}</p>
<p>
متن پرسش، روش انتخاب مقاله‌ها، بازتحلیل‌ها و پیش‌نویس مرور در این بخش قرار دارند. برای
شناخت هر فایل داده یا خواندن خودِ مقاله، از بخش‌های مستقلِ دیتاست‌ها و مقاله‌ها استفاده
کنید.</p>
</section>"""
                + docnav
                + reader(section)
            )
            parallel = json.loads(
                (project / "data/metadata/education-research-map.json").read_text()
            )
            application = [
                '<section id="learning-applications"><h2>کاربرد آموخته‌ها در این مطالعه</h2>'
            ]
            for row in parallel["chapters"]:
                application.append(f'<details id="learning-application-{row["unit"]}">')
                application.append("<summary>" + html.escape(row["chapter"]) + "</summary>")
                application.append("<p>" + html.escape(row["application"]) + "</p>")
                application.append(
                    "<p><strong>حاصل کار برای مرور:</strong> " + html.escape(row["output"]) + "</p>"
                )
                application.append(
                    link("بازگشت به آموزش این مبحث", f"course.html?topic={row['exercise_topic']}")
                )
                application.append(
                    link("تمرین پژوهشی", f"exercises.html?topic={row['exercise_topic']}")
                )
                for doc in row["reading"]:
                    application.append(link(doc["title"], "docs/" + doc["file"]))
                application.append("</details>")
            application.append("</section>")
            body = body.replace("</section>", "</section>" + "".join(application), 1)
            body += fragment("evidence")
            notes = ["<section><h2>یادداشت‌های پژوهشیِ مباحث</h2>"]
            for block in syllabus["blocks"]:
                notes.append("<details><summary>" + html.escape(block["title"]) + "</summary>")
                notes.extend(
                    link(
                        topic["title"],
                        f"research.html?topic={topic['session']}#research-topic-note",
                    )
                    for topic in course["sessions"]
                    if topic["block"] == block["id"]
                )
                notes.append("</details>")
            notes.append('</section><section id="research-topic-note" hidden>')
            notes.append('<h2 id="research-topic-title"></h2>')
            notes.append('<article id="research-topic-body" class="markdown-content"></article>')
            body = body + "".join(notes) + "</section>"
        elif ident == "library":
            body = """<section aria-label="جست‌وجوی کتابخانه">
<label for="library-search">جست‌وجوی عنوان یا موضوع</label>
<input id="library-search" type="search" placeholder="مثلاً واژه‌نامه، RNA یا نرم‌افزار">
<p id="library-status" role="status">
</p>
<div id="library-catalog">
</div>
</section>""" + reader(section)
        else:
            items = []
            for number, block in enumerate(syllabus["blocks"], 1):
                topics = [t for t in course["sessions"] if t["block"] == block["id"]]
                items.append(
                    "<article><h2>"
                    + html.escape(block["title"])
                    + "</h2>"
                    + link("اسلایدهای فصل", f"presentation.html?unit={number}#slide-1")
                    + "<details><summary>انتخاب مبحث و یادداشت گوینده</summary>"
                    + "".join(
                        link(t["title"], f"presentations.html?topic={t['session']}") for t in topics
                    )
                    + "</details></article>"
                )
            body = (
                "<p>"
                + link("بازکردن ارائهٔ کامل", "presentation.html#slide-1", 'class="primary-link"')
                + '</p><section id="presentation-catalog" class="section-directory">'
                + "".join(items)
                + fragment("speaker-panel")
                + docnav
                + reader(section)
            )
        pages[section["page"]] = shell(
            ident, section["title"], section["description"], body, scripts
        )
    return pages


if __name__ == "__main__":
    for name, text in render_pages().items():
        (PROJECT / name).write_text(text + "\n")
