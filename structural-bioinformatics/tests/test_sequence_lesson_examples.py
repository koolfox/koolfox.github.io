"""Keep the public lesson's retained FASTA examples reproducible offline."""

import hashlib
import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def test_retained_fasta_matches_recorded_hashes_and_comparison():
    metadata = json.loads((PROJECT / "data/metadata/education-content-provenance.json").read_text())
    record = metadata["lesson_10_fasta_comparison"]
    paths = record["retained_files"]
    expected = {item["accession"]: item["sha256"] for item in record["retrievals"]}
    sequences = []
    for path in paths:
        filename = Path(path).name.removesuffix(".fasta")
        contents = (PROJECT / path).read_bytes()
        assert hashlib.sha256(contents).hexdigest() == expected[filename]
        lines = contents.decode().splitlines()
        assert lines[0].startswith(">")
        sequences.append("".join(lines[1:]))
    assert sequences[0] == sequences[1]
    assert len(sequences[0]) == record["sequence_length"] == 142


def test_example_headers_distinguish_accession_and_sequence_version():
    examples = PROJECT / "assets/course/examples"
    uni = (examples / "P69905.fasta").read_text().splitlines()[0]
    ref = (examples / "NP_000549.1.fasta").read_text().splitlines()[0]
    assert uni.startswith(">sp|P69905|")
    assert " SV=2" in uni
    assert ref.startswith(">NP_000549.1 ")
