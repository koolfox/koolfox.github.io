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


def test_source_digest_and_retrieval_time_have_valid_format():
    from datetime import datetime, timedelta

    source = json.loads(
        (PROJECT / "data/metadata/antibody-peptide-literature-source.json").read_text()
    )
    assert all(character in "0123456789abcdef" for character in source["sha256"])
    retrieved = datetime.fromisoformat(source["retrieved_at_utc"].replace("Z", "+00:00"))
    assert retrieved.utcoffset() == timedelta(0)
    assert all(pmid in source["source_url"] for pmid in source["pmids"])
