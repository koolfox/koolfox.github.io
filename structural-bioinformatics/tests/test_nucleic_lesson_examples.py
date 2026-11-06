"""Check the hypothetical reverse-complement examples against independent arithmetic."""

from pathlib import Path


def reverse_complement(sequence):
    return sequence.translate(str.maketrans("ACGT", "TGCA"))[::-1]


def test_reverse_complement_examples_are_consistent():
    root = Path(__file__).resolve().parents[1]
    text = (root / "docs/course/session-05.fa.md").read_text()
    for sequence, expected in [("ATGCC", "GGCAT"), ("AGCTG", "CAGCT"), ("CGTAA", "TTACG")]:
        assert reverse_complement(sequence) == expected
        assert f"5′-{sequence}-3′" in text
        assert f"5′-{expected}-3′" in text
