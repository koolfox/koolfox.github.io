"""Propose source-line segments for multiline Persian slide blocks.

Proposals are not applied to the course and do not establish translation or
visual correctness. Ambiguous source/translation groupings are skipped.
"""

import argparse
import hashlib
import json
import re
from pathlib import Path


BULLET = re.compile(r"^[•●▪–—-]")


def propose(block, source_lines):
    if set(block) - {"kind", "fa", "source_lines"}:
        return None
    indices = block.get("source_lines")
    if not isinstance(indices, list) or len(indices) < 2 or any(type(i) is not int for i in indices):
        return None
    if indices != list(range(indices[0], indices[-1] + 1)) or indices[0] < 0 or indices[-1] >= len(source_lines):
        return None
    translated = [line.strip() for line in block.get("fa", "").splitlines() if line.strip()]
    if len(translated) < 2:
        return None
    groups = []
    for index in indices:
        line = source_lines[index].strip()
        if not line:
            return None
        if not groups or BULLET.match(line):
            groups.append({"lines": [index], "bullet": bool(BULLET.match(line))})
        else:
            groups[-1]["lines"].append(index)
    if len(groups) != len(translated):
        return None
    if any(group["bullet"] != bool(BULLET.match(text)) for group, text in zip(groups, translated)):
        return None
    return [{"kind": block["kind"], "source_lines": group["lines"], "fa": text}
            for group, text in zip(groups, translated)]


def generate(root: Path, output: Path) -> tuple[int, int]:
    translations = sorted((root / "content/translations/spring-2026").glob("s[0-9][0-9].json"))
    if not translations:
        raise ValueError("No translation files found")
    candidates = []
    examined = 0
    for path in translations:
        translated = json.loads(path.read_text(encoding="utf-8"))
        original = json.loads((root / "content/source-slides/spring-2026" / path.name).read_text(encoding="utf-8"))
        if translated["source_sha256"] != original["source"]["sha256"] or len(translated["pages"]) != len(original["pages"]):
            raise ValueError(f"Source identity mismatch: {path.name}")
        for page, source in zip(translated["pages"], original["pages"]):
            if page["number"] != source["number"] or page["source_text_sha256"] != source["source_text_sha256"]:
                raise ValueError(f"Page identity mismatch: {path.name} page {page['number']}")
            for index, block in enumerate(page["blocks"]):
                examined += 1
                blocks = propose(block, source["lines"])
                if blocks:
                    candidates.append({
                        "term": translated["term_id"], "session": translated["session_id"],
                        "page": page["number"], "block_index": index,
                        "source_page_sha256": page["source_text_sha256"],
                        "original_fa_sha256": hashlib.sha256(block["fa"].encode("utf-8")).hexdigest(),
                        "status": "needs_review", "proposed_blocks": blocks,
                    })
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("x", encoding="utf-8") as stream:
        for item in candidates:
            stream.write(json.dumps(item, ensure_ascii=False) + "\n")
    return examined, len(candidates)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True, help="deep-learning project directory")
    parser.add_argument("--output", type=Path, required=True, help="new local JSONL file")
    args = parser.parse_args()
    blocks, count = generate(args.root, args.output)
    print(f"Examined {blocks} blocks; {count} segmentation proposals require review.")
