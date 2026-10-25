"""Initialize and audit page-level review evidence without inventing completion."""

import argparse
import json
from pathlib import Path

from source_catalog import ROOT, TERMS, require

RESOLVED = {"checked", "context_only", "clarification", "verified_error"}
STATES = RESOLVED | {"pending", "needs_verification"}


def source_documents(root=ROOT):
    for term_id in TERMS:
        term = json.loads((root / f"data/metadata/{term_id}.json").read_text())["term"]
        for row in term["schedule"]:
            slides = [
                s for s in row.get("slides", []) if s.get("download_status") == "ok"
            ]
            if slides:
                yield term_id, row, slides


def initialize(root=ROOT):
    created = 0
    for term_id, row, slides in source_documents(root):
        path = root / f"data/reviews/{term_id}/{row['id']}.json"
        if path.exists():
            continue
        record = {
            "schema_version": 1,
            "term_id": term_id,
            "session_id": row["id"],
            "reviewer": None,
            "reviewed_at_utc": None,
            "method": None,
            "sources": [
                {"url": s["url"], "sha256": s["sha256"], "page_count": s["page_count"]}
                for s in slides
            ],
            "pages": [
                {
                    "sha256": s["sha256"],
                    "page": page,
                    "text_reviewed": False,
                    "visual_reviewed": False,
                    "scientific_status": "pending",
                    "note_fa": "",
                    "concept_ids": [],
                    "visual_evidence": None,
                    "evidence_urls": [],
                }
                for s in slides
                for page in range(1, s["page_count"] + 1)
            ],
            "findings": [],
        }
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("x", encoding="utf-8") as stream:
            json.dump(record, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
        created += 1
    return created


def audit(root=ROOT):
    totals = {
        "source_pages": 0,
        "text_reviewed": 0,
        "visual_reviewed": 0,
        "resolved": 0,
        "fully_reviewed": 0,
        "decks_complete": 0,
        "decks": 0,
    }
    by_term = {}
    for term_id, row, slides in source_documents(root):
        path = root / f"data/reviews/{term_id}/{row['id']}.json"
        record = json.loads(path.read_text())
        require(
            record["term_id"] == term_id and record["session_id"] == row["id"],
            f"{path}: identity mismatch",
        )
        expected = {
            (s["sha256"], n) for s in slides for n in range(1, s["page_count"] + 1)
        }
        actual = [(p["sha256"], p["page"]) for p in record["pages"]]
        require(
            len(actual) == len(set(actual)) and set(actual) == expected,
            f"{path}: missing, duplicate or unexpected source pages",
        )
        term_totals = by_term.setdefault(term_id, {k: 0 for k in totals})
        completed = 0
        for page in record["pages"]:
            state = page["scientific_status"]
            require(state in STATES, f"{path}: unsupported review state")
            if page["text_reviewed"] or page["visual_reviewed"] or state != "pending":
                require(
                    bool(record["reviewer"])
                    and bool(record["reviewed_at_utc"])
                    and bool(page["note_fa"]),
                    f"{path}: review claim lacks attribution/note",
                )
            if page["visual_reviewed"]:
                require(
                    bool(page["visual_evidence"]),
                    f"{path}: visual claim lacks evidence",
                )
            resolved = state in RESOLVED
            full = page["text_reviewed"] and page["visual_reviewed"] and resolved
            completed += int(full)
            for key, value in [
                ("source_pages", 1),
                ("text_reviewed", page["text_reviewed"]),
                ("visual_reviewed", page["visual_reviewed"]),
                ("resolved", resolved),
                ("fully_reviewed", full),
            ]:
                totals[key] += int(value)
                term_totals[key] += int(value)
        for counter in (totals, term_totals):
            counter["decks"] += len(slides)
            counter["decks_complete"] += (
                len(slides) if completed == len(expected) else 0
            )
    return {"schema_version": 1, "totals": totals, "terms": by_term}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--initialize", action="store_true")
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.initialize:
        print(f"Initialized {initialize(args.root)} source review files")
    summary = audit(args.root)
    encoded = json.dumps(summary, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(encoded, encoding="utf-8")
    print(encoded)


if __name__ == "__main__":
    main()
