"""Check the teaching bridge against reference files and an independent code table."""

import hashlib
import json
from pathlib import Path

import pytest
from Bio import SeqIO
from Bio.Data import CodonTable

PROJECT = Path(__file__).resolve().parents[1]
LESSON = json.loads((PROJECT / "data/processed/codon-lesson.json").read_text())


def test_standard_code_has_61_sense_and_three_stop_codons():
    published = LESSON["genetic_code"]["codons"]
    reference = CodonTable.unambiguous_rna_by_id[1]
    expected = dict(reference.forward_table)
    expected.update(dict.fromkeys(reference.stop_codons, "*"))
    assert {key: row["one_letter"] for key, row in published.items()} == expected


@pytest.mark.parametrize("example", LESSON["examples"], ids=lambda row: row["gene"])
def test_codon_positions_and_translation_match_versioned_reference(example):
    mrna_path = PROJECT / example["mRNA_path"]
    protein_path = PROJECT / example["protein_path"]
    assert hashlib.sha256(mrna_path.read_bytes()).hexdigest() == example["mRNA_sha256"]
    assert hashlib.sha256(protein_path.read_bytes()).hexdigest() == example["protein_sha256"]
    mrna = SeqIO.read(mrna_path, "fasta").seq
    protein = SeqIO.read(protein_path, "fasta").seq
    cds = example["cds"]
    assert mrna[cds["start_1based"] - 1 : cds["end_1based"]].translate(cds=True) == protein
    for row in example["preview_codons"] + [example["terminal_stop"]]:
        start = row["transcript_start_1based"] - 1
        triplet = mrna[start : start + 3]
        assert str(triplet) == row["record_letters"]
        assert str(triplet.transcribe()) == row["rna_display"]
        assert str(triplet.translate()) == row["amino_acid"]["one_letter"]
        assert start == cds["start_1based"] - 1 + 3 * (row["codon_index_1based"] - 1)
    stop = example["terminal_stop"]
    assert stop["transcript_start_1based"] + 2 == cds["end_1based"]
    assert stop["codon_index_1based"] == len(protein) + 1


def test_drug_examples_are_declared_fab_protein_sequences():
    for fragment in LESSON["drug_fragments"]:
        path = PROJECT / fragment["path"]
        sequence = str(SeqIO.read(path, "fasta").seq)
        assert hashlib.sha256(path.read_bytes()).hexdigest() == fragment["sha256"]
        assert sequence[:12] == fragment["first_12_amino_acids"]
        assert len(sequence) == fragment["length_aa"]
        assert fragment["unique_mRNA_inferred"] is False
