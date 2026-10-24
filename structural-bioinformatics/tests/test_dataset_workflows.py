"""Dataset exercises use available inputs and the actual nine syllabus chapters."""

import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def test_workflows_cover_existing_chapters_with_available_inputs():
    workflows = json.loads((PROJECT / "data/metadata/dataset-workflows.json").read_text())
    course = json.loads((PROJECT / "data/metadata/course-map.json").read_text())
    assert [r["unit"] for r in workflows["chapters"]] == [r["unit"] for r in course["chapters"]]
    for row in workflows["chapters"]:
        assert len(row["steps"]) >= 3
        assert row["expected"] and row["paper"] and row["limit"]
        for file in row["files"]:
            assert (PROJECT / file["path"]).is_file()
        if row["command"]:
            script = row["command"].split("scripts/")[1].split()[0]
            assert (PROJECT / "scripts" / script).is_file()
