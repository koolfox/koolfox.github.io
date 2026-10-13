"""Check source-byte provenance and independent sequence/structure correspondence offline."""

import json
from pathlib import Path

import pytest
from Bio import SeqIO
from Bio.SeqUtils import seq1

from tnf_atlas.provenance import sha256
from tnf_atlas.structure import heavy_atoms, read_model

PROJECT = Path(__file__).resolve().parents[1]
RECORDS = json.loads((PROJECT / "data/metadata/sequences.json").read_text())["sequences"]


def sequence(record):
    return SeqIO.read(PROJECT / record["path"], "fasta").seq


def test_public_sequences_preserve_source_bytes_and_lengths():
    for record in RECORDS:
        assert sha256(PROJECT / record["path"]) == record["sha256"]
        assert len(sequence(record)) == record["length"]
        if annotation := record.get("annotation"):
            assert sha256(PROJECT / annotation["path"]) == annotation["sha256"]


@pytest.mark.parametrize("gene", ["TNF", "TOP2A"])
def test_annotated_mrna_translation_matches_separately_downloaded_protein(gene):
    mrna = next(r for r in RECORDS if r["category"] == "refseq_mrna" and r["gene"] == gene)
    cds = mrna["cds"]
    protein = next(r for r in RECORDS if r["accession_version"] == cds["protein_accession_version"])
    genbank = SeqIO.read(PROJECT / mrna["annotation"]["path"], "genbank")
    assert genbank.seq == sequence(mrna)
    feature = next(
        f
        for f in genbank.features
        if f.type == "CDS" and f.qualifiers.get("protein_id") == [protein["accession_version"]]
    )
    assert int(feature.location.start) + 1 == cds["start_1based"]
    assert int(feature.location.end) == cds["end_1based"]
    # cds=True validates the start and terminal stop, excluding the latter from protein letters.
    assert feature.extract(genbank.seq).translate(cds=True) == sequence(protein)


def test_fab_sequences_distinguish_declared_polymer_observed_residues_and_ca_points():
    path = PROJECT / "assets/3wd5.pdb"
    declared = {r.annotations["chain"]: r.seq for r in SeqIO.parse(path, "pdb-seqres")}
    model = read_model(path)
    for record in RECORDS:
        if record["category"] == "pdb_declared_polymer":
            assert sequence(record) == declared[record["auth_chain_id"]]
        elif record["category"] == "pdb_resolved_fragment":
            atoms = heavy_atoms(model[record["auth_chain_id"]])
            # Preserve source order while counting each occupied residue once.
            residues = list(dict.fromkeys(atom.parent for atom in atoms))
            observed = "".join(seq1(residue.resname) for residue in residues)
            assert str(sequence(record)) == observed
            assert sum(atom.name == "CA" for atom in atoms) == record["positive_occupancy_ca_count"]


def test_reference_to_pdb_discrepancy_is_reported_without_forcing_identity():
    construct = next(r for r in RECORDS if r["id"] == "3WD5_A_declared")
    mapping = construct["related_refseq_protein"]
    protein = next(r for r in RECORDS if r["accession_version"] == mapping["accession_version"])
    start, end = mapping["annotated_soluble_start_1based"], mapping["annotated_soluble_end_1based"]
    reference = sequence(protein)[start - 1 : end]
    deposited = sequence(construct)
    assert len(reference) == len(deposited)
    mismatches = [
        (i, i + start - 1, left, right)
        for i, (left, right) in enumerate(zip(deposited, reference, strict=True), start=1)
        if left != right
    ]
    assert mismatches == [
        (
            m["pdb_polymer_position_1based"],
            m["refseq_protein_position_1based"],
            m["pdb_amino_acid"],
            m["refseq_amino_acid"],
        )
        for m in mapping["mismatches"]
    ]
