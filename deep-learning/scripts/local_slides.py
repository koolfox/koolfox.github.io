"""Independent local Persian teaching decks, separate from upstream review state."""

import json

from source_catalog import ROOT, require


def load_slides(term_id, root=ROOT):
    path = root / f"content/slides/{term_id}.json"
    if not path.exists():
        return {}, {}
    document = json.loads(path.read_text())
    require(
        document["schema_version"] == 1 and document["term_id"] == term_id,
        "Invalid local deck identity",
    )
    require(document["license"] == "MIT", "Independent deck license missing")
    require(
        document["supervisor_fa"] and document["source_policy"], "Deck identity missing"
    )
    rows = json.loads((root / f"data/metadata/{term_id}.json").read_text())["term"][
        "schedule"
    ]
    expected = {r["id"] for r in rows if r["slides"]}
    result = {}
    for unit in document["sessions"]:
        identity = unit["session_id"]
        require(
            identity in expected and identity not in result,
            "Duplicate or non-teaching deck",
        )
        for key in ("intro_fa", "formula", "formula_explanation_fa", "pitfall_fa"):
            require(
                isinstance(unit[key], str) and unit[key].strip(),
                f"Empty slide field: {key}",
            )
        require(
            len(unit["ideas_fa"]) == 3 and all(unit["ideas_fa"]),
            "Deck needs three topic-specific ideas",
        )
        result[identity] = unit
    require(set(result) == expected, "Every slide lesson needs a local Persian deck")
    return document, result
