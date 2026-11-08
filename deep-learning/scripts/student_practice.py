"""Short reference tools and multiple-choice practice beside source slides."""

import ast
import copy
import hashlib
import json
from html import escape

BASE = "/deep-learning"


def choice_question(question):
    result = copy.deepcopy(question)
    answer = result["answer"]
    if answer["kind"] == "choice":
        return result
    if answer["kind"] != "number":
        raise ValueError("Reasoning prompts become code tips, not invented quizzes")
    value, tolerance = answer["value"], answer["tolerance"]
    step = max(abs(value) / 2, tolerance * 20, 0.1)
    candidates = [value + step, value - step, value + 2 * step]
    correct = int(hashlib.sha256(result["id"].encode()).hexdigest()[:2], 16) % 4
    candidates.insert(correct, value)
    result["answer"] = {"kind": "choice", "options_fa": [format(v, ".12g") for v in candidates], "correct_index": correct}
    return result


def code_cells(code):
    """Split only between complete top-level statements; preserve every byte."""
    tree = ast.parse(code)
    lines = code.splitlines(keepends=True)
    boundaries = [0]
    for fraction in (1 / 3, 2 / 3):
        target = len(lines) * fraction
        possible = [n.lineno - 1 for n in tree.body if n.lineno - 1 > boundaries[-1]]
        if possible:
            point = min(possible, key=lambda n: abs(n - target))
            if point < len(lines):
                boundaries.append(point)
    boundaries.append(len(lines))
    titles = ["ورودی‌ها و تعریف‌ها", "محاسبه", "گزارش خروجی"]
    cells = [{"title": titles[min(i, 2)], "source": "".join(lines[start:end])}
             for i, (start, end) in enumerate(zip(boundaries, boundaries[1:]))]
    assert "".join(c["source"] for c in cells) == code
    return cells


def _questions_for(unit):
    questions, tip = [], None
    for original in unit["questions"]:
        if original["answer"]["kind"] == "manual":
            tip = {"explanation": original["solution_fa"], "code": unit["code"]}
            continue
        question = choice_question(original)
        answer = question["answer"]
        questions.append({"prompt": question["prompt_fa"], "options": answer["options_fa"],
                          "correct": answer["correct_index"], "explanation": question["solution_fa"],
                          "source_page": question["source_page"]})
    return questions, tip


def practice_page(term, row, license_text="", asset_revision=""):
    unit = row["workshop"]
    questions, tip = _questions_for(unit)
    config = {"key": term["id"] + "/" + row["id"], "cells": code_cells(unit["code"]),
              "questions": questions, "tip": tip, "filename": term["id"] + "-" + row["id"],
              "starter": unit["code"], "starter_sha256": unit["starter_sha256"], "license_text": license_text,
              "source_url": unit["source_url"], "source_sha256": unit["source_sha256"],
              "source_page": unit["source_page"], "source_page_count": unit["source_page_count"], "reference": unit["reference"],
              "source_pages": unit["question_pages"], "activity_pages": unit["class_activity_pages"],
              "related_labs": [{**lab, "url": f"{BASE}/runtime/{lab['id']}/?term={term['id']}&session={row['id']}&page={unit['source_page']}"} for lab in unit.get("related_labs", [])],
              "reader": f"{BASE}/terms/{term['id']}/{row['id']}/slides/"}
    config["page_notebooks"] = []
    for example in unit.get("source_examples", []):
        questions, tip = _questions_for(example)
        config["page_notebooks"].append({"pages": example["pages"],
            "key": config["key"] + "/" + example["id"], "title": example["title_fa"],
            "filename": config["filename"] + "-" + example["id"],
            "cells": code_cells(example["code"]), "starter": example["code"],
            "starter_sha256": example["starter_sha256"], "reference": example["reference"],
            "questions": questions, "tip": tip, "related_labs": [],
            "source_pages": [n for n in unit["question_pages"] if n in example["pages"]],
            "activity_pages": [n for n in unit["class_activity_pages"] if n in example["pages"]]})
    config["page_questions"] = []
    config["page_activity_states"] = []
    activities = unit.get("activities")
    if activities:
        by_id = {question["id"]: question for question in activities["questions"]}
        for page in activities["pages"]:
            config["page_activity_states"].append({key: page[key] for key in
                ("number", "classification", "review_status", "question_coverage")})
            if not page["question_ids"]:
                continue
            questions, _ = _questions_for({"questions": [by_id[identity] for identity in page["question_ids"]],
                                          "code": unit["code"]})
            config["page_questions"].append({"pages": [page["number"]], "questions": questions})
    encoded = json.dumps(config, ensure_ascii=False).replace("<", "\\u003c")
    return f'''<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>کارگاه آموزشی دیپ لرنینگ · {escape(row['title_fa'])}</title><link rel="stylesheet" href="{BASE}/assets/course.css"><link rel="stylesheet" href="{BASE}/assets/notebook.css?v={asset_revision}"><link rel="stylesheet" href="{BASE}/assets/practice.css?v={asset_revision}"><script type="module" src="{BASE}/assets/practice.js?v={asset_revision}"></script></head>
<body class="practice-page"><header><h1>{escape(unit['title_fa'])}</h1><nav data-related-labs></nav></header>
<main id="practice-notebook"></main><footer><a href="{config['reader']}#page={unit['source_page']}" data-return-slide aria-label="بازگشت به اسلاید" title="بازگشت به اسلاید"><svg class="practice-back-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m0 0 6-6m-6 6 6 6"/></svg><span>بازگشت به اسلاید</span></a></footer>
<script type="application/json" id="practice-config">{encoded}</script></body></html>'''


def knowledge_page(concepts):
    entries = []
    for concept in concepts.values():
        glossary = "".join(f'<dt>{escape(item["term_fa"])} <bdi dir="ltr">({escape(item["term_en"])})</bdi></dt><dd>{escape(item["definition_fa"])}</dd>' for item in concept.get("glossary", []))
        formulas = []
        for section in concept.get("sections", []):
            for formula in section.get("formulas", []):
                formulas.append(f'<figure><div dir="ltr">{escape(formula["expression"])}</div><figcaption>{escape(formula["explanation_fa"])}</figcaption></figure>')
        entries.append(f'<article data-knowledge-entry id="{escape(concept["id"])}"><h2>{escape(concept["title_fa"])}</h2><p>{escape(concept["summary_fa"])}</p><dl>{glossary}</dl>{"".join(formulas)}</article>')
    return f'''<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>کتابخانهٔ دانش دیپ لرنینگ</title><link rel="stylesheet" href="{BASE}/assets/course.css"><link rel="stylesheet" href="{BASE}/assets/practice.css"><script src="{BASE}/assets/knowledge.js" defer></script></head>
<body class="knowledge-page"><header><h1>کتابخانهٔ دانش</h1><label for="knowledge-search">جست‌وجوی واژه یا رابطه</label><input type="search" id="knowledge-search" autocomplete="off"><p data-search-count role="status"></p></header><main>{"".join(entries)}<p data-no-results hidden>واژه‌ای پیدا نشد؛ اصطلاح انگلیسی یا عبارت کوتاه‌تر را امتحان کن.</p></main></body></html>'''
