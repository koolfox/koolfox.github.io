"""Verify a single-substitution candidate library against its antibody PDB and FASTA."""

import argparse
import hashlib
import json
from pathlib import Path

from Bio import SeqIO
from Bio.PDB import PDBParser
from Bio.PDB.Polypeptide import protein_letters_3to1


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def verify(pdb, fasta, manifest_path):
    pdb, fasta, manifest_path = Path(pdb), Path(fasta), Path(manifest_path)
    manifest_hash = digest(manifest_path)
    manifest = json.loads(manifest_path.read_text())
    if manifest.get("status") != "sequences_generated":
        raise ValueError("Candidate manifest does not record generated sequences")
    pdb_hash, fasta_hash = digest(pdb), digest(fasta)
    if manifest.get("source_pdb_sha256") != pdb_hash or manifest.get("fasta_sha256") != fasta_hash:
        raise ValueError("Source PDB or FASTA hash differs from candidate manifest")
    region = manifest.get("source_record")
    if not isinstance(region, dict):
        raise ValueError("Manifest has no PDB region")
    chain_id, start, end = (
        region.get("author_chain"),
        region.get("start_index"),
        region.get("end_index"),
    )
    if (
        not isinstance(chain_id, str)
        or len(chain_id) != 1
        or type(start) is not int
        or type(end) is not int
        or not 1 <= start <= end
    ):
        raise ValueError("Invalid antibody chain or region")
    try:
        models = list(PDBParser(QUIET=True, PERMISSIVE=False).get_structure("source", str(pdb)))
    except Exception as exc:
        raise ValueError(f"Cannot parse antibody PDB: {exc}") from exc
    if len(models) != 1 or chain_id not in models[0]:
        raise ValueError("Antibody PDB must contain one model and the selected chain")
    residues = [r for r in models[0][chain_id] if r.id[0] == " "]
    if end > len(residues):
        raise ValueError("Antibody region exceeds observed chain")
    selected = residues[start - 1 : end]
    if any(
        r.resname not in protein_letters_3to1 or r.is_disordered() or r.id[2].strip()
        for r in selected
    ):
        raise ValueError("Antibody region has nonstandard, alternate or insertion-coded residues")
    if any(a.occupancy is None or a.occupancy <= 0 for residue in selected for a in residue):
        raise ValueError("Antibody region contains zero or missing occupancy")
    if any(
        right.id[1] != left.id[1] + 1 for left, right in zip(selected, selected[1:], strict=False)
    ):
        raise ValueError("Antibody region has a residue numbering gap")
    numbers = [r.id[1] for r in selected]
    seed = "".join(protein_letters_3to1[r.resname] for r in selected)
    if manifest.get("seed") != seed or region.get("author_residue_numbers") != numbers:
        raise ValueError("Antibody sequence or author numbers differ from manifest")
    records = list(SeqIO.parse(str(fasta), "fasta"))
    candidates = manifest.get("candidates")
    if not isinstance(candidates, list) or len(records) != len(candidates) or not records:
        raise ValueError("Candidate count differs between manifest and FASTA")
    ids = set()
    for record, candidate in zip(records, candidates, strict=True):
        if not isinstance(candidate, dict) or record.id in ids or not record.id:
            raise ValueError("Invalid or duplicate candidate ID")
        ids.add(record.id)
        sequence = str(record.seq)
        if candidate.get("id") != record.id or candidate.get("sequence") != sequence:
            raise ValueError("Candidate identity differs between FASTA and manifest")
        if len(sequence) != len(seed) or any(
            letter not in "ACDEFGHIKLMNPQRSTVWY" for letter in sequence
        ):
            raise ValueError("Candidate length or alphabet differs from supported fragment")
        changes = [
            (i, a, b) for i, (a, b) in enumerate(zip(seed, sequence, strict=True), 1) if a != b
        ]
        if not changes:
            expected = "reference"
        elif len(changes) == 1:
            index, before, after = changes[0]
            expected = f"{before}{index}{after}"
        else:
            raise ValueError("Only recorded single-substitution candidates are supported")
        if candidate.get("change") != expected:
            raise ValueError("Candidate substitution differs from manifest")
    if (
        digest(manifest_path) != manifest_hash
        or digest(fasta) != fasta_hash
        or digest(pdb) != pdb_hash
    ):
        raise ValueError("Source file changed while verifying")
    return {
        "status": "source_consistent",
        "antibody_pdb_sha256": pdb_hash,
        "input_fasta_sha256": fasta_hash,
        "candidate_manifest_sha256": manifest_hash,
        "region": region,
        "seed": seed,
        "candidate_count": len(records),
        "limitation": "Consistency of source files does not establish binding "
        "or suitability of the fragment.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--antibody-pdb", type=Path, required=True)
    parser.add_argument("--fasta", type=Path, required=True)
    parser.add_argument("--candidate-manifest", type=Path, required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(verify(args.antibody_pdb, args.fasta, args.candidate_manifest), indent=2))
    except (OSError, ValueError, KeyError, TypeError) as exc:
        parser.exit(1, f"Lineage rejected: {exc}\n")


if __name__ == "__main__":
    main()
