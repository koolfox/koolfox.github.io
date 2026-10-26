"""Validate original lessons, semester mappings and executable worked examples."""

import argparse
import json
import math
import re
import subprocess
import sys

from review_ledger import RESOLVED, audit
from source_catalog import ROOT, TERMS, require

ID = re.compile(r"^[a-z0-9][a-z0-9-]*$")


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def check_exercise(exercise):
    require(ID.fullmatch(exercise["id"]), "Invalid exercise id")
    require(exercise["source_kind"] == "original", "Exercise attribution missing")
    require(exercise["prompt_fa"] and exercise["solution_fa"], "Empty exercise")
    answer = exercise["answer"]
    kind = answer["kind"]
    if kind == "number":
        require(math.isfinite(answer["value"]), "Answer must be finite")
        tolerance = answer.get("tolerance", 0)
        require(math.isfinite(tolerance) and tolerance >= 0, "Invalid tolerance")
    elif kind == "choice":
        options = answer["options_fa"]
        require(len(options) >= 2, "Choice needs alternatives")
        index = answer["correct_index"]
        require(isinstance(index, int) and 0 <= index < len(options), "Invalid choice")
    elif kind == "manual":
        require(bool(answer.get("criteria_fa")), "Reasoning exercise needs criteria")
    else:
        raise ValueError(f"Unsupported answer kind: {kind}")


def check_concept(concept, execute=False):
    require(ID.fullmatch(concept["id"]), "Invalid concept id")
    for field in ("title_fa", "summary_fa", "objectives_fa", "sections", "exercises"):
        require(bool(concept[field]), f"Missing {field}")
    section_ids = [s["id"] for s in concept["sections"]]
    require(len(section_ids) == len(set(section_ids)), "Duplicate section id")
    for section in concept["sections"]:
        require(section["title_fa"] and section["paragraphs_fa"], "Empty section")
    for exercise in concept["exercises"]:
        check_exercise(exercise)
    kinds = {e["answer"]["kind"] for e in concept["exercises"]}
    require("manual" in kinds and kinds & {"number", "choice"}, "Exercise variety")
    for example in concept.get("worked_examples", []):
        verification = example.get("verification")
        if execute and verification and verification["kind"] == "python":
            subprocess.run(
                [sys.executable, "-I", "-c", verification["code"]],
                check=True,
                timeout=10,
                capture_output=True,
                text=True,
            )


def reviewed(record):
    return bool(record and record["pages"]) and all(
        p["text_reviewed"]
        and p["visual_reviewed"]
        and p["scientific_status"] in RESOLVED
        for p in record["pages"]
    )


def load_course(root=ROOT, execute=False):
    review_summary = audit(root)
    concepts = {}
    for path in sorted((root / "content/concepts").glob("*.json")):
        concept = read(path)
        require(path.stem == concept["id"], f"{path}: identity mismatch")
        check_concept(concept, execute)
        concepts[concept["id"]] = concept
    terms = []
    for term_id in TERMS:
        term = read(root / f"data/metadata/{term_id}.json")["term"]
        for row in term["schedule"]:
            mapping_path = root / f"content/terms/{term_id}/{row['id']}.json"
            mapping = read(mapping_path) if mapping_path.exists() else None
            review_path = root / f"data/reviews/{term_id}/{row['id']}.json"
            review = read(review_path) if review_path.exists() else None
            if mapping:
                require(
                    mapping["term_id"] == term_id
                    and mapping["session_id"] == row["id"],
                    f"{mapping_path}: identity mismatch",
                )
                sources = {s["sha256"]: s for s in row.get("slides", [])}
                guide_ids = [guide["sha256"] for guide in mapping["source_guides"]]
                require(
                    len(guide_ids) == len(set(guide_ids))
                    and set(guide_ids) == set(sources),
                    f"{mapping_path}: every source needs exactly one page guide",
                )
                for guide in mapping["source_guides"]:
                    source = sources.get(guide["sha256"])
                    require(source and guide["url"] == source["url"], "Wrong source")
                    covered = set()
                    for part in guide["ranges"]:
                        require(
                            1 <= part["start"] <= part["end"] <= source["page_count"],
                            f"{mapping_path}: source range outside PDF",
                        )
                        covered.update(range(part["start"], part["end"] + 1))
                    require(
                        covered == set(range(1, source["page_count"] + 1)),
                        f"{mapping_path}: incomplete source guide",
                    )
                for exercise in mapping.get("additional_exercises", []):
                    check_exercise(exercise)
            row["mapping"] = mapping
            row["review"] = review
            row["companion_ready"] = bool(
                mapping
                and mapping["concept_ids"]
                and all(c in concepts for c in mapping["concept_ids"])
                and reviewed(review)
            )
        terms.append(term)
    return {"terms": terms, "concepts": concepts, "review_summary": review_summary}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--examples", action="store_true")
    parser.add_argument("--require-complete", action="store_true")
    args = parser.parse_args()
    course = load_course(execute=args.examples)
    rows = [r for t in course["terms"] for r in t["schedule"] if r["slides"]]
    ready = sum(r["companion_ready"] for r in rows)
    totals = course["review_summary"]["totals"]
    print(
        json.dumps(
            {
                "concepts": len(course["concepts"]),
                "ready_sessions": ready,
                "source_sessions": len(rows),
                "review": totals,
            },
            indent=2,
        )
    )
    if args.require_complete:
        require(ready == len(rows), "Some source sessions lack a complete companion")
        require(totals["fully_reviewed"] == totals["source_pages"], "Review incomplete")


if __name__ == "__main__":
    main()
