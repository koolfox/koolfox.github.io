"""Hash-bound inventory and source-specific study questions for every course page."""

import json
from pathlib import Path

from course_content import check_exercise
from source_catalog import require

CLASSIFICATIONS = {"administrative", "content", "conceptual_question", "worked_example", "figure_review"}
REVIEW_STATES = {"pending", "reviewed"}


def load_activities(root, term_id, session_id):
    path = Path(root) / f"content/activities/{term_id}/{session_id}.json"
    if not path.exists():
        return None
    require(not path.is_symlink(), "Symlink activity inventory")
    document = json.loads(path.read_text())
    source = json.loads((Path(root) / f"content/source-slides/{term_id}/{session_id}.json").read_text())
    require(document.get("schema_version") == 1 and document.get("term_id") == term_id
            and document.get("session_id") == session_id, "Invalid activity identity")
    require(document.get("source_sha256") == source["source"]["sha256"], "Stale activity source")
    pages = document.get("pages")
    require(isinstance(pages, list) and len(pages) == len(source["pages"]), "Incomplete activity page inventory")
    questions = document.get("questions")
    require(isinstance(questions, list), "Invalid activity questions")
    by_id = {}
    for question in questions:
        check_exercise(question)
        identity = question["id"]
        require(identity not in by_id, "Duplicate activity question")
        require(question.get("source_kind") == "original" and question["answer"]["kind"] == "choice",
                "Activity study questions must be original multiple choice")
        covered = question.get("pages", [question.get("source_page")])
        require(isinstance(covered, list) and covered
                and all(type(n) is int and 1 <= n <= len(pages) for n in covered)
                and covered == sorted(set(covered)) and question.get("source_page") in covered,
                "Invalid activity question pages")
        require(question.get("reviewed") is True, "Unreviewed activity question")
        by_id[identity] = question
    for number, (page, original) in enumerate(zip(pages, source["pages"]), 1):
        require(page.get("number") == number and page.get("source_text_sha256") == original["source_text_sha256"],
                "Stale activity page identity")
        require(page.get("classification") in CLASSIFICATIONS
                and page.get("review_status") in REVIEW_STATES, "Invalid activity review state")
        ids = page.get("question_ids")
        require(isinstance(ids, list) and len(ids) == len(set(ids))
                and all(q in by_id and number in by_id[q].get("pages", [by_id[q]["source_page"]]) for q in ids),
                "Invalid activity page question references")
        if page.get("question_coverage") in {"complete", "partial"}:
            require(page["review_status"] == "reviewed" and bool(ids), "Unsupported activity completion claim")
        else:
            require(page.get("question_coverage") in {"pending", "not_applicable"}, "Invalid question coverage state")
    for identity, question in by_id.items():
        for number in question.get("pages", [question["source_page"]]):
            require(identity in pages[number - 1]["question_ids"], "Unlinked activity question page")
    return document
