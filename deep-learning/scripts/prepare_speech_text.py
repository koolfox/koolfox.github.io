"""Prepare a local review queue for the course speech dataset.

The output contains text only: human-reviewed speech and aligned audio must be
added before it can be used to train a text-to-speech model.
"""

import argparse
import hashlib
import json
import re
from pathlib import Path


def prepare(source_dir: Path, output: Path) -> tuple[int, int]:
    records = []
    seen = set()
    page_count = 0
    paths = sorted(source_dir.glob("s[0-9][0-9].json"))
    if not paths:
        raise ValueError(f"No session files found in {source_dir}")
    for path in paths:
        document = json.loads(path.read_text(encoding="utf-8"))
        for page in document["pages"]:
            page_count += 1
            page_key = f'{document["term_id"]}/{document["session_id"]}/{page["number"]}'
            bucket = int(hashlib.sha256(page_key.encode()).hexdigest()[:8], 16) % 100
            split = "test" if bucket < 10 else "validation" if bucket < 20 else "train"
            candidates = [("block", index, block) for index, block in enumerate(page.get("blocks", []))]
            candidates.extend(("image_text", index, block) for index, block in enumerate(page.get("image_text", [])))
            for content_type, index, block in candidates:
                text = block.get("fa", "").strip()
                if block.get("kind") == "reference" or not text or re.match(r"^https?://", text):
                    continue
                # Exact duplicates are not repeated in another split.
                digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
                if digest in seen:
                    continue
                seen.add(digest)
                records.append({
                    "id": f'{page_key}/{content_type}/{index}',
                    "display_text_sha256": digest,
                    "source_page_sha256": page.get("source_text_sha256"),
                    "split": split,
                    "display_text_fa": text,
                    "spoken_text_fa": None,
                    "phonemes": None,
                    "audio_path": None,
                    "speaker_id": None,
                    "rights": "review_required",
                    "review_status": "pending",
                })
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("x", encoding="utf-8") as stream:
        for record in records:
            stream.write(json.dumps(record, ensure_ascii=False) + "\n")
    return page_count, len(records)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    pages, items = prepare(args.source_dir, args.output)
    print(f"Source pages: {pages}; unique text candidates: {items}. No audio or pronunciation has been verified.")
