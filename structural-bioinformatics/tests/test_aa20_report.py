"""The readable 20-row table must remain tied to the actual run report."""

import importlib.util
import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "aa20_report", PROJECT / "scripts/build_aa20_report.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_table_is_reproducible_and_highlights_close_contact():
    report = json.loads((PROJECT / "data/processed/general-aa20-demo.json").read_text())
    text = (PROJECT / "docs/aa20-results.fa.md").read_text()
    assert text == module.render(report)
    assert text.count("| `A") == 20
    assert "`AW`" in text and "`2.267`" in text
    assert text.count("تماس نزدیک؛ بررسی دقیق‌تر") == 1
