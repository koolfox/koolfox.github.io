"""Refresh local lesson/figure fingerprints without claiming a new source review."""

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
PATH = PROJECT / "data/metadata/education-content-provenance.json"


def refresh(metadata):
    for lesson in metadata["lessons"]:
        path = PROJECT / lesson["path"]
        lesson["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
        lesson["word_count_whitespace"] = len(path.read_text().split())
        lesson["external_reference_urls"] = sorted(
            set(re.findall(r"https?://[^\s)]+", path.read_text()))
        )
    metadata["teaching_assets"] = [
        {
            "path": str(path.relative_to(PROJECT)),
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        }
        for path in sorted((PROJECT / "assets/course/figures").glob("*.svg"))
    ]
    metadata["last_revised_at_utc"] = datetime.now(timezone.utc).isoformat()
    return metadata


if __name__ == "__main__":
    metadata = refresh(json.loads(PATH.read_text()))
    PATH.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
