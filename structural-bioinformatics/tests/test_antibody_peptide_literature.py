"""Keep source identifiers and scope visible in the initial literature note."""

import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def test_review_identifies_each_source_and_evidence_scope():
    source = json.loads(
        (PROJECT / "data/metadata/antibody-peptide-literature-source.json").read_text()
    )
    review = (PROJECT / "docs/reviews/antibody-peptide-literature.fa.md").read_text()
    assert len(set(source["pmids"])) == 5
    assert len(source["sha256"]) == 64
    assert all(f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" in review for pmid in source["pmids"])
    assert "جست‌وجوی نظام‌مند و جامع" in review
    assert "چکیده" in review
