"""Validate the five official semester inventories; never publish lecture copies.

Run from the repository root:
    python3 deep-learning/scripts/source_catalog.py
    python3 deep-learning/scripts/source_catalog.py --output /tmp/danna-index.json

Requires Python 3.11+. This checks recorded evidence, not remote availability or scientific correctness.
Downloads, extraction, content review, and teaching readiness are separate states.
"""

import argparse
import json
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
TERMS = ("spring-2026", "spring-2025", "spring-2024", "fall-2022", "spring-2022")
REVIEW_STATES = {
    "unreviewed",
    "text_extracted",
    "partial",
    "text_reviewed",
    "visually_reviewed",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def valid_url(value):
    parsed = urlparse(value or "")
    return parsed.scheme in {"http", "https"} and bool(parsed.hostname)


def inspect_term(document, expected_id):
    require(document.get("schema_version") == 1, f"{expected_id}: unknown schema")
    term = document["term"]
    require(term["id"] == expected_id, f"{expected_id}: semester identity mismatch")
    require(valid_url(term["course_url"]), f"{expected_id}: invalid official URL")
    retrieved = datetime.fromisoformat(term["retrieved_at_utc"])
    require(
        retrieved.utcoffset() is not None
        and retrieved.utcoffset().total_seconds() == 0,
        f"{expected_id}: retrieval must be a UTC timestamp",
    )
    rows = term["schedule"]
    require(bool(rows), f"{expected_id}: empty schedule")
    ids = [row["id"] for row in rows]
    require(len(ids) == len(set(ids)), f"{expected_id}: duplicate session IDs")
    require(
        [row["order"] for row in rows] == list(range(1, len(rows) + 1)),
        f"{expected_id}: schedule order is not contiguous",
    )
    decks = {}
    failed = []
    review_counts = {}
    for row in rows:
        require(
            bool(row["title_en"]) and bool(row["title_fa"]),
            f"{expected_id}/{row['id']}: missing bilingual title",
        )
        for slide in row.get("slides", []):
            location = f"{expected_id}/{row['id']}: {slide.get('url')}"
            require(valid_url(slide.get("url")), f"{location}: invalid slide URL")
            status = slide.get("review_status", "unreviewed")
            require(
                status in REVIEW_STATES, f"{location}: unknown review status {status}"
            )
            if slide.get("download_status") != "ok":
                failed.append(slide["url"])
                require(
                    status == "unreviewed",
                    f"{location}: unavailable source claims review",
                )
                continue
            require(
                bool(re.fullmatch(r"[0-9a-f]{64}", slide.get("sha256", ""))),
                f"{location}: missing SHA-256",
            )
            require(
                isinstance(slide.get("page_count"), int) and slide["page_count"] > 0,
                f"{location}: missing PDF page count",
            )
            if slide.get("final_url") is not None:
                require(valid_url(slide["final_url"]), f"{location}: invalid final URL")
            pages = slide.get("visual_pages_reviewed", [])
            require(
                all(
                    isinstance(p, int) and 1 <= p <= slide["page_count"] for p in pages
                ),
                f"{location}: visual review page outside PDF",
            )
            if slide["url"] not in decks:
                decks[slide["url"]] = slide
                review_counts[status] = review_counts.get(status, 0) + 1
    return {
        "id": expected_id,
        "title_fa": term["title_fa"],
        "course_url": term["course_url"],
        "retrieved_at_utc": term["retrieved_at_utc"],
        "planned_route": f"/deep-learning/terms/{expected_id}/",
        "schedule_rows": len(rows),
        "sessions_with_slides": sum(bool(row.get("slides")) for row in rows),
        "downloaded_deck_urls": len(decks),
        "unique_deck_hashes": len({s["sha256"] for s in decks.values()}),
        "pages_per_distinct_url": sum(s["page_count"] for s in decks.values()),
        "review_counts": review_counts,
        "final_redirect_url_not_recorded": sum(
            not s.get("final_url") for s in decks.values()
        ),
        "unavailable_urls": sorted(set(failed)),
        "teaching_release_status": "planned",
    }


def build_index(directory):
    summaries = []
    for term_id in TERMS:
        document = json.loads(
            (directory / f"{term_id}.json").read_text(encoding="utf-8")
        )
        summaries.append(inspect_term(document, term_id))
    return {
        "schema_version": 1,
        "authority_url": "https://dannagurari.colorado.edu/courses/",
        "delivery_decision": "official_slide_links_with_original_persian_companions",
        "note": "Inventory validation does not certify full visual/scientific review or publication.",
        "terms": summaries,
        "total_schedule_rows": sum(s["schedule_rows"] for s in summaries),
        "total_deck_urls_by_term": sum(s["downloaded_deck_urls"] for s in summaries),
        "total_pages_by_term": sum(s["pages_per_distinct_url"] for s in summaries),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, default=ROOT / "data/metadata")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    index = build_index(args.directory)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(
            json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    print(json.dumps(index, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
