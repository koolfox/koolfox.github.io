"""Conservative inspection of a user-selected PDB protein chain.

Passing this check is not a certification of chemistry or docking readiness.
The caller chooses chain and docking box; no binding site is inferred here.
"""

import hashlib
import math
from pathlib import Path

from Bio.PDB import NeighborSearch, PDBParser

STANDARD = frozenset(
    "ALA ARG ASN ASP CYS GLN GLU GLY HIS ILE LEU LYS MET PHE PRO SER THR TRP TYR VAL".split()
)
BACKBONE = frozenset(("N", "CA", "C", "O"))
SIDE_CHAINS = {
    name: frozenset(atoms.split())
    for name, atoms in {
        "ALA": "CB",
        "ARG": "CB CG CD NE CZ NH1 NH2",
        "ASN": "CB CG OD1 ND2",
        "ASP": "CB CG OD1 OD2",
        "CYS": "CB SG",
        "GLN": "CB CG CD OE1 NE2",
        "GLU": "CB CG CD OE1 OE2",
        "GLY": "",
        "HIS": "CB CG ND1 CD2 CE1 NE2",
        "ILE": "CB CG1 CG2 CD1",
        "LEU": "CB CG CD1 CD2",
        "LYS": "CB CG CD CE NZ",
        "MET": "CB CG SD CE",
        "PHE": "CB CG CD1 CD2 CE1 CE2 CZ",
        "PRO": "CB CG CD",
        "SER": "CB OG",
        "THR": "CB OG1 CG2",
        "TRP": "CB CG CD1 CD2 NE1 CE2 CE3 CZ2 CZ3 CH2",
        "TYR": "CB CG CD1 CD2 CE1 CE2 CZ OH",
        "VAL": "CB CG1 CG2",
    }.items()
}


def inspect_pdb(path: Path, chain_id: str, *, exclude_water: bool = False) -> dict:
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
    excluded_waters = 0
    for residue in chain:
        if residue.id[0] == "W" and residue.resname == "HOH" and exclude_water:
            excluded_waters += 1
            continue
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
        side_missing = SIDE_CHAINS[residue.resname] - names
        if side_missing:
            raise ValueError(
                f"Missing side-chain atoms in {residue.resname}{residue.id[1]}: "
                + ", ".join(sorted(side_missing))
            )
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
        "excluded_waters": excluded_waters,
        "limitations": [
            "Side-chain completeness, protonation, covalent bonds, ligands, "
            "missing loops and biological assembly are not certified.",
            "PDB inspection alone does not prepare a receptor for Vina.",
        ],
    }


def reject_close_cysteine_contacts(structure, chains):
    """Flag ambiguous Cys SG/other-residue CB contacts before bond perception.

    This narrow check does not certify all geometry or connectivity.
    """
    atoms = [
        a
        for c in structure[0]
        if c.id in chains
        for r in c
        if r.id[0] == " "
        for a in r
        if a.element != "H"
    ]
    if not atoms:
        return
    neighbors = NeighborSearch(atoms)
    for atom in atoms:
        residue = atom.parent
        if residue.resname != "CYS" or atom.name != "SG":
            continue
        for other in neighbors.search(atom.coord, 1.9):
            if other.name == "CB" and other.parent is not residue:
                distance = atom - other

                def label(a):
                    r = a.parent
                    return f"{r.parent.id}:{r.resname}{r.id[1]}{r.id[2].strip()} {a.name}"

                raise ValueError(
                    f"Ambiguous close inter-residue contact: {label(atom)} / "
                    f"{label(other)} ({distance:.2f} Å); review geometry and "
                    "connectivity before receptor preparation"
                )


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
