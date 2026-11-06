"""Large libraries require an explicit budget and are not silently truncated."""

import hashlib

import pytest

from peptide_lab.library import LibrarySpec
from peptide_lab.library_stream import export


def test_stream_more_than_ten_thousand_with_explicit_budget(tmp_path):
    spec = LibrarySpec("ACDE", 7, 7)
    out = tmp_path / "library"
    result = export(spec, out, 16384)
    assert result["exported_sequences"] == 16384
    assert (
        result["files"]["sequences.fasta"]["sha256"]
        == hashlib.sha256((out / "sequences.fasta").read_bytes()).hexdigest()
    )
    assert (
        sum(line.startswith(">") for line in (out / "sequences.fasta").read_text().splitlines())
        == 16384
    )
    with pytest.raises(ValueError, match="budget"):
        export(spec, tmp_path / "too-small", 16383)
    assert not (tmp_path / "too-small").exists()
