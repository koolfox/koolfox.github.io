"""Prepare the deposited 7TA3 A/B complex, preserving amidation and disulfide.

This is bound-template model preparation, not sequence-only prediction.
"""

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from Bio.PDB import PDBIO, PDBParser, Select
from Bio.SeqUtils import seq1

PROJECT = Path(__file__).resolve().parents[1]


class Selection(Select):
    def __init__(self, chain, cap=False):
        self.chain, self.cap = chain, cap

    def accept_chain(self, chain):
        return chain.id == self.chain

    def accept_residue(self, residue):
        return residue.id[0] == " " or (self.cap and residue.resname == "NH2")

    def accept_atom(self, atom):
        return (
            (atom.occupancy or 0) > 0
            and atom.element not in ("H", "D")
            and atom.altloc in (" ", "A")
        )


def main():
    source = PROJECT / "assets/tnf-peptide/7ta3.pdb"
    out = PROJECT / "results/tnf-peptide/prepared"
    out.mkdir(parents=True, exist_ok=True)
    structure = PDBParser(QUIET=True).get_structure("7TA3", source)
    writer = PDBIO()
    writer.set_structure(structure[0])
    for filename, chain, cap in [("peptide.pdb", "A", True), ("receptor.pdb", "B", False)]:
        writer.save(str(out / filename), Selection(chain, cap))
    record = {
        "source_url": "https://files.rcsb.org/download/7TA3.pdb",
        "entry_url": "https://www.rcsb.org/structure/7TA3",
        "recorded_at_utc": datetime.now(UTC).isoformat(),
        "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "model_method": "Extract bound experimental A/B coordinates; not de novo folding",
        "peptide_chain": "A",
        "target_chain": "B",
        "sequence": "".join(seq1(r.resname) for r in structure[0]["A"] if r.id[0] == " "),
        "chemistry": "31 amino acids plus terminal NH2; Cys2-Cys31 disulfide",
        "reference_resolution_angstrom": 2.5,
        "paper_doi": "10.1021/jacs.1c13717",
        "limitations": [
            "Bound receptor and bound peptide conformation",
            "Missing receptor coordinates are not rebuilt",
            "Monomer-binding mechanism differs from adalimumab",
            "No claim of cheaper production or efficacy",
        ],
        "outputs": {
            name: hashlib.sha256((out / name).read_bytes()).hexdigest()
            for name in ("peptide.pdb", "receptor.pdb")
        },
        "docking": "not_run",
    }
    (PROJECT / "data/metadata/tnf-peptide-preparation.json").write_text(
        json.dumps(record, indent=2) + "\n"
    )
    print(json.dumps(record, indent=2))


if __name__ == "__main__":
    main()
