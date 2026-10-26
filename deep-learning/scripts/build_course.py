"""Render the five source-faithful course paths as accessible static HTML."""

import argparse
import json
import re
import shutil
from html import escape
from pathlib import Path

from course_content import load_course
from source_catalog import ROOT

BASE = "/deep-learning"
LABS = {
    "neuron-xor": ("نورون و مسئله XOR", "پیش‌بینی، آموزش زنده و مقایسه مرز تصمیم"),
    "network-playground": (
        "شبکه و تعمیم",
        "داده، ویژگی، معماری و بهینه‌ساز؛ مقایسه آموزش، اعتبارسنجی و آزمون",
    ),
    "convolution": (
        "فیلتر، گام و تجمیع",
        "پنجرهٔ ورودی، ضرب‌های هر خانه و تفاوت cross-correlation با convolution",
    ),
}
TERM_SUMMARIES = {
    "spring-2026": "از نورون تا مدل‌های پایه؛ توجه ویژه به پس‌آموزش، پایداری و مسئولیت اجتماعی.",
    "spring-2025": "مسیر مفصلِ بینایی، زبان و چندوجهی؛ سپس مدل‌های پایه و یادگیری کارآمد.",
    "spring-2024": "آموزش شبکه از دو دیدگاه، کاربردهای بینایی و زبان، ترنسفورمر و یادگیری مسئولانه.",
    "fall-2022": "مبانی شبکه‌ها، گفت‌وگوی تصویری، بازیابی عصبی، تقطیر و یادگیری تقویتی.",
    "spring-2022": "مبانی تا شبکه‌های بینایی و زبان؛ پروژه‌های چندوجهی، فشرده‌سازی و گفتار.",
}


def e(value):
    return escape(str(value), quote=True)


def prose(value):
    """Isolate Latin/math runs inside Persian paragraphs."""
    pattern = r"[A-Za-z0-9۰-۹٠-٩α-ωΑ-Ω∂∇φσΣ±−+\-][A-Za-z0-9۰-۹٠-٩α-ωΑ-Ω∂∇φσΣ₀-₉⁰-⁹_+−=<>≤≥×*/().,،٫\[\]{}:^% \t\-]*"
    pieces, end = [], 0
    for match in re.finditer(pattern, str(value)):
        pieces.append(e(str(value)[end : match.start()]))
        token = match.group().rstrip()
        pieces.append(
            f'<bdi dir="ltr">{e(token)}</bdi>' + e(match.group()[len(token) :])
        )
        end = match.end()
    pieces.append(e(str(value)[end:]))
    return "".join(pieces)


def paragraphs(values):
    return "".join(f"<p>{prose(value)}</p>" for value in values)


def listing(values, ordered=False):
    tag = "ol" if ordered else "ul"
    return f"<{tag}>" + "".join(f"<li>{prose(v)}</li>" for v in values) + f"</{tag}>"


def link(url, label, external=False, **attributes):
    attrs = " ".join(
        f'{e(k.rstrip("_").replace("_", "-"))}="{e(v)}"' for k, v in attributes.items()
    )
    target = ' target="_blank" rel="noopener noreferrer"' if external else ""
    return f'<a href="{e(url)}"{target} {attrs}>{e(label)}</a>'


def term_url(term):
    return f"{BASE}/terms/{term['id']}/"


def session_url(term, row):
    return f"{term_url(term)}{row['id']}/"


def page(title, body, crumbs=(), data=None):
    trail = link(f"{BASE}/", "یادگیری ژرف")
    for url, label in crumbs:
        trail += f'<span aria-hidden="true">/</span>{link(url, label)}'
    config = json.dumps(data or {}, ensure_ascii=False).replace("<", "\\u003c")
    return f'''<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)} · یادگیری ژرف</title>
<meta name="description" content="درسنامه مستقل فارسی، مسیر پنج ترم دانا گوراری، تمرین و آزمایشگاه پایتون">
<link rel="stylesheet" href="{BASE}/assets/course.css">
<script src="{BASE}/assets/course.js" defer></script></head><body>
<a class="skip" href="#main">رفتن به محتوای درس</a>
<header class="site-header"><div class="header-inner">{link("/", "حسام شینی", class_="brand")}
<nav aria-label="مسیر صفحه">{trail}</nav>{link(f"{BASE}/playgrounds/", "آزمایشگاه‌ها", class_="lab-nav")}</div></header>
<main id="main" class="page-shell">{body}</main>
<footer class="site-footer"><p>درس‌های اصلی: دانا گوراری، دانشگاه کلرادو بولدر · درسنامه و تمرین فارسی: تألیف مستقل این مجموعه.</p>
<p>تاریخ‌ها و تکالیف رسمی، سوابق همان ترم‌اند. این مسیر خودآموز وابسته به ثبت‌نام دانشگاه نیست.</p>
{link("https://dannagurari.colorado.edu/courses/", "فهرست رسمی درس‌ها", True)}
<span aria-hidden="true"> · </span>{link(f"{BASE}/sources/", "منابع و وضعیت بررسی")}</footer>
<script id="course-context" type="application/json">{config}</script></body></html>'''


def progress_tools():
    return """<details class="progress-tools"><summary>پیشرفت من روی این مرورگر</summary>
<p>علامت پایان جلسه‌ها و پاسخ تمرین‌ها فقط در همین مرورگر ذخیره می‌شوند. برای جابه‌جایی دستگاه، نسخه پشتیبان بگیر.</p>
<button type="button" data-export-progress>دریافت پیشرفت</button>
<label class="file-label">بازیابی پیشرفت <input type="file" accept="application/json,.json" data-import-progress></label>
<p role="status" data-progress-message></p></details>"""


def hub(course):
    rows = []
    for term in course["terms"]:
        count = sum(bool(r["slides"]) for r in term["schedule"])
        ready = sum(r["companion_ready"] for r in term["schedule"])
        rows.append(f'''<li class="term-row"><div><h2>{link(term_url(term), term["title_fa"])}</h2>
<p>{e(TERM_SUMMARIES[term["id"]])}</p><p class="meta">{count} جلسه دارای اسلاید · {ready} درسنامه آماده
<span data-term-progress="{e(term["id"])}"></span></p></div>{link(term_url(term), "ورود به مسیر ", class_="row-action")}</li>''')
    body = f"""<section class="course-intro">
<h1>از یک نورون تا مدل‌های پایه</h1><p class="lead">درس را به فارسی بخوان، نتیجه را پیش‌بینی کن و با اجرای پایتون امتحانش کن.
هر ترم دانا گوراری، مسیر مستقل خودش را دارد؛ اصل اسلایدها هم کنار هر جلسه در دسترس است.</p>
<div class="intro-actions">{link(term_url(course["terms"][0]), "شروع مسیر بهار ۲۰۲۶", class_="button primary")}
{link(f"{BASE}/playgrounds/neuron-xor/", "آزمایش یک نورون", class_="text-link")}</div></section>
<section aria-labelledby="terms-title"><div class="section-heading"><h2 id="terms-title">یک ترم را دنبال کن</h2>
<p>ترتیب جلسه‌ها از برنامه رسمی همان دوره می‌آید.</p></div><ol class="term-list">{"".join(rows)}</ol></section>
<section class="reading-note"><h2>روش کار در هر جلسه</h2><p>ابتدا مفهوم و مثال حل‌شده را بخوان. پیش از دیدن پاسخ، تمرین را حل کن؛
سپس در آزمایشگاه یک فرض را تغییر بده و اثرش را توضیح بده. مرور اسلاید اصلی، ارجاع صفحه‌ها و اصلاح‌های مستند در همان جلسه آمده‌اند.</p>
<p>تکمیل درسنامه‌ها تدریجی است. جلسه‌ای که هنوز آماده نیست، با همین وضعیت مشخص می‌شود.</p></section>{progress_tools()}"""
    return page("مسیرهای دانا گوراری", body, data={"kind": "hub"})


def term_page(term):
    items = []
    for row in term["schedule"]:
        source_count = sum(s.get("page_count", 0) for s in row["slides"])
        status = (
            "درسنامه و تمرین آماده"
            if row["companion_ready"]
            else (
                "اصل اسلاید · درسنامه در حال آماده‌سازی"
                if row["slides"]
                else "رویداد برنامه رسمی"
            )
        )
        items.append(f'''<li class="session-row" data-session-key="{term["id"]}/{row["id"]}">
<span class="session-number" aria-label="جلسه {row["order"]}">{row["order"]:02d}</span><div>
<p class="meta"><bdi>{e(row["date_label"])}</bdi>{f" · {source_count} صفحه" if source_count else ""}</p>
<h2>{link(session_url(term, row), row["title_fa"])}</h2><p>{e(row.get("overview_fa", ""))}</p>
<p class="session-state">{e(status)}<span data-completion-label></span></p></div></li>''')
    body = f"""<div class="term-heading"><h1>{e(term["title_fa"])}</h1>
<p class="lead">{e(TERM_SUMMARIES[term["id"]])}</p><div class="inline-links">
{link(term["course_url"], "برنامه رسمی این ترم ", True)}{link(term["syllabus_url"], "سیلابس اصلی ", True)}
{link(term_url(term) + "foundations/", "مرور پیش‌نیازها")}{link(term_url(term) + "project/", "پروژه پایانی")}</div></div>
<ol class="session-list">{"".join(items)}</ol>{progress_tools()}"""
    return page(
        term["title_fa"],
        body,
        [(term_url(term), term["title_fa"])],
        {"term": term["id"]},
    )


def source_panel(term, row, concepts):
    content = '<h2>کنار درس فارسی</h2><p>درسنامه فارسی، تألیف مستقل با ارجاع به منابع همین جلسه است.</p><p class="meta">اصل اسلاید، بدون تغییر</p>'
    for source in row["slides"]:
        content += f'''<div class="source-document">{link(source["url"], f"اسلاید اصلی · {source['page_count']} صفحه ", True, class_="source-link")}
<button type="button" class="quiet" data-show-source="{e(source["url"])}">نمایش در همین صفحه</button></div>'''
    if not row["slides"]:
        content += "<p>در برنامه عمومی این ردیف، اسلایدی پیوند نشده است.</p>"
    mapping = row["mapping"]
    if mapping:
        content += (
            '<details><summary>راهنمای صفحه‌های منبع</summary><ol class="page-guide">'
        )
        for guide in mapping["source_guides"]:
            for part in guide["ranges"]:
                label = f"{part['start']}–{part['end']} · {part['topic_fa']}"
                content += f"<li>{link(guide['url'] + '#page=' + str(part['start']), label, True)}</li>"
        content += "</ol></details>"
    if row["companion_ready"]:
        content += '<details class="lesson-outline" open><summary>بخش‌های درس فارسی</summary><nav aria-label="بخش‌های درس"><ol class="page-guide">'
        for identity in mapping["concept_ids"]:
            for section in concepts[identity]["sections"]:
                content += f"<li>{link('#' + identity + '-' + section['id'], section['title_fa'])}</li>"
            content += (
                f"<li>{link('#' + identity + '-exercises', 'تمرین‌های این بحث')}</li>"
            )
        content += "</ol></nav></details>"
    content += f'<p class="meta">شماره‌ها ترتیب صفحه‌های PDF هستند.</p>{link(term_url(term), "همه جلسه‌های این ترم ")}'
    return f'<aside class="source-panel" aria-label="منابع و راهنمای اسلاید">{content}</aside>'


def exercise_html(exercise, prefix):
    identity = f"{prefix}-{exercise['id']}"
    answer = exercise["answer"]
    config = e(json.dumps(answer, ensure_ascii=False))
    control = ""
    if answer["kind"] == "number":
        control = f'<label for="{identity}-answer">پاسخ عددی</label><input id="{identity}-answer" name="answer" inputmode="decimal" autocomplete="off" required>'
    elif answer["kind"] == "choice":
        control = "<fieldset><legend>یک پاسخ انتخاب کن</legend>"
        for i, option in enumerate(answer["options_fa"]):
            control += f'<label class="choice"><input type="radio" name="answer" value="{i}" required><span>{e(option)}</span></label>'
        control += "</fieldset>"
    else:
        control = f'<label for="{identity}-answer">استدلال خودت را بنویس</label><textarea id="{identity}-answer" name="answer" rows="3"></textarea>'
    button = "بررسی پاسخ" if answer["kind"] != "manual" else "ذخیره استدلال"
    hints = "".join(
        f"<details><summary>راهنمایی {i + 1}</summary><p>{prose(hint)}</p></details>"
        for i, hint in enumerate(exercise.get("hints_fa", []))
    )
    criteria = (
        listing(answer.get("criteria_fa", [])) if answer["kind"] == "manual" else ""
    )
    return f'''<article class="exercise" id="{identity}"><h3>تمرین تألیفی: {prose(exercise["prompt_fa"])}</h3>
<form data-exercise="{identity}" data-answer="{config}">{control}<button type="submit">{button}</button>
<p class="feedback" role="status"></p></form>{hints}
<details class="solution"><summary>پاسخ و روش حل</summary><p>{prose(exercise["solution_fa"])}</p>{criteria}</details></article>'''


def concept_html(concept):
    identity = concept["id"]
    content = f'<section class="concept" id="{identity}"><h2>{e(concept["title_fa"])}</h2><p>{e(concept["summary_fa"])}</p>'
    if concept.get("prerequisites_fa"):
        content += f"<details><summary>پیش‌نیاز این بحث</summary>{listing(concept['prerequisites_fa'])}</details>"
    for section in concept["sections"]:
        content += f'<section id="{identity}-{e(section["id"])}"><h3>{e(section["title_fa"])}</h3>{paragraphs(section["paragraphs_fa"])}'
        for formula in section.get("formulas", []):
            content += f'<figure class="formula"><div dir="ltr">{e(formula["expression"])}</div><figcaption>{prose(formula["explanation_fa"])}</figcaption></figure>'
        content += "</section>"
    for example in concept.get("worked_examples", []):
        content += f'<section class="worked-example"><h3>مثال حل‌شده: {e(example["title_fa"])}</h3><p>{prose(example["question_fa"])}</p>{listing(example["steps_fa"], True)}<p class="example-answer">{prose(example["answer_fa"])}</p></section>'
    content += (
        f'<section class="exercises" id="{identity}-exercises"><h3>خودت حل کن</h3>'
    )
    content += (
        "".join(exercise_html(exercise, identity) for exercise in concept["exercises"])
        + "</section>"
    )
    if concept.get("glossary"):
        content += '<details class="glossary"><summary>واژه‌های این بحث</summary><dl>'
        for entry in concept["glossary"]:
            content += f"<dt>{e(entry['term_fa'])} <bdi>{e(entry['term_en'])}</bdi></dt><dd>{e(entry['definition_fa'])}</dd>"
        content += "</dl></details>"
    if concept.get("reflection_fa"):
        content += f"<h3>با زبان خودت توضیح بده</h3>{listing(concept['reflection_fa'])}"
    if concept.get("limitations_fa"):
        content += f"<details><summary>فرض‌ها و حدود این درس</summary>{listing(concept['limitations_fa'])}</details>"
    if concept.get("references"):
        content += "<details><summary>منابع درسنامه مستقل</summary><ul>"
        content += (
            "".join(
                f"<li>{link(r['url'], r['title'], True)}</li>"
                for r in concept["references"]
            )
            + "</ul></details>"
        )
    return content + "</section>"


def findings_html(row):
    if not row["review"]:
        return ""
    findings = [f for f in row["review"]["findings"] if "license" not in f["category"]]
    if not findings:
        return ""
    content = '<section class="source-findings" id="corrections"><h2>نکته‌ها و اصلاح‌های منبع</h2><p>این توضیح‌ها همراه اصل اسلاید خوانده می‌شوند؛ فایل اصلی تغییر نکرده است.</p>'
    for finding in findings:
        pages = finding.get("pages", [finding.get("page")])
        pages = [p for p in pages if p is not None]
        label = "، ".join(str(p) for p in pages)
        description = finding.get("explanation_fa", finding.get("note_fa", ""))
        category = (
            "اصلاح تأییدشده"
            if finding["category"] == "verified_error"
            else "توضیح تکمیلی"
        )
        content += f"<details><summary>{category} · صفحه {e(label)}</summary><p>{prose(description)}</p><ul>"
        content += "".join(
            f"<li>{link(url, f'شاهد {i + 1} ', True)}</li>"
            for i, url in enumerate(finding.get("evidence_urls", []))
        )
        content += "</ul></details>"
    return content + "</section>"


def session_page(term, row, concepts):
    mapping = row["mapping"]
    ready = row["companion_ready"]
    intro = f"""<header class="lesson-heading">
<h1>{e(row["title_fa"])}</h1><p class="lead">{e(row.get("overview_fa", ""))}</p></header>"""
    content = intro
    if not ready:
        note = (
            "درسنامه و تمرین این جلسه در حال آماده‌سازی است. اصل اسلاید و برنامه رسمی در دسترس‌اند."
            if row["slides"]
            else "این ردیف از تقویم رسمی ترم است. اسلاید عمومی برای آن پیوند نشده؛ محتوایی به استاد نسبت داده نمی‌شود."
        )
        content += f'<p class="availability" role="note">{note}</p>'
    content += f'<section class="objectives"><h2>در پایان این جلسه</h2>{listing(row.get("objectives_fa", []))}</section>'
    if mapping and mapping.get("differences_fa"):
        content += f'<details class="term-differences" open><summary>این جلسه در همین ترم</summary>{listing(mapping["differences_fa"])}</details>'
    if ready:
        content += "".join(concept_html(concepts[c]) for c in mapping["concept_ids"])
        content += "".join(
            exercise_html(x, row["id"]) for x in mapping.get("additional_exercises", [])
        )
        labs = dict.fromkeys(
            lab
            for c in mapping["concept_ids"]
            for lab in concepts[c].get("lab_ids", [])
        )
        for lab in labs:
            if lab in LABS:
                title, description = LABS[lab]
                content += f'<section class="lab-invitation"><h2>آزمایش: {e(title)}</h2><p>{prose(description)}</p>{link(f"{BASE}/playgrounds/{lab}/", "باز کردن آزمایشگاه ", class_="button primary")}</section>'
    content += findings_html(row)
    if row.get("readings"):
        content += "<details><summary>مطالعه‌های معرفی‌شده در برنامه رسمی</summary><ul>"
        content += "".join(
            f"<li>{link(r['url'], r.get('title', 'منبع'), True)}</li>"
            for r in row["readings"]
        )
        content += "</ul></details>"
    if row.get("assignment_labels"):
        content += f"<details><summary>تکلیف‌های تاریخی کلاس اصلی</summary>{listing(row['assignment_labels'])}<p>متن تکلیف‌های بستهٔ Canvas در اختیار این مجموعه نیست. تمرین‌های بالا مستقل‌اند.</p></details>"
    if ready:
        content += '<div class="completion"><button type="button" data-toggle-complete aria-pressed="false">این جلسه را خواندم و تمرین کردم</button><p role="status" data-completion-message></p></div>'
    position = term["schedule"].index(row)
    links = []
    if position:
        previous = term["schedule"][position - 1]
        links.append(
            link(session_url(term, previous), " جلسه قبل: " + previous["title_fa"])
        )
    if position + 1 < len(term["schedule"]):
        following = term["schedule"][position + 1]
        links.append(
            link(
                session_url(term, following),
                "جلسه بعد: " + following["title_fa"] + " ",
            )
        )
    content += (
        '<nav class="lesson-pagination" aria-label="حرکت در مسیر">'
        + "".join(links)
        + "</nav>"
    )
    body = f'<div class="lesson-layout">{source_panel(term, row, concepts)}<article class="lesson-body">{content}</article></div>'
    return page(
        row["title_fa"],
        body,
        [
            (term_url(term), term["title_fa"]),
            (session_url(term, row), f"جلسه {row['order']}"),
        ],
        {"term": term["id"], "session": row["id"], "ready": ready},
    )


def project_page(term):
    project = term.get("project", {})
    body = '<article class="standalone"><h1>از یادگیری تا یک پروژه قابل دفاع</h1>'
    body += f"<p>{e(project.get('summary_fa', ''))}</p>{link(project.get('source_url', term['course_url']), 'توضیح پروژه در منبع رسمی ', True)}"
    body += "<h2>پیشنهاد مستقل برای مسیر خودآموز</h2><p>این مراحل، تکلیف رسمی استاد نیستند. یک پرسش کوچک انتخاب کن که بتوانی داده، خط مبنا و نتیجه‌اش را بازتولید کنی.</p>"
    steps = [
        "پرسش: ورودی، خروجی و یک معیار موفقیت اندازه‌پذیر تعریف کن. کاربرد موردنظر و خطر اشتباه را بنویس.",
        "داده: منبع و مجوز، تعداد نمونه، واحد مستقل نمونه‌برداری و روش جداسازی آموزش، اعتبارسنجی و آزمون را ثبت کن.",
        "خط مبنا: پیش از شبکه بزرگ، یک قاعده ساده یا مدل کوچک بساز. همه مدل‌ها را با تقسیم داده یکسان مقایسه کن.",
        "آزمایش: در هر مقایسه یک عامل را تغییر بده؛ seed، نسخه کتابخانه‌ها، تنظیمات و هزینه محاسبه را ذخیره کن.",
        "ارزیابی: روی آزمون کنارگذاشته‌شده فقط پس از انتخاب مدل نتیجه بگیر. خطاها و تفاوت زیرگروه‌ها را بررسی کن.",
        "گزارش: پرسش، روش، نتیجه، محدودیت، منابع و دستور بازتولید را ارائه کن؛ نشان بده کدام مشاهده واقعاً از آزمایش تو پشتیبانی می‌شود.",
    ]
    body += listing(steps, True)
    body += "<h2>چک پایان پروژه</h2><p>آیا فرد دیگری با داده مجاز و دستورهای تو می‌تواند نتیجه اصلی را بسازد؟ آیا بهبود نسبت به خط مبنا روشن است؟ آیا محدودیت یا نتیجه منفی را هم گزارش کرده‌ای؟</p>"
    body += f"{link(term_url(term), 'بازگشت به مسیر ترم ')}</article>"
    return page("پروژه پایانی", body, [(term_url(term), term["title_fa"])])


def lab_page(lab):
    title, description = LABS[lab]
    if lab == "convolution":
        body = f"""<article class="standalone"><h1>{e(title)}</h1><p class="lead">{prose(description)}</p>
<h2>پیش از اجرا، حدس بزن</h2><p>یک فیلتر ۳ × ۳ روی تصویر ۸ × ۸، بدون حاشیه و با گام ۱، چند خانهٔ خروجی می‌سازد؟ برای هر خانه چند ضرب لازم است؟</p>
<ol><li>یک خانهٔ خروجی را انتخاب کن و پاسخ را از پنجرهٔ آبی ورودی، وزن‌ها و بایاس حساب کن.</li><li>گام و حاشیه را تغییر بده؛ اندازهٔ خروجی، تعداد ضرب‌ها و تعداد وزن‌ها را مقایسه کن.</li><li>فیلتر نامتقارن را بچرخان؛ سپس ReLU و دو نوع pooling را بررسی کن.</li></ol>
{link(f"{BASE}/runtime/{lab}/", "اجرای آزمایشگاه زنده", class_="button primary")}
<p class="meta">بار اول محیط پایتون دریافت می‌شود. مرورگر باید JavaScript و WebAssembly را پشتیبانی کند.</p>
<h2>محاسبهٔ عملیات</h2><p>فیلتر انتخابی روی تصویر مصنوعی محاسبه می‌شود و تمام ضرب‌های هر خانه در دسترس‌اند. وزن‌ها دستی قابل تغییرند. آموزش فیلتر و طبقه‌بندی تصویر به آزمایش جداگانه نیاز دارند.</p>
<h2>بازسازی محاسبه</h2><p>فایل دریافت‌شده، تصویر، هسته، تنظیمات و نتایج دقیق را نگه می‌دارد. کد مستقل پایتون همان cross-correlation و pooling را محاسبه می‌کند.</p>
{link(f"{BASE}/python/convolution_lab.py", "کد موتور محاسبه")}</article>"""
        return page(title, body, [(f"{BASE}/playgrounds/", "آزمایشگاه‌ها")])
    if lab == "network-playground":
        body = f"""<article class="standalone"><h1>{e(title)}</h1><p class="lead">{prose(description)}</p>
<h2>پیش از اجرا، حدس بزن</h2><p>آیا یک مدل بدون لایه پنهان می‌تواند دو حلقه را جدا کند؟ اگر مربع مختصات را به‌عنوان ویژگی بدهیم، پاسخ چه تغییری می‌کند؟</p>
<ol><li>دادهٔ حلقه‌ها را با دو ویژگی خام و بدون لایه پنهان اجرا کن.</li><li>با همان بذر، ویژگی‌های مربع مختصات را جایگزین کن و خطای اعتبارسنجی را مقایسه کن.</li><li>ویژگی خام را برگردان؛ لایه پنهان اضافه کن و اثر نویز، اندازه دسته و جریمه وزن‌ها را بررسی کن.</li></ol>
{link(f"{BASE}/runtime/{lab}/", "اجرای آزمایشگاه زنده", class_="button primary")}
<p class="meta">بار اول محیط پایتون دریافت می‌شود. مرورگر باید JavaScript و WebAssembly را پشتیبانی کند.</p>
<h2>ارزیابی را از تنظیم جدا نگه دار</h2><p>دادهٔ مصنوعی به آموزش، اعتبارسنجی و آزمون تقسیم می‌شود. آزمون تا تصمیم نهایی پنهان است؛ بازکردن آن آموزش همان اجرا را می‌بندد. استفاده دوباره از همان آزمون برای تنظیم مدل، ارزیابی مستقل نیست.</p>
<h2>بازسازی آزمایش</h2><p>تنظیمات، وزن‌ها، داده‌های مشاهده‌شده و تاریخچه را دریافت کن. موتور مستقل پایتون با همان تنظیمات و تعداد دوره‌ها قابل اجراست.</p>
{link(f"{BASE}/python/network_playground.py", "کد موتور محاسبه")}</article>"""
        return page(title, body, [(f"{BASE}/playgrounds/", "آزمایشگاه‌ها")])
    body = f"""<article class="standalone"><h1>{e(title)}</h1><p class="lead">{prose(description)}</p>
<h2>پیش از اجرا، حدس بزن</h2><p>آیا یک خط می‌تواند دو نقطهٔ مثبت XOR را از دو نقطهٔ منفی جدا کند؟ اگر تعداد دوره‌ها را زیاد کنیم چه اتفاقی می‌افتد؟</p>
<ol><li>با مدل پرسپترون و جدول XOR شروع کن و خروجی چهار ورودی را ثبت کن.</li>
<li>با همان بذر، مدل را به شبکه دارای لایه پنهان تغییر بده؛ تغییر مرز تصمیم و زیان را دنبال کن.</li>
<li>آزمایش را از ابتدا اجرا کن؛ سپس فقط نرخ یادگیری را تغییر بده. تفاوت را توضیح بده.</li></ol>
{link(f"{BASE}/runtime/{lab}/", "اجرای آزمایشگاه زنده ", class_="button primary")}
<p class="meta">بار اول محیط پایتون دریافت می‌شود و ممکن است کمی زمان ببرد. مرورگر باید JavaScript و WebAssembly را پشتیبانی کند.</p>
<h2>اگر محیط اجرا باز نشد</h2><p>منطق آزمایش و آموزش در فایل‌های پایتون هم در دسترس است. نتیجه‌های آماده، جای اجرای زنده معرفی نمی‌شوند.</p>
<div class="inline-links">{link(f"{BASE}/python/live_training.py", "کد اجرای مرحله‌ای")}{link(f"{BASE}/python/logic_gates.py", "کد مدل و گرادیان")}</div>
<h2>این آزمایش چه چیزی را نشان می‌دهد؟</h2><p>دقت چهار حالت جدول درستی و رفتار یک شبکه کوچک. هر چهار نمونه برای آموزش‌اند؛ این آزمایش شاهد تعمیم آماری نیست و جای داده آزمون را نمی‌گیرد.</p></article>"""
    return page(title, body, [(f"{BASE}/playgrounds/", "آزمایشگاه‌ها")])


def sources_page(course):
    totals = course["review_summary"]["totals"]
    body = f'<article class="standalone"><h1>منابع و وضعیت بررسی</h1><p>مرجع برنامه و اسلایدها، وب‌سایت اصلی دانا گوراری است. هر PDF با نشانی، زمان دریافت و SHA-256 ثبت شده و بدون تغییر به منبع اصلی پیوند داده می‌شود.</p><p>{totals["source_pages"]} صفحه در {totals["decks"]} فایل اسلاید ثبت شده است. تا این ساخت، {totals["fully_reviewed"]} صفحه مرور متنی، تصویری و بررسی علمی ثبت‌شده دارند. دریافت فایل یا استخراج متن به‌تنهایی مرور کامل محسوب نمی‌شود.</p>'
    body += "<p>درسنامه‌ها تألیف مستقل فارسی‌اند. نشان‌های مجوز مشاهده‌شده، به همان فایل و صفحه مربوط‌اند؛ نسخهٔ مجوز یا حقوق تصویر شخص ثالث از روی یک نشان حدس زده نمی‌شود.</p><ul>"
    body += "".join(
        f"<li>{link(t['course_url'], t['title_fa'], True)}</li>"
        for t in course["terms"]
    )
    return page("منابع و بررسی", body + "</ul></article>")


def build(output, root=ROOT):
    course = load_course(root)
    output.mkdir(parents=True, exist_ok=True)
    pages = {"index.html": hub(course), "sources/index.html": sources_page(course)}
    for term in course["terms"]:
        prefix = f"terms/{term['id']}"
        pages[f"{prefix}/index.html"] = term_page(term)
        pages[f"{prefix}/project/index.html"] = project_page(term)
        if "math-python-foundations" in course["concepts"]:
            body = (
                '<article class="standalone"><h1>ریاضی و پایتون برای شروع</h1><p>پیش‌نیاز مستقل مسیر خودآموز؛ این بخش، جلسه‌ای از تقویم رسمی استاد نیست.</p>'
                + concept_html(course["concepts"]["math-python-foundations"])
                + link(term_url(term), "بازگشت به جلسه‌های ترم ")
                + "</article>"
            )
            pages[f"{prefix}/foundations/index.html"] = page(
                "مرور پیش‌نیازها",
                body,
                [(term_url(term), term["title_fa"])],
                {"term": term["id"], "session": "s00"},
            )
        for row in term["schedule"]:
            pages[f"{prefix}/{row['id']}/index.html"] = session_page(
                term, row, course["concepts"]
            )
    cards = "".join(
        f"<li><h2>{link(f'{BASE}/playgrounds/{lab}/', info[0])}</h2><p>{e(info[1])}</p></li>"
        for lab, info in LABS.items()
    )
    pages["playgrounds/index.html"] = page(
        "آزمایشگاه‌ها",
        f'<section class="standalone"><h1>از پیش‌بینی تا آزمایش</h1><p>آزمایش‌های کوچک برای فهم رفتار شبکه؛ آموزش زنده پایتون در مرورگر.</p><ul class="lab-list">{cards}</ul><h2>تمرین‌های مکمل</h2><p>{link(BASE + "/karpathy/", "کارپتی و آزمایشگاه گرادیان ")} · دوره‌ای مستقل از کارپتی، برای تمرین سازوکار مشتق خودکار.</p></section>',
    )
    for lab in LABS:
        pages[f"playgrounds/{lab}/index.html"] = lab_page(lab)
    for name, html in pages.items():
        path = output / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(html, encoding="utf-8")
    assets = output / "assets"
    assets.mkdir(exist_ok=True)
    for name in ("course.css", "course.js"):
        if (root / "assets" / name).resolve() != (assets / name).resolve():
            shutil.copyfile(root / "assets" / name, assets / name)
    return len(pages)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(f"Rendered {build(args.output)} course pages in {args.output}")


if __name__ == "__main__":
    main()
