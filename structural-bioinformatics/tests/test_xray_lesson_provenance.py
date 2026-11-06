"""Keep the 1UBQ teaching example's source identifiers intact offline."""

import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def test_ubiquitin_article_doi_is_not_truncated():
    metadata = json.loads((PROJECT / "data/metadata/education-content-provenance.json").read_text())
    lesson = next(item for item in metadata["lessons"] if item["topic"] == 11)
    assert "https://doi.org/10.1016/0022-2836%2887%2990679-6" in lesson["external_reference_urls"]
    record = metadata["lesson_11_entry_check"]
    assert record["api_values"]["resolution_angstrom"] == 1.8
    assert record["api_values"]["depositor_r_observed"] == 0.176
    assert "R-free absent" in record["page_observation"]
