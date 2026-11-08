"""Validate independent workshops without changing source-review readiness."""

import argparse
import hashlib
import json
import math
import re
import subprocess
import sys

from course_content import check_exercise
from source_catalog import ROOT, require
from source_activities import load_activities


def load_workshops(term_id, root=ROOT, execute=False, session_ids=None):
    selected = None if session_ids is None else set(session_ids)
    if selected == set():
        return {}
    path = root / f"content/workshops/{term_id}.json"
    complete_document = path.exists()
    if complete_document:
        document = json.loads(path.read_text())
    else:
        fragments = sorted(p for p in (root / f'content/workshops/{term_id}').glob('s*.json')
                           if selected is None or p.stem in selected)
        if not fragments:
            registry = root / 'data/metadata/source-readers.json'
            if registry.exists():
                registered = json.loads(registry.read_text()).get('terms', {}).get(term_id, [])
                require(not registered, 'Every enabled source reader needs its own workshop')
            return {}
        document = {'schema_version': 1, 'term_id': term_id,
                    'sessions': [json.loads(p.read_text()) for p in fragments]}
    require(document["schema_version"] == 1, "Unknown workshop schema")
    require(document["term_id"] == term_id, "Wrong workshop term")
    term = json.loads((root / f"data/metadata/{term_id}.json").read_text())["term"]
    rows = {r["id"]: r for r in term["schedule"] if r["slides"]}
    result = {}
    for unit in document["sessions"]:
        identity = unit["session_id"]
        if selected is not None and identity not in selected:
            continue
        require(identity in rows and identity not in result, "Invalid workshop session")
        source = rows[identity]["slides"][0]
        for key, original in (
            ("source_sha256", "sha256"),
            ("source_url", "url"),
            ("source_page_count", "page_count"),
        ):
            require(unit[key] == source[original], "Workshop source changed")
        for key in (
            "question_pages",
            "class_activity_pages",
            "programming_tutorial_pages",
        ):
            pages = unit[key]
            require(pages == sorted(set(pages)), "Duplicate or unordered source page")
            require(
                all(type(p) is int and 1 <= p <= source["page_count"] for p in pages),
                "Workshop page outside PDF",
            )
        require(
            set(unit["class_activity_pages"]) <= set(unit["question_pages"]),
            "Class activity missing from source index",
        )
        require(
            1 <= unit["source_page"] <= source["page_count"], "Invalid workshop page"
        )
        require(
            unit["title_fa"] and unit["prediction_fa"] and unit["steps_fa"],
            "Empty workshop",
        )
        require(len(unit["questions"]) >= 3, "Workshop needs questions and answers")
        ids = [q["id"] for q in unit["questions"]]
        require(len(ids) == len(set(ids)), "Duplicate workshop question")
        for question in unit["questions"]:
            check_exercise(question)
            require(
                1 <= question["source_page"] <= source["page_count"],
                "Question page outside PDF",
            )
        kinds = {q["answer"]["kind"] for q in unit["questions"]}
        require(
            kinds in ({"number", "choice", "manual"}, {"choice"}), "Workshop question variety missing"
        )
        code = (root / f"workshops/{term_id}/{identity}.py").read_text()
        require(
            hashlib.sha256(code.encode()).hexdigest() == unit["starter_sha256"],
            "Workshop code hash changed",
        )
        compile(code, f"{identity}.py", "exec")
        json.dumps(unit["reference"], allow_nan=False)
        require(
            isinstance(unit["reference"], dict) and unit["reference"], "Empty reference"
        )
        if execute:
            run = subprocess.run(
                [
                    sys.executable,
                    "-I",
                    "-c",
                    code + "\nimport json\nprint(json.dumps(result,allow_nan=False))",
                ],
                check=True,
                capture_output=True,
                text=True,
                timeout=5,
            )
            # A learner-facing example may print its intermediate values. The
            # appended final JSON is the authoritative result for this check.
            actual = json.loads(run.stdout.splitlines()[-1])
            require(
                equal_results(actual, unit["reference"]),
                f"{identity}: reference differs from Python",
            )
        examples = unit.get("source_examples", [])
        require(isinstance(examples, list), "Invalid source examples")
        loaded_examples, example_ids, example_pages = [], set(), set()
        for example in examples:
            name = example.get("id") if isinstance(example, dict) else None
            require(isinstance(name, str) and re.fullmatch(r"[a-z][a-z0-9-]{0,40}", name)
                    and name not in example_ids, "Invalid source example identity")
            example_ids.add(name)
            pages = example.get("pages")
            require(isinstance(pages, list) and pages
                    and all(type(n) is int and 1 <= n <= source["page_count"] for n in pages)
                    and pages == sorted(set(pages)) and not set(pages) & example_pages,
                    "Invalid source example pages")
            example_pages.update(pages)
            filename = f"{identity}_{name.replace('-', '_')}.py"
            require(example.get("code_file") == filename and example.get("title_fa"),
                    "Invalid source example code file")
            example_path = root / f"workshops/{term_id}/{filename}"
            require(not example_path.is_symlink(), "Symlink source example")
            example_code = example_path.read_text()
            require(hashlib.sha256(example_code.encode()).hexdigest() == example.get("starter_sha256"),
                    "Source example code hash changed")
            compile(example_code, filename, "exec")
            require(isinstance(example.get("reference"), dict) and example["reference"],
                    "Missing source example reference")
            json.dumps(example["reference"], allow_nan=False)
            questions = example.get("questions")
            require(isinstance(questions, list) and len(questions) >= 3,
                    "Source example needs questions")
            for question in questions:
                check_exercise(question)
                require(question.get("source_kind") == "original"
                        and question.get("source_page") in pages
                        and question["answer"]["kind"] == "choice", "Invalid source example question")
            if execute:
                run = subprocess.run([sys.executable, "-I", "-c", example_code
                    + "\nimport json\nprint(json.dumps(result,allow_nan=False))"],
                    check=True, capture_output=True, text=True, timeout=5)
                require(equal_results(json.loads(run.stdout.splitlines()[-1]), example["reference"]),
                        "Source example differs from Python")
            loaded_examples.append({**example, "code": example_code})
        activities = load_activities(root, term_id, identity)
        result[identity] = {**unit, "code": code, "source_examples": loaded_examples,
                            "activities": activities}
    if selected is not None:
        require(set(result) == selected, 'Requested workshop is missing')
    elif complete_document:
        require(set(result) == set(rows), "Every slide session needs its own workshop")
    registry = root / 'data/metadata/source-readers.json'
    if registry.exists() and selected is None:
        registered = json.loads(registry.read_text()).get('terms', {}).get(term_id, [])
        require(set(registered) <= set(result), 'Every enabled source reader needs its own workshop')
    return result


def equal_results(actual, expected):
    if isinstance(actual, dict) and isinstance(expected, dict):
        return actual.keys() == expected.keys() and all(
            equal_results(actual[k], expected[k]) for k in actual
        )
    if isinstance(actual, list) and isinstance(expected, list):
        return len(actual) == len(expected) and all(
            equal_results(a, b) for a, b in zip(actual, expected)
        )
    if type(actual) in (float, int) and type(expected) in (float, int):
        return math.isclose(actual, expected, rel_tol=1e-10, abs_tol=1e-12)
    return actual == expected


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--term", default="spring-2022")
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--session", action="append", help="Validate only these session units")
    args = parser.parse_args()
    units = load_workshops(args.term, execute=args.execute, session_ids=args.session)
    print(
        json.dumps(
            {
                "term": args.term,
                "workshops": len(units),
                "questions": sum(len(u["questions"]) for u in units.values()),
                "executed": args.execute,
            }
        )
    )
