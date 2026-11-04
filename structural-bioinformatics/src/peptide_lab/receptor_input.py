"""Conservative inspection of a user-selected PDB protein chain.

Passing this check is not a certification of chemistry or docking readiness.
The caller chooses chain and docking box; no binding site is inferred here.
"""

import hashlib
import math
from pathlib import Path

from Bio.PDB import PDBParser

STANDARD = frozenset(
    "ALA ARG ASN ASP CYS GLN GLU GLY HIS ILE LEU LYS MET PHE PRO SER THR TRP TYR VAL".split()
)
BACKBONE = frozenset(("N", "CA", "C", "O"))


def inspect_pdb(path: Path, chain_id: str) -> dict:
    path = Path(path)
    if not path.is_file() or len(chain_id) != 1:
        raise ValueError("Provide an existing PDB and one author chain identifier")
    raw = path.read_bytes()
    try:
        structure = PDBParser(QUIET=True, PERMISSIVE=False).get_structure("input", str(path))
    except Exception as exc:
        raise ValueError(f"Cannot parse PDB: {exc}") from exc
    models = list(structure)
    if len(models) != 1:
        raise ValueError("PDB must contain exactly one model")
    model = models[0]
    if chain_id not in model:
        raise ValueError("Selected author chain is absent")
    chain = model[chain_id]
    residues = []
    for residue in chain:
        if residue.id[0] != " ":
            raise ValueError(
                "Selected chain contains water, ligand, or modified residue; review first"
            )
        if residue.resname not in STANDARD:
            raise ValueError(f"Nonstandard residue {residue.resname} requires explicit preparation")
        if residue.is_disordered():
            raise ValueError("Alternate atom locations require explicit resolution")
        atoms = list(residue)
        if any(a.occupancy is None or a.occupancy <= 0 for a in atoms):
            raise ValueError("Missing or zero occupancy requires explicit resolution")
        if any(not all(math.isfinite(float(x)) for x in atom.coord) for atom in atoms):
            raise ValueError("Nonfinite coordinates")
        names = {atom.name for atom in atoms}
        missing = BACKBONE - names
        if missing:
            raise ValueError(f"Missing backbone atoms in {residue.resname}{residue.id[1]}")
        residues.append(
            {
                "name": residue.resname,
                "number": residue.id[1],
                "insertion": residue.id[2].strip(),
                "atoms": len(atoms),
            }
        )
    if not residues:
        raise ValueError("Selected chain has no standard protein residues")
    return {
        "status": "requires_further_validation",
        "source_sha256": hashlib.sha256(raw).hexdigest(),
        "author_chain": chain_id,
        "residues": residues,
        "limitations": [
            "Side-chain completeness, protonation, covalent bonds, ligands, "
            "missing loops and biological assembly are not certified.",
            "PDB inspection alone does not prepare a receptor for Vina.",
        ],
    }


def main():
    import argparse
    import json

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdb", required=True, type=Path)
    parser.add_argument("--chain", required=True)
    args = parser.parse_args()
    try:
        result = inspect_pdb(args.pdb, args.chain)
    except (ValueError, OSError) as exc:
        parser.exit(1, f"Input rejected: {exc}\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
