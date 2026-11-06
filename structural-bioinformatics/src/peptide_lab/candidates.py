"""Create a bounded single-substitution library from a user-selected sequence region.

Sequence similarity alone does not establish structural or functional similarity.
"""

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from Bio import SeqIO
from Bio.PDB import PDBParser
from Bio.PDB.Polypeptide import protein_letters_3to1

from .library import CANONICAL_ALPHABET


def variants(seed, positions, alphabet, include_seed, maximum):
    if not seed or len(seed) > 12 or set(seed) - set(CANONICAL_ALPHABET):
        raise ValueError("Seed must contain 1–12 uppercase standard amino acids")
    if (
        not alphabet
        or len(set(alphabet)) != len(alphabet)
        or set(alphabet) - set(CANONICAL_ALPHABET)
    ):
        raise ValueError("Alphabet must contain distinct uppercase standard amino acids")
    if not positions or len(set(positions)) != len(positions):
        raise ValueError("Choose one or more distinct positions")
    if any(position < 1 or position > len(seed) for position in positions):
        raise ValueError("Positions are 1-based and must fall inside the selected seed")
    if maximum < 1:
        raise ValueError("Maximum must be positive")
    rows = [{"sequence": seed, "change": "reference"}] if include_seed else []
    for pos in positions:
        for residue in alphabet:
            old = seed[pos - 1]
            if residue != old:
                rows.append(
                    {
                        "sequence": seed[: pos - 1] + residue + seed[pos:],
                        "change": f"{old}{pos}{residue}",
                    }
                )
    if not rows or len(rows) > maximum:
        raise ValueError("Complete requested library is empty or exceeds the budget")
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--seed-sequence")
    source.add_argument("--fasta", type=Path)
    source.add_argument("--drug-pdb", type=Path)
    parser.add_argument("--drug-chain")
    parser.add_argument("--record-id")
    parser.add_argument("--start", type=int)
    parser.add_argument("--end", type=int)
    parser.add_argument("--position", type=int, action="append", required=True)
    parser.add_argument("--alphabet", default=CANONICAL_ALPHABET)
    parser.add_argument("--include-seed", action="store_true")
    parser.add_argument("--max-sequences", type=int, default=20)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    input_record = None
    fasta_hash = None
    pdb_hash = None
    if args.drug_pdb:
        if (
            not args.drug_chain
            or len(args.drug_chain) != 1
            or args.start is None
            or args.end is None
        ):
            parser.error("Drug PDB input requires --drug-chain, --start and --end")
        if args.record_id:
            parser.error("--record-id is only for FASTA")
        try:
            pdb_hash = hashlib.sha256(args.drug_pdb.read_bytes()).hexdigest()
            structure = PDBParser(QUIET=True, PERMISSIVE=False).get_structure(
                "drug", str(args.drug_pdb)
            )
            models = list(structure)
            if len(models) != 1 or args.drug_chain not in models[0]:
                raise ValueError("One model and the selected author chain are required")
            residues = [r for r in models[0][args.drug_chain] if r.id[0] == " "]
            if not 1 <= args.start <= args.end <= len(residues):
                raise ValueError("Region is outside observed chain residues")
            selected = residues[args.start - 1 : args.end]
            if any(
                r.resname not in protein_letters_3to1 or r.is_disordered() or r.id[2].strip()
                for r in selected
            ):
                raise ValueError(
                    "Selected region contains nonstandard, alternate or insertion-coded residues"
                )
            if any(atom.occupancy is None or atom.occupancy <= 0 for r in selected for atom in r):
                raise ValueError("Selected region contains missing or zero occupancy")
            if any(
                right.id[1] != left.id[1] + 1
                for left, right in zip(selected, selected[1:], strict=False)
            ):
                raise ValueError("Selected region contains a residue numbering gap")
            seed = "".join(protein_letters_3to1[r.resname] for r in selected)
            input_record = {
                "author_chain": args.drug_chain,
                "start_index": args.start,
                "end_index": args.end,
                "author_residue_numbers": [r.id[1] for r in selected],
            }
        except Exception as exc:
            parser.exit(1, f"Drug PDB rejected: {exc}\n")
    elif args.fasta:
        if args.drug_chain:
            parser.error("--drug-chain is only for PDB input")
        if not args.record_id or args.start is None or args.end is None:
            parser.error("FASTA input requires --record-id, --start and --end")
        try:
            fasta_hash = hashlib.sha256(args.fasta.read_bytes()).hexdigest()
            matches = [r for r in SeqIO.parse(str(args.fasta), "fasta") if r.id == args.record_id]
        except (OSError, ValueError) as exc:
            parser.exit(1, f"FASTA rejected: {exc}\n")
        if len(matches) != 1:
            parser.error("FASTA record must exist exactly once")
        sequence = str(matches[0].seq)
        if not 1 <= args.start <= args.end <= len(sequence):
            parser.error("Region boundaries must be 1-based, inclusive and within the sequence")
        seed = sequence[args.start - 1 : args.end]
        input_record = {"id": args.record_id, "start": args.start, "end": args.end}
    else:
        if args.record_id or args.drug_chain or args.start is not None or args.end is not None:
            parser.error("Record and region arguments apply only to FASTA input")
        seed = args.seed_sequence
    try:
        rows = variants(seed, args.position, args.alphabet, args.include_seed, args.max_sequences)
    except ValueError as exc:
        parser.exit(1, f"Request rejected: {exc}\n")
    args.output_dir.mkdir(parents=True, exist_ok=False)
    lines = []
    for number, row in enumerate(rows, 1):
        row["id"] = f"candidate-{number:06d}"
        lines.append(f">{row['id']}\n{row['sequence']}\n")
    fasta = args.output_dir / "candidates.fasta"
    fasta.write_text("".join(lines))
    manifest = {
        "status": "sequences_generated",
        "created_at_utc": datetime.now(UTC).isoformat(),
        "generator_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "source_fasta_sha256": fasta_hash,
        "source_pdb_sha256": pdb_hash,
        "source_record": input_record,
        "seed": seed,
        "positions_relative_to_seed": args.position,
        "alphabet": args.alphabet,
        "include_seed": args.include_seed,
        "max_sequences": args.max_sequences,
        "candidates": rows,
        "fasta_sha256": hashlib.sha256(fasta.read_bytes()).hexdigest(),
        "limitations": (
            "Single-residue sequence variants only; structural and "
            "functional similarity not established"
        ),
    }
    (args.output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"status": manifest["status"], "count": len(rows)}))


if __name__ == "__main__":
    main()
