"""Render the five source-faithful course paths as accessible static HTML."""

import argparse
import hashlib
import json
import os
import re
import shutil
from html import escape
from pathlib import Path

from course_content import load_course
from mnist_reference import load_reference
from source_catalog import ROOT
from workshops import load_workshops
from local_slides import load_slides
from source_reader import load_source_translation, source_reader_page
from student_practice import choice_question, practice_page, knowledge_page

BASE = "/deep-learning"


def load_reader_registry(course, root=ROOT):
    """Only explicitly enabled, complete translations acquire a public route."""
    path = root / "data/metadata/source-readers.json"
    if not path.exists():
        return {}
    if any(p.is_symlink() for p in (path, *path.parents)):
        raise ValueError("Symlink source-reader registry")
    registry = json.loads(path.read_text())
    if (not isinstance(registry, dict) or type(registry.get("schema_version")) is not int
            or registry["schema_version"] != 1 or not isinstance(registry.get("terms"), dict)):
        raise ValueError("Invalid source-reader registry")
    terms = {term["id"]: term for term in course["terms"]}
    result = {}
    for term_id, sessions in registry["terms"].items():
        if term_id not in terms or not isinstance(sessions, list):
            raise ValueError("Unknown source-reader term or invalid session list")
        expected = {row["id"] for row in terms[term_id]["schedule"] if row["slides"]}
        if any(not isinstance(s, str) or s not in expected for s in sessions) or len(set(sessions)) != len(sessions):
            raise ValueError(f"Duplicate or unknown source-reader session: {term_id}")
        if sessions:
            result[term_id] = {
                session: load_source_translation(
                    session, root=root, term_id=term_id,
                    require_reviewed=os.environ.get("DANNA_SOURCE_DRAFT") != "1",
                )
                for session in sessions
            }
    return result
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
    "cnn-mnist": (
        "آموزش CNN روی MNIST",
        "پروژهٔ مستقل پایتون برای اجرای بیرون مرورگر، همراه کد، منبع داده و گزارش واقعی",
    ),
}
TERM_SUMMARIES = {
    "spring-2026": "نورون، مدل‌های پایه، پس‌آموزش، پایداری و مسئولیت اجتماعی.",
    "spring-2025": "بینایی، زبان، یادگیری چندوجهی، مدل‌های پایه و یادگیری کارآمد.",
    "spring-2024": "آموزش شبکه از دو دیدگاه، کاربردهای بینایی و زبان، ترنسفورمر و یادگیری مسئولانه.",
    "fall-2022": "مبانی شبکه‌ها، گفت‌وگوی تصویری، بازیابی عصبی، تقطیر و یادگیری تقویتی.",
    "spring-2022": "مبانی تا شبکه‌های بینایی و زبان؛ پروژه‌های چندوجهی، فشرده‌سازی و گفتار.",
}
LAB_GOALS = {
    "artificial-neuron": (
        "neuron-xor",
        "پیش‌بینی و به‌روزرسانی پرسپترون را با نورون سیگموید مقایسه کن.",
    ),
    "feedforward-network": (
        "neuron-xor",
        "اثر لایهٔ پنهان را روی همان چهار ورودی XOR بررسی کن.",
    ),
    "gradient-training": (
        "network-playground",
        "با داده و بذر ثابت، اثر نرخ یادگیری و به‌روزرسانی وزن‌ها را بسنج.",
    ),
    "optimization": (
        "network-playground",
        "SGD، مومنتوم و Adam را با تنظیمات ثبت‌شده مقایسه کن.",
    ),
    "regularization": (
        "network-playground",
        "فقط جریمهٔ L1 یا L2 را تغییر بده و خطای اعتبارسنجی را مقایسه کن.",
    ),
    "regularization-techniques": (
        "network-playground",
        "این آزمایش فقط جریمهٔ وزن L1 و L2 دارد؛ برای همین بخش از درس استفاده کن.",
    ),
    "convolution": (
        "convolution",
        "ضرب‌های فیلتر، گام، حاشیه و pooling را روی تصویر کوچک دنبال کن.",
    ),
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


def teaching_sessions(term):
    """Only public slide sessions are steps in the self-study path."""
    return [row for row in term["schedule"] if row["slides"]]


def local_original_urls(term, root):
    """Only verified originals may replace official PDF links in the reader."""
    path = root / f"data/metadata/{term['id']}-slide-identity.json"
    if not path.exists():
        return {}
    records = json.loads(path.read_text())["records"]
    rows = {row['id']: row for row in teaching_sessions(term)}
    result = {}
    seen = set()
    for record in records:
        session = record['session_id']
        if session not in rows or session in seen:
            raise ValueError('Original PDF inventory session mismatch')
        seen.add(session)
        source = rows[session]['slides'][0]
        relative = f"assets/danna/{term['id']}/{session}.pdf"
        if record.get('local_file') != relative or any(record.get(k) != source.get(k) for k in ('url', 'sha256', 'page_count')):
            raise ValueError('Original PDF provenance differs from the official course catalog')
        original = root / relative
        if any(p.is_symlink() for p in (original, *original.parents)) or hashlib.sha256(original.read_bytes()).hexdigest() != record['sha256']:
            raise ValueError('Original PDF bytes changed')
        result[source['url']] = BASE + '/' + relative
    if seen != set(rows):
        raise ValueError('Original PDF inventory is incomplete')
    return result


def page(title, body, crumbs=(), data=None):
    trail = link(f"{BASE}/", "یادگیری ژرف")
    for url, label in crumbs:
        trail += f'<span aria-hidden="true">/</span>{link(url, label)}'
    config = json.dumps(data or {}, ensure_ascii=False).replace("<", "\\u003c")
    return f'''<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)} · یادگیری ژرف</title>
<meta name="description" content="اسلایدهای دانا گوراری، آزمایشگاه، سؤال‌های تستی و کتابخانهٔ دانش">
<link rel="stylesheet" href="{BASE}/assets/course.css">
<script src="{BASE}/assets/course.js" defer></script>
<script src="{BASE}/assets/workshops.js" defer></script></head><body>
<a class="skip" href="#main">رفتن به محتوای درس</a>
<header class="site-header"><div class="header-inner">{link("/", "حسام شینی", class_="brand")}
<nav aria-label="مسیر صفحه">{trail}</nav>{link(f"{BASE}/playgrounds/", "آزمایشگاه‌ها", class_="lab-nav")}</div></header>
<main id="main" class="page-shell">{body}</main>
<footer class="site-footer"><p>استاد: دکتر نگار مجمع</p>
{link(f"{BASE}/sources/", "منابع")}</footer>
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
        rows.append(f'''<li class="term-row"><div><h2>{link(term_url(term), term["title_fa"])}</h2>
<p>{e(TERM_SUMMARIES[term["id"]])}</p><p class="meta">{count} مجموعه اسلاید مرجع
<span data-term-progress="{e(term["id"])}"></span></p></div>{link(term_url(term), "ورود به مسیر ", class_="row-action")}</li>''')
    body = '<section class="standalone"><h1>فهرست اسلایدها</h1><p>هر ترم، ترتیب و منابع اصلی خودش را دارد.</p><ol class="term-list">' + "".join(rows) + '</ol></section>' + progress_tools()
    return page("فهرست ترم‌ها", body, data={"kind": "catalog"})


def term_page(term):
    items = []
    lesson_number = 0
    for row in term["schedule"]:
        if not row["slides"]:
            items.append(
                f'<li class="calendar-note" data-calendar-note="{e(row["id"])}">'
                f"<bdi>{e(row['date_label'])}</bdi> · {e(row['title_fa'])}</li>"
            )
            continue
        lesson_number += 1
        source_count = sum(s.get("page_count", 0) for s in row["slides"])
        status = "اسلاید"
        if row.get("workshop"):
            status += " · کارگاه · سؤال‌ها"
        if row.get("source_reader"):
            status += " · ترجمهٔ فارسی"
        elif row.get("local_slides"):
            status += " · اسلاید فارسی محلی"
        items.append(f'''<li class="session-row" data-session-key="{term["id"]}/{row["id"]}">
<span class="session-number" aria-label="درس {lesson_number}">{lesson_number:02d}</span><div>
<p class="meta"><bdi>{e(row["date_label"])}</bdi>{f" · {source_count} صفحه" if source_count else ""}</p>
<h2>{link(session_url(term, row) + ('slides/' if row.get('source_reader') else ''), row["title_fa"])}</h2>
<p class="session-state">{e(status)}<span data-completion-label></span></p></div></li>''')
    bundle = (
        link(
            BASE + f"/slides/{term['id']}.zip",
            "دریافت اسلایدها، ترجمه و کارگاه‌ها" if any(r.get("source_reader") for r in term["schedule"]) else "دریافت اسلایدهای فارسی و کارگاه‌ها",
            download="",
        )
        if any(r.get("local_slides") or r.get("source_reader") for r in term["schedule"])
        else ""
    )
    body = f"""<div class="term-heading"><h1>{e(term["title_fa"])}</h1>
<p class="lead">{e(TERM_SUMMARIES[term["id"]])}</p><div class="inline-links">
{link(term["course_url"], "برنامه رسمی این ترم ", True)}{link(term["syllabus_url"], "سیلابس اصلی ", True)}
{link(term_url(term) + "foundations/", "مرور پیش‌نیازها")}{link(term_url(term) + "project/", "پروژه پایانی")}{bundle}</div></div>
<ol class="session-list">{"".join(items)}</ol>{progress_tools()}"""
    return page(
        term["title_fa"],
        body,
        [(term_url(term), term["title_fa"])],
        {"term": term["id"]},
    )


def source_panel(term, row, concepts):
    original = "<p>منبع اصلی مباحث: دانا گوراری، دانشگاه کلرادو بولدر. فایل اصلی تغییر نکرده است.</p>"
    for source in row["slides"]:
        url = row.get('local_original_urls', {}).get(source['url'], source['url'])
        preview = (
            ""
            if row.get("local_slides") or row.get("source_reader")
            else f'<button type="button" class="quiet" data-show-source="{e(url)}">نمایش در همین صفحه</button>'
        )
        label = f"دریافت PDF · {source['page_count']} صفحه" if url != source['url'] else f"اسلاید · {source['page_count']} صفحه"
        original += f'<div class="source-document">{link(url, label, True, class_="source-link")}{preview}</div>'
        if url != source['url']:
            original += link(source['url'], 'نشانی رسمی منبع', True)
    mapping = row["mapping"]
    if mapping:
        original += (
            '<details><summary>راهنمای صفحه‌های منبع</summary><ol class="page-guide">'
        )
        for guide in mapping["source_guides"]:
            for part in guide["ranges"]:
                label = f"{part['start']}–{part['end']} · {part['topic_fa']}"
                guide_url = row.get('local_original_urls', {}).get(guide['url'], guide['url'])
                original += f"<li>{link(guide_url + '#page=' + str(part['start']), label, True)}</li>"
        original += "</ol></details>"
    if row.get("source_reader"):
        payload = row["source_reader"]
        url = session_url(term, row) + "slides/"
        content = f'<h2>اسلاید و ترجمهٔ فارسی</h2><p>{prose(str(len(payload["pages"])))} صفحه با ترجمهٔ فارسی.</p>'
        content += f'<div class="source-document">{link(url, "باز کردن اسلاید و ترجمه", class_="local-slide-link")}'
        content += f'<button type="button" class="quiet" data-show-source="{e(url)}" data-source-kind="local" data-preview-target="local-slide-view">نمایش در همین صفحه</button></div>'
        content += link(BASE + f"/slides/{term['id']}.zip", "دریافت اسلاید، ترجمه و تمرین‌ها", class_="bundle-link", download="")
        content += '<details class="original-source"><summary>منبع رسمی و راهنمای صفحه‌ها</summary>' + original + "</details>"
    elif row.get("local_slides"):
        url = session_url(term, row) + "slides/"
        count = len(row["workshop"]["questions"]) + 6
        content = f'<h2>اسلاید آموزشی فارسی</h2><p class="meta">{prose(str(count))} اسلاید محلی برای این جلسه</p>'
        content += f'<div class="source-document">{link(url, "باز کردن اسلایدهای فارسی", class_="local-slide-link")}'
        content += f'<button type="button" class="quiet" data-show-source="{e(url)}" data-source-kind="local" data-preview-target="local-slide-view">نمایش اسلاید فارسی در همین صفحه</button></div>'
        content += link(
            BASE + "/slides/spring-2022.zip",
            "دریافت بستهٔ اسلایدها و تمرین‌ها",
            class_="bundle-link",
            download="",
        )
        content += (
            '<details class="original-source"><summary>منابع</summary>'
            + original
            + "</details>"
        )
    else:
        content = "<h2>کنار درس فارسی</h2>" + original
    if row["companion_ready"]:
        content += '<details class="lesson-outline" open><summary>بخش‌های درس فارسی</summary><nav aria-label="بخش‌های درس"><ol class="page-guide">'
        for identity in mapping["concept_ids"]:
            for section in concepts[identity]["sections"]:
                content += f"<li>{link('#' + identity + '-' + section['id'], section['title_fa'])}</li>"
            content += (
                f"<li>{link('#' + identity + '-exercises', 'تمرین‌های این بحث')}</li>"
            )
        content += "</ol></nav></details>"
    if row.get("workshop"):
        content += '<nav class="activity-nav" aria-label="تمرین جلسه">'
        content += link("#workshop", "کارگاه با کد قابل‌ویرایش")
        content += link("#questions", "پرسش و پاسخ")
        content += link("#source-activities", "پرسش‌ها و فعالیت‌های داخل اسلاید")
        content += "</nav>"
    content += f'<p class="meta">شماره‌های منابع اصلی، ترتیب صفحه‌های PDF هستند.</p>{link(term_url(term), "همه جلسه‌های این ترم ")}'
    return f'<aside class="source-panel" aria-label="منابع و راهنمای اسلاید">{content}</aside>'


def exercise_html(exercise, prefix, code=""):
    if exercise["answer"]["kind"] == "manual":
        return f'<article class="exercise code-tip"><h3>نکته با کد</h3><p>{prose(exercise["solution_fa"])}</p>' + (f'<details><summary>کد این نکته</summary><pre dir="ltr">{e(code)}</pre></details>' if code else "") + '</article>'
    exercise = choice_question(exercise)
    identity = f"{prefix}-{exercise['id']}"
    answer = exercise["answer"]
    config = e(json.dumps(answer, ensure_ascii=False))
    control = ""
    if answer["kind"] == "number":
        control = f'<label for="{identity}-answer">پاسخ عددی</label><input id="{identity}-answer" name="answer" inputmode="decimal" autocomplete="off" required>'
    elif answer["kind"] == "choice":
        control = "<fieldset><legend>یک پاسخ انتخاب کن</legend>"
        for i, option in enumerate(answer["options_fa"]):
            label = f'<bdi dir="ltr">{e(option)}</bdi>' if re.fullmatch(r"[+−-]?[0-9.eE+−-]+", option) else e(option)
            control += f'<label class="choice"><input type="radio" name="answer" value="{i}" required><span>{label}</span></label>'
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
    return f'''<article class="exercise" id="{identity}"><h3>تمرین: {prose(exercise["prompt_fa"])}</h3>
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
    content = '<section class="source-findings" id="corrections"><h2>نکته‌ها و اصلاح‌های منبع</h2>'
    for finding in findings:
        pages = finding.get("pages", [finding.get("page")])
        pages = [p for p in pages if p is not None]
        label = "، ".join(str(p) for p in pages)
        description = finding.get("explanation_fa", finding.get("note_fa", ""))
        if "؛ این بازبینی" in description:
            description = description.split("؛ این بازبینی", 1)[0] + "."
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


def workshop_html(term, row, include_sources=True, include_questions=True):
    unit = row.get("workshop")
    if not unit:
        return ""
    config = json.dumps(
        {
            k: unit[k]
            for k in ("code", "reference", "starter_sha256", "reference_python")
        },
        ensure_ascii=False,
    ).replace("<", "\\u003c")
    questions = "".join(
        exercise_html(q, "workshop-" + row["id"], unit["code"]) for q in unit["questions"]
    )
    activity_links = " · ".join(
        link(unit["source_url"] + f"#page={n}", f"فعالیت کلاسی · صفحهٔ {n}", True)
        for n in unit["class_activity_pages"]
    )
    question_links = " ".join(
        link(unit["source_url"] + f"#page={n}", str(n), True)
        for n in unit["question_pages"]
    )
    source = '<details id="source-activities" class="source-activities"><summary>تطبیق با پرسش‌ها و فعالیت‌های منبع اصلی</summary>'
    if activity_links:
        source += f"<p>{activity_links}</p>"
    source += f'<details><summary>صفحه‌های دارای پرسش یا محاسبهٔ پرسشی در منبع</summary><p class="source-question-links">{question_links}</p><p class="meta">شماره‌ها صفحهٔ PDF هستند؛ برخی صفحه‌ها مراحل متوالی یک پرسش‌اند. این فهرست جای متن اصلی و بررسی کامل علمی آن را نمی‌گیرد.</p></details>'
    if unit["programming_tutorial_pages"]:
        source += '<p class="meta">اسلاید به آموزش برنامه‌نویسی کلاس اصلی اشاره می‌کند. کد و ویدئوی بستهٔ Canvas در دسترس عمومی این مجموعه نیست؛ کارگاه زیر مستقل تألیف شده است.</p>'
    source += "</details>"
    related = unit.get("related_labs", [])
    if include_sources and related:
        source += '<details class="related-labs"><summary>آزمایشگاه مرتبط</summary><ul>'
        for item in related:
            source += f'<li>{prose(item["goal_fa"])} {link(BASE + "/playgrounds/" + item["id"] + "/", LABS[item["id"]][0])}</li>'
        source += '</ul></details>'
    references = " · ".join(
        link(r["url"], r["title_fa"], True) for r in unit.get("references", [])
    )
    limits = unit["limits_fa"].removeprefix(
        "این کد و دادهٔ کوچک، تألیف مستقل برای بررسی سازوکار است؛ بازتولید آزمایش مقاله یا تکلیف رسمی Canvas نیست. "
        "فقط فرمول‌ها و پارامترهایی که در کد می‌بینی محاسبه می‌شوند."
    ).strip()
    return (
        (source if include_sources else "")
        + f'''<section class="lesson-workshop" id="workshop" data-workshop="{e(term["id"])}/{e(row["id"])}">
<h2>کارگاه آموزشی دیپ لرنینگ: {e(unit["title_fa"])}</h2>
<p>{prose(unit["prediction_fa"])}</p>{listing(unit["steps_fa"], True)}

<div class="workshop-grid"><div class="workshop-editor"><label for="workshop-code">کد آزمایش · همهٔ فرمول‌ها قابل‌ویرایش‌اند</label>
<textarea id="workshop-code" data-workshop-code dir="ltr" spellcheck="false" autocapitalize="off" autocomplete="off" aria-describedby="python-help">{e(unit["code"])}</textarea>
<div class="workshop-actions"><button type="button" class="primary" data-workshop-run>اجرای پایتون</button><button type="button" data-workshop-stop disabled>توقف اجرا</button>
<button type="button" data-workshop-reset>کد اولیه</button><button type="button" data-workshop-download>دریافت کد</button></div></div>
<div class="workshop-result"><h3>خروجی کد شما</h3><p data-workshop-status role="status" aria-live="polite">پیش از اجرا خروجی را حدس بزن؛ اجرای خودکار انجام نمی‌شود.</p>
<div data-workshop-result></div><pre data-workshop-console dir="ltr" hidden></pre>
<button type="button" data-workshop-record disabled>دریافت کد و نتیجه</button></div></div>
<details id="python-help"><summary>راهنمای خواندن و تغییر کد</summary><p>متغیرهای بالای کد ورودی‌اند؛ تابع‌ها روش محاسبه‌اند. <bdi dir="ltr"><code>int</code></bdi> عدد صحیح، <bdi dir="ltr"><code>float</code></bdi> عدد اعشاری و <bdi dir="ltr"><code>str</code></bdi> متن است. فهرست داخل <bdi dir="ltr"><code>[]</code></bdi> چند مقدار را کنار هم نگه می‌دارد؛ اندیس‌ها از صفر شروع می‌شوند.</p>
<p><bdi dir="ltr"><code>def</code></bdi> تابع می‌سازد، <bdi dir="ltr"><code>return</code></bdi> خروجی آن را برمی‌گرداند و <bdi dir="ltr"><code>for</code></bdi> محاسبه را تکرار می‌کند. تورفتگی ابتدای خط بخشی از دستور پایتون است. خروجی نهایی باید در یک دیکشنری با نام <bdi dir="ltr"><code>result</code></bdi> قرار بگیرد. عدد اعشاری رایانه تقریبی است؛ تفاوت بسیار کوچک الزاماً خطای الگوریتم نیست.</p>
<p>اجرای نخست محیط پایتون را دریافت می‌کند. هر اجرا از ابتدا آغاز می‌شود؛ کد طولانی را می‌توان متوقف کرد و زمان محاسبه به پنج ثانیه محدود است. متن درس و پاسخ‌ها بدون بارگیری محیط پایتون هم قابل استفاده‌اند.</p></details>
<details class="workshop-reference"><summary>نتیجهٔ کد اولیه</summary><pre dir="ltr">{e(json.dumps(unit["reference"], ensure_ascii=False, indent=2))}</pre></details>
{f'<p class="meta">{e(limits)}</p>' if limits else ''}
{f'<p class="meta">منبع تکمیلی محاسبه: {references}</p>' if references else ""}
<script type="application/json" data-workshop-config>{config}</script></section>'''
        + (
            f'<section id="questions" class="workshop-questions"><h2>سؤال‌های تستی</h2><p>گزینه را انتخاب کن و پاسخ را بررسی کن؛ نکتهٔ توضیحی همراه کد در دسترس است.</p>{questions}</section>'
            if include_questions
            else ""
        )
    )


def slides_page(term, row, identity, teaching):
    unit = row["workshop"]
    slides = []

    def add(title, body, kind=""):
        number = len(slides) + 1
        slides.append(f'''<section class="dl-slide {kind}" id="slide-{number}" data-slide-title="{e(title)}">
<header class="slide-identity"><div><p>کارگاه آموزشی دیپ لرنینگ</p><p>{e(term["title_fa"])} · اسلاید آموزشی مستقل</p></div><img class="deck-logo" src="{BASE}/assets/university-logo.png" alt="نشان مؤسسه آموزش عالی نقش جهان" width="100" height="104"></header>
<div class="slide-content"><h1>{prose(title)}</h1>{body}</div>
<footer class="slide-footer"><p>{e(identity["author_fa"])}</p><p><bdi dir="ltr">{number} / DECK_TOTAL_COUNT</bdi></p></footer></section>''')

    add(
        row["title_fa"],
        f'<p class="cover-topic">{prose(teaching["intro_fa"])}</p><div class="cover-people"><p>ارائه‌دهنده: {e(identity["author_fa"])}</p><p>استاد: {e(identity["supervisor_fa"])}</p></div>',
        "slide-cover",
    )
    add(
        "مسئله و هدف‌های این جلسه",
        f'<div class="slide-copy">{paragraphs([row.get("overview_fa", "")])}{listing(row.get("objectives_fa", []))}</div>',
    )
    ideas = "".join(
        f"<li data-deck-point>{prose(point)}</li>" for point in teaching["ideas_fa"]
    )
    add(
        "مفهوم و سازوکار",
        f'<div class="slide-copy slide-steps"><ol>{ideas}</ol><button type="button" data-deck-step>نکتهٔ بعدی</button></div>',
    )
    preview = {
        k: v for k, v in unit["reference"].items() if not isinstance(v, (list, dict))
    }
    if not preview:
        preview = {
            k: v[:8]
            for k, v in list(unit["reference"].items())[:2]
            if isinstance(v, list)
        }
    add(
        "رابطه و محاسبهٔ نمونه",
        f'<div class="slide-formula"><div class="slide-copy"><figure class="formula"><div dir="ltr">{e(teaching["formula"])}</div></figure><p>{prose(teaching["formula_explanation_fa"])}</p></div><div><p class="meta">بخشی از خروجی ثبت‌شدهٔ کد اولیه</p><pre dir="ltr">{e(json.dumps(preview, ensure_ascii=False, indent=2))}</pre></div></div>',
    )
    add(
        unit["title_fa"],
        '<div class="deck-workbench">'
        + workshop_html(term, row, False, False)
        + '</div><pre class="slide-print-code">'
        + e(unit["code"])
        + "</pre>",
    )
    for i, question in enumerate(unit["questions"], 1):
        add("نکته با کد" if question["answer"]["kind"] == "manual" else f"سؤال تستی · {i}", exercise_html(question, "deck-" + row["id"], unit["code"]))
    source = link(
        unit["source_url"] + "#page=" + str(unit["source_page"]),
        "اسلاید، صفحهٔ " + str(unit["source_page"]),
        True,
    )
    refs = " · ".join(
        link(r["url"], r["title_fa"], True) for r in unit.get("references", [])
    )
    add(
        "جمع‌بندی و منابع",
        f'<div class="slide-copy"><p>{prose(teaching["pitfall_fa"])}</p></div><div class="deck-notes"><p>منبع اصلی مباحث: دانا گوراری، دانشگاه کلرادو بولدر. {source}</p>{f"<p>{refs}</p>" if refs else ""}<p>{link(BASE + "/LICENSE", "مجوز MIT محتوای تألیفی")} · {link(BASE + "/THIRD_PARTY_NOTICES.md", "مجوز اجزای دیگر")}</p></div>',
    )
    context = json.dumps(
        {"term": term["id"], "session": row["id"]}, ensure_ascii=False
    ).replace("<", "\\u003c")
    return f'''<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>کارگاه آموزشی دیپ لرنینگ · {e(row["title_fa"])}</title><link rel="stylesheet" href="{BASE}/assets/course.css"><link rel="stylesheet" href="{BASE}/assets/slides.css">
<script src="{BASE}/assets/course.js" defer></script><script src="{BASE}/assets/workshops.js" defer></script><script src="{BASE}/assets/slides.js" defer></script></head>
<body class="deck-page"><a class="skip" href="#main">رفتن به اسلاید</a><header class="deck-toolbar">{link(session_url(term, row), "بازگشت به درس", data_deck_back="true", target="_top")}<div>{link(BASE + "/slides/spring-2022.zip", "دریافت بستهٔ اسلایدها", download="")}<button type="button" data-deck-print disabled>چاپ / ذخیرهٔ PDF</button><button type="button" data-deck-fullscreen>تمام‌صفحه</button></div></header>
<main id="main" aria-label="اسلایدهای آموزشی فارسی">{"".join(slides).replace("DECK_TOTAL_COUNT", str(len(slides)))}</main><p class="deck-status" data-deck-status role="status"></p>
<footer class="deck-controls" aria-label="پیمایش اسلاید"><button type="button" data-deck-prev disabled>قبلی</button><select data-deck-select aria-label="انتخاب اسلاید" disabled></select><span data-deck-progress aria-live="polite"></span><button type="button" class="primary" data-deck-next disabled>بعدی</button></footer>
<script id="course-context" type="application/json">{context}</script><noscript><p>همهٔ اسلایدها بدون پیمایش تعاملی قابل خواندن‌اند؛ برای کارگاه و بررسی خودکار پاسخ‌ها JavaScript را فعال کن.</p></noscript></body></html>'''


def session_page(term, row, concepts):
    if row.get("source_reader"):
        viewer = session_url(term, row) + "slides/"
        practice = session_url(term, row) + "practice/"
        return f'''<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>{e(row["title_fa"])}</title>
<script>const area=location.hash;location.replace(area==='#workshop'||area==='#source-activities'?"{practice}#code":area==='#questions'?"{practice}#questions":"{viewer}");</script>
<p><a href="{viewer}">اسلاید</a> · <a href="{practice}#code">آزمایشگاه</a> · <a href="{practice}#questions">سؤال‌ها</a> · <a href="{BASE}/knowledge/">کتابخانهٔ دانش</a></p></html>'''
    content = f'<header class="lesson-heading"><h1>{e(row["title_fa"])}</h1></header>'
    content += source_panel(term, row, concepts)
    if row.get("local_slides"):
        content += '<div id="local-slide-view" class="local-slide-view"></div>'
    content += workshop_html(term, row)
    content += findings_html(row)
    lessons = teaching_sessions(term)
    position = lessons.index(row)
    links = []
    if position:
        previous = lessons[position - 1]
        links.append(link(session_url(term, previous), "جلسهٔ قبل: " + previous["title_fa"]))
    if position + 1 < len(lessons):
        following = lessons[position + 1]
        links.append(link(session_url(term, following), "جلسهٔ بعد: " + following["title_fa"]))
    content += '<nav class="lesson-pagination" aria-label="حرکت میان اسلایدها">' + "".join(links) + '</nav>'
    return page(row["title_fa"], '<article class="lesson-body">' + content + '</article>',
                [(term_url(term), term["title_fa"])], {"term": term["id"], "session": row["id"]})


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


def mnist_page(root):
    reference = load_reference(root)
    rows = []
    for run in reference["runs"]:
        chosen = next(h for h in run["history"] if h["epoch"] == run["selected_epoch"])
        kind = run["config"]["model"]
        label = "CNN تألیفی" if kind == "cnn" else "مدل خطی"
        rows.append(f'''<tr data-mnist-model="{e(kind)}"><th scope="row">{e(label)}</th>
<td><bdi>{run["parameter_count"]}</bdi></td><td><bdi>{chosen["train"]["accuracy"]:.2%}</bdi></td>
<td><bdi>{chosen["validation"]["accuracy"]:.2%}</bdi></td><td data-mnist-field="test-accuracy"><bdi>{run["test"]["accuracy"]:.2%}</bdi></td>
<td><bdi>{run["selected_epoch"]}</bdi></td></tr>''')
    parts = reference["runs"][0]["partitions"]
    body = f"""<article class="standalone"><h1>از فیلتر دستی تا شبکه‌ای که یاد می‌گیرد</h1>
<p class="lead">یک CNN کوچک را روی رقم‌های دست‌نویس آموزش بده و با مدل خطی مقایسه کن. این پروژهٔ پایتون روی رایانه اجرا می‌شود.</p>
<h2>پیش از اجرا، پیش‌بینی کن</h2><p>فیلتر مکانی چه اطلاعاتی را نگه می‌دارد که مدل خطی به‌سادگی نمی‌سازد؟ پیش‌بینی کن کدام رقم‌ها بیشتر با هم اشتباه می‌شوند.</p>
{link(BASE + "/playgrounds/cnn-mnist/train/", "شروع آموزش زنده", class_="button primary")}
{link(BASE + "/labs/cnn-mnist/project.zip", "دریافت پروژهٔ پایتون (ZIP)", class_="button", download="")}
<p class="meta">Python 3.12، PyTorch 2.13 و محیط قفل‌شده. مسیر تأییدشده CPU است؛ نصب وابستگی‌ها و دریافت داده در رایانه انجام می‌شود.</p>
<h2>یک اجرای کوچک، سپس آزمایش کامل</h2><ol><li>پروژه را از ZIP خارج کن و در پوشه‌ای که deep-learning قرار دارد، دستورهای زیر را اجرا کن.</li>
<li>ابتدا smoke را برای بررسی نصب و اجرای کد انجام بده؛ دقت آن معیار آموزش کامل نیست.</li>
<li>پنج دورهٔ کامل را با CNN و مدل خطی، با تقسیم یکسان، اجرا کن. ماتریس خطا و recall هر رقم را بررسی کن.</li></ol>
<pre class="run-command" dir="ltr">uv sync --project deep-learning/labs/cnn-mnist --frozen --python 3.12
uv run --project deep-learning/labs/cnn-mnist python deep-learning/labs/cnn-mnist/train.py --smoke --download --output deep-learning/results/smoke
uv run --project deep-learning/labs/cnn-mnist python deep-learning/labs/cnn-mnist/train.py --output deep-learning/results/cnn</pre>
<p>هر خروجی را در پوشه‌ای تازه یا خالی ذخیره کن. راهنمای داخل پروژه، دستور اجرای مدل خطی و مقایسهٔ دو اجرای مستقل را دارد.</p>
<h2>مدل را با چه داده‌ای انتخاب می‌کنیم؟</h2><p>در اجرای مرجع، <bdi>{parts["training"]["count"]}</bdi> تصویر برای آموزش و <bdi>{parts["validation"]["count"]}</bdi> تصویر برای اعتبارسنجی استفاده شد. تقسیم، طبقه‌بندی‌شده و در سطح تصویر است؛ جدایی نویسندگان در اعتبارسنجی ادعا نمی‌شود.</p>
<p>کمترین cross entropy اعتبارسنجی، checkpoint را انتخاب می‌کند. سپس <bdi>{parts["official_test"]["count"]}</bdi> تصویرِ آزمون رسمی یک‌بار ارزیابی می‌شوند. تغییر تنظیمات پس از دیدن آزمون، ارزیابی مستقل تازه‌ای نمی‌سازد.</p>
<details class="reference-results"><summary>نتیجهٔ دو اجرای ثبت‌شدهٔ مجموعه</summary>
<p>پنج دوره، بذر ۷، Adam با نرخ <bdi>0.001</bdi> و دستهٔ ۱۲۸؛ مدل‌ها تقسیم یکسان دارند. این عددها از گزارش اجرای پایتون می‌آیند و نتیجهٔ اجرای تازه در مرورگر نیستند.</p>
<p class="meta">در نمایش کوچک، جدول را افقی حرکت بده.</p>
<div class="reference-scroll" tabindex="0" role="region" aria-label="مقایسهٔ نتیجهٔ دو مدل روی MNIST"><table class="reference-table"><thead><tr><th scope="col">مدل</th><th scope="col">پارامتر</th><th scope="col">دقت آموزش</th><th scope="col">دقت اعتبارسنجی</th><th scope="col">دقت آزمون</th><th scope="col">دورهٔ منتخب</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div>
<p>دورهٔ منتخب، کمترین زیان اعتبارسنجی را دارد؛ لزوماً بیشترین دقت اعتبارسنجی یا آخرین دوره نیست. نتیجهٔ یک بذر و این پروتکل، برتری عمومیِ معماری را اثبات نمی‌کند.</p>
{link(BASE + "/labs/cnn-mnist/reference-results.json", "گزارش کامل، ماتریس خطا و هش‌ها", download="")}</details>
<h2>نتیجه را توضیح بده</h2><ol><li>تعداد وزن و بایاس هر لایه را مستقل حساب کن و با گزارش مقایسه کن.</li><li>از ماتریس خطا، recall رقم‌های ۳ و ۸ را دوباره حساب کن؛ دقت کلی چه چیزی را پنهان می‌کند؟</li><li>پیش از بازکردن نتیجهٔ آزمون، یک طرح برای انتخاب نرخ یادگیری از روی اعتبارسنجی بنویس.</li></ol>
{paragraphs(reference["limits_fa"])}
<div class="inline-links">{link(BASE + "/labs/cnn-mnist/README.md", "راهنمای کامل اجرا")}{link(BASE + "/playgrounds/convolution/", "بررسی دستی کانولوشن")}</div></article>"""
    return page("آموزش CNN روی MNIST", body, [(BASE + "/playgrounds/", "آزمایشگاه‌ها")])


def lab_page(lab, root=ROOT):
    title, description = LABS[lab]
    if lab == "cnn-mnist":
        return mnist_page(root)
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
    body = '<article class="standalone"><h1>منابع</h1><p>دانا گوراری (Danna Gurari) · دانشگاه کلرادو بولدر</p><ul>'
    body += "".join(
        f"<li>{link(t['course_url'], t['title_fa'], True)}</li>"
        for t in course["terms"]
    )
    body += '</ul><p>مجوز اسلایدهای بهار ۲۰۲۶ و ترجمه: CC BY-NC-SA طبق نشان منبع. حقوق تصاویر و منابع دیگر محفوظ است.</p>'
    body += f'<p>{link(BASE + "/LICENSE", "مجوز کد و تمرین‌ها: MIT")} · {link(BASE + "/THIRD_PARTY_NOTICES.md", "مجوز اجزای دیگر")}</p></article>'
    return page("منابع", body)


def build(output, root=ROOT):
    course = load_course(root)
    readers = load_reader_registry(course, root)
    reader_identity = (
        json.loads((root / "content/slide-reader-identity.json").read_text())
        if readers else {}
    )
    output.mkdir(parents=True, exist_ok=True)
    registry_path = root / 'data/metadata/source-readers.json'
    registered_terms = json.loads(registry_path.read_text()).get('terms', {}) if registry_path.exists() else {}
    reader_version = hashlib.sha256(b"".join((root / "assets" / name).read_bytes() for name in ("source-reader.js", "slide-content.js", "source-reader.css", "practice.css", "notebook.js", "practice.js", "webgpu-attention.js", "source-interactives.js", "source-model-app.js", "source-model-app.css", "model-runtime.js", "model-image.js", "model-tokenizer.js", "mnist-training.js", "mnist-training.css", "mnist-training-runtime.js"))).hexdigest()[:16]
    pages = {"catalog/index.html": hub(course), "sources/index.html": sources_page(course),
             "knowledge/index.html": knowledge_page(course["concepts"])}
    initial = BASE + "/terms/spring-2026/s01/slides/"
    enabled = json.dumps(list(readers.get("spring-2026", {})))
    pages["index.html"] = f'''<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>یادگیری ژرف · اسلایدها</title><script>
+let target="{initial}";try{{const saved=JSON.parse(localStorage.getItem('danna-slide-position:v1'));if(saved?.term==='spring-2026'&&{enabled}.includes(saved.session)&&Number.isInteger(saved.page)&&saved.page>0)target='/deep-learning/terms/spring-2026/'+saved.session+'/slides/#page='+saved.page;}}catch{{}}location.replace(target);
+</script><a href="{initial}">اسلایدها</a><a href="{BASE}/catalog/">فهرست ترم‌ها</a></html>'''.replace("\n+", "\n")
    for term in course["terms"]:
        selected = list(readers.get(term['id'], {})) if term['id'] in registered_terms and not (root / f"content/workshops/{term['id']}.json").exists() else None
        workshops = load_workshops(term["id"], root, session_ids=selected)
        originals = local_original_urls(term, root)
        slide_identity, slide_units = load_slides(term["id"], root)
        for row in term["schedule"]:
            unit = workshops.get(row['id'])
            row["workshop"] = {**unit, 'source_url': originals.get(unit['source_url'], unit['source_url'])} if unit else None
            row['local_original_urls'] = originals
            row["local_slides"] = slide_units.get(row["id"])
            row["source_reader"] = readers.get(term["id"], {}).get(row["id"])
            if row["source_reader"]:
                payload = row["source_reader"]
                pages[f"terms/{term['id']}/{row['id']}/practice/index.html"] = practice_page(term, row, (root / "LICENSE").read_text(), reader_version)
                pages[f"terms/{term['id']}/{row['id']}/slides/index.html"] = source_reader_page(term, row, reader_identity, payload, asset_revision=reader_version)
                destination = output / f"source-translations/{term['id']}/{row['id']}.json"
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
                pdf = payload["source"]["local_url"].removeprefix(BASE + "/")
                target = output / pdf
                target.parent.mkdir(parents=True, exist_ok=True)
                if (root / pdf).resolve() != target.resolve():
                    shutil.copyfile(root / pdf, target)
            elif row["local_slides"]:
                pages[f"terms/{term['id']}/{row['id']}/slides/index.html"] = (
                    slides_page(term, row, slide_identity, row["local_slides"])
                )
        for identity, unit in workshops.items():
            destination = output / f"workshops/{term['id']}/{identity}.py"
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(unit["code"], encoding="utf-8")
        prefix = f"terms/{term['id']}"
        pages[f"{prefix}/index.html"] = term_page(term)
        pages[f"{prefix}/project/index.html"] = project_page(term)
        pages[f"{prefix}/foundations/index.html"] = '<!doctype html><meta charset="utf-8"><script>location.replace("/deep-learning/knowledge/#math-python-foundations")</script><a href="/deep-learning/knowledge/#math-python-foundations">کتابخانهٔ دانش</a>'
        for row in teaching_sessions(term):
            pages[f"{prefix}/{row['id']}/index.html"] = session_page(
                term, row, course["concepts"]
            )
    cards = "".join(
        f"<li><h2>{link(f'{BASE}/playgrounds/{lab}/', info[0])}</h2><p>{e(info[1])}</p></li>"
        for lab, info in LABS.items()
    )
    pages["playgrounds/index.html"] = page(
        "آزمایشگاه‌ها",
        f'<section class="standalone"><h1>از پیش‌بینی تا آزمایش</h1><p>آزمایش‌های زندهٔ مرورگر و پروژه‌های مستقل پایتون؛ روش اجرای هرکدام در صفحهٔ خودش مشخص است.</p><ul class="lab-list">{cards}</ul></section>',
    )
    for lab in LABS:
        if lab == "cnn-mnist":
            pages[f"playgrounds/{lab}/index.html"] = lab_page(lab, root)
        else:
            target = f"{BASE}/runtime/{lab}/"
            pages[f"playgrounds/{lab}/index.html"] = (
                f'<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>کارگاه آموزشی دیپ لرنینگ</title><script>location.replace("{target}")</script><p><a href="{target}">باز کردن کارگاه آموزشی دیپ لرنینگ</a></p></html>'
            )
            pages[f"playgrounds/{lab}/guide/index.html"] = lab_page(lab, root)
    for name, html in pages.items():
        path = output / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(html, encoding="utf-8")
    assets = output / "assets"
    assets.mkdir(exist_ok=True)
    for name in (
        "course.css",
        "course.js",
        "workshops.js",
        "workshop-worker.mjs",
        "slides.css",
        "slides.js",
        "university-logo.png",
        "university-logo.source.json",
        "source-reader.js",
        "slide-content.js",
        "source-reader.css",
        "notebook.js", "notebook.css", "notebook_kernel.py", "notebook-worker.mjs",
        "practice.js", "practice.css", "knowledge.js",
        "python-tools.js", "python-tools-worker.mjs", "notebook_support.py",
        "notebook-results.js", "webgpu-attention.js",
    ):
        if (root / "assets" / name).resolve() != (assets / name).resolve():
            shutil.copyfile(root / "assets" / name, assets / name)
    if (root / "assets/source-reader.js").resolve() != (assets / "source-reader.js").resolve():
        content_version = hashlib.sha256((root / "assets/slide-content.js").read_bytes()).hexdigest()[:16]
        script = assets / "source-reader.js"
        script.write_text(script.read_text().replace("'./slide-content.js'", f"'./slide-content.js?v={content_version}'"))
        practice = assets / "practice.js"
        content = practice.read_text()
        for name in ("notebook.js", "webgpu-attention.js", "notebook-results.js"):
            version = hashlib.sha256((root / "assets" / name).read_bytes()).hexdigest()[:16]
            content = content.replace(f"'./{name}'", f"'./{name}?v={version}'")
        practice.write_text(content)
    for name in ("pyodide.mjs", "pyodide-LICENSE.json"):
        source = root / "assets/vendor" / name
        target = assets / "vendor" / name
        target.parent.mkdir(exist_ok=True)
        if source.resolve() != target.resolve():
            shutil.copyfile(source, target)
    for name in ("LICENSE", "THIRD_PARTY_NOTICES.md"):
        shutil.copyfile(root / name, output / name)
    from package_slides import declared_vendor_files, package_slides, package_source_readers

    if readers:
        for vendor in ("pdfjs", "katex", "python-editor", "python-tools"):
            for name in declared_vendor_files(root, vendor):
                source = root / "assets/vendor" / vendor / name
                target = assets / "vendor" / vendor / name
                target.parent.mkdir(parents=True, exist_ok=True)
                if source.resolve() != target.resolve():
                    shutil.copyfile(source, target)

    from source_models import build_model_pages
    from source_animations import build_animation_pages
    from source_experiments import experiment_files
    from mnist_training import build_mnist_training
    build_model_pages(root, output, asset_revision=reader_version)
    build_mnist_training(root, output, asset_revision=reader_version)
    build_animation_pages(root, output)
    for name in experiment_files(root):
        source, destination = root / name, output / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        if source.resolve() != destination.resolve():
            shutil.copyfile(source, destination)
    if (root / 'assets').resolve() != assets.resolve():
        for module in ('source-model-app.js', 'model-runtime.js', 'mnist-training.js'):
            script = assets / module
            content = script.read_text()
            for dependency in ('model-runtime.js', 'model-tokenizer.js', 'model-image.js', 'mnist-training-runtime.js'):
                content = content.replace('./' + dependency + "'", './' + dependency + '?v=' + reader_version + "'")
            script.write_text(content)

    package_slides(output, root)
    if os.environ.get("DANNA_SOURCE_DRAFT") != "1":
        for term_id, sessions in readers.items():
            package_source_readers(output, term_id, sessions, root=root)
    return len(pages)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(f"Rendered {build(args.output)} course pages in {args.output}")


if __name__ == "__main__":
    main()
