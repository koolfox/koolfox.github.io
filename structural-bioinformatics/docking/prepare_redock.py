"""Build the redocking inputs for 1B09 (C-reactive protein with phosphocholine).

The redocking is a method check, not a discovery run: the deposited phosphocholine
of one CRP subunit is the answer the docking has to reproduce. This script only
prepares files; it computes nothing and claims nothing.

Run with the isolated docking environment (see environment.yml):

    conda run -n tnf-docking python structural-bioinformatics/docking/prepare_redock.py

Inputs: the hash-recorded 1B09.pdb download and the chemical component definition
of phosphocholine from RCSB. Outputs, in the chosen work directory:

    receptor.pdb           five CRP chains with their calcium ions, no waters or ligand
    ligand_ideal.sdf       phosphocholine with the bond orders of the CCD
    reference_ligand.pdb   the deposited phosphocholine of chain A, the RMSD reference
    inputs.json            sources, SHA-256 checksums, the search box and its origin
"""

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import requests

PROJECT = Path(__file__).resolve().parents[1]
PDB_ID = "1B09"
LIGAND_CODE = "PC"
CCD_URL = f"https://files.rcsb.org/ligands/download/{LIGAND_CODE}_ideal.sdf"
REFERENCE_CHAIN = "A"
BOX_SIZE_ANGSTROM = 20.0


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fetch_ideal_ligand(path):
    session = requests.Session()
    session.headers["User-Agent"] = "tnf-adalimumab-atlas/0.1 (academic reproducibility)"
    response = session.get(CCD_URL, timeout=60)
    response.raise_for_status()
    path.write_bytes(response.content)
    return {"url": CCD_URL, "sha256": sha256(path), "bytes": len(response.content)}


def split_records(lines):
    protein, calcium, ligand, waters = [], [], [], []
    for line in lines:
        if line.startswith("ATOM  "):
            protein.append(line)
        elif line.startswith("HETATM"):
            residue = line[17:20].strip()
            if residue == "CA":
                calcium.append(line)
            elif residue == LIGAND_CODE:
                ligand.append(line)
            else:
                waters.append(line)
    return protein, calcium, ligand, waters


def ligand_atoms(lines, chain):
    """Heavy atoms of the deposited ligand in one chain, in file order."""
    selected = [
        line
        for line in lines
        if line.startswith("HETATM")
        and line[17:20].strip() == LIGAND_CODE
        and line[21].strip() == chain
    ]
    atoms = []
    for line in selected:
        atoms.append(
            {
                "name": line[12:16].strip(),
                "element": line[76:78].strip() or line[12:14].strip()[0],
                "xyz": [
                    float(line[30:38]),
                    float(line[38:46]),
                    float(line[46:54]),
                ],
            }
        )
    return atoms


def write_pdb(path, records, title):
    header = [
        f"REMARK   1 {title}",
        f"REMARK   1 SOURCE PDB {PDB_ID} (CC0); PREPARED FOR REDOCKING, NOT A DEPOSITION",
    ]
    path.write_text("\n".join(header + records + ["END", ""]))


def control_site(lines, ligand_lines):
    """A protein surface point that holds no known ligand and no nearby calcium.

    It is the wrong-site control of the redocking: the same ligand is docked there
    and must score clearly worse than in the native pocket. A site that still holds
    a calcium would not be a fair control, because the native ligand is a phosphate
    that binds calcium, so the engine would be right to like it there too.
    """
    ligand_xyz = [
        [float(line[30:38]), float(line[38:46]), float(line[46:54])] for line in ligand_lines
    ]
    calcium_xyz = [
        [float(line[30:38]), float(line[38:46]), float(line[46:54])]
        for line in lines
        if line.startswith("HETATM") and line[17:20].strip() == "CA"
    ]
    best = None
    for line in lines:
        if not line.startswith("ATOM  ") or line[12:16].strip().startswith("H"):
            continue
        xyz = [float(line[30:38]), float(line[38:46]), float(line[46:54])]
        distance = min(
            sum((xyz[index] - other[index]) ** 2 for index in range(3)) ** 0.5
            for other in ligand_xyz
        )
        if distance < 12.0:
            continue
        calcium_distance = min(
            sum((xyz[index] - other[index]) ** 2 for index in range(3)) ** 0.5
            for other in calcium_xyz
        )
        if calcium_distance < 6.0:
            continue
        if best is None or distance > best[1]:
            best = (xyz, distance, calcium_distance)
    if best is None:
        raise SystemExit(
            "no protein point is at least 12 Å from every phosphocholine and 6 Å from "
            "every calcium; the wrong-site control cannot be built from this structure"
        )
    return best[0], round(best[1], 2), round(best[2], 2)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--project", type=Path, default=PROJECT)
    parser.add_argument(
        "--structure",
        type=Path,
        help="path to 1B09.pdb; defaults to data/raw/structures/1B09.pdb",
    )
    parser.add_argument(
        "--work",
        type=Path,
        default=PROJECT / "results" / "docking" / "1b09",
        help="directory for the prepared inputs",
    )
    args = parser.parse_args()
    project = args.project.resolve()
    work = args.work.resolve()
    work.mkdir(parents=True, exist_ok=True)

    structure = args.structure or (project / "data" / "raw" / "structures" / f"{PDB_ID}.pdb")
    if not structure.exists():
        raise SystemExit(
            f"{structure} is missing; run `tnf-atlas fetch-structures` to download the "
            "hash-recorded coordinates first"
        )
    lines = structure.read_text().splitlines()
    protein, calcium, ligand, waters = split_records(lines)
    if not protein or not ligand:
        raise SystemExit("unexpected PDB content: no protein or no phosphocholine")

    receptor_records = protein + calcium
    write_pdb(
        work / "receptor.pdb",
        receptor_records,
        f"CRP PENTAMER OF {PDB_ID} WITHOUT WATERS OR LIGAND; {len(calcium)} CALCIUM IONS",
    )

    reference = ligand_atoms(ligand, REFERENCE_CHAIN)
    if not reference:
        raise SystemExit(f"no phosphocholine found in chain {REFERENCE_CHAIN}")
    write_pdb(
        work / "reference_ligand.pdb",
        [
            f"HETATM{index:>5} {atom['name']:<4} {LIGAND_CODE} {REFERENCE_CHAIN}{500:>4}    "
            f"{atom['xyz'][0]:8.3f}{atom['xyz'][1]:8.3f}{atom['xyz'][2]:8.3f}  1.00  0.00"
            f"          {atom['element']:>2}"
            for index, atom in enumerate(reference, start=1)
        ],
        f"DEPOSITED PHOSPHOCHOLINE OF CHAIN {REFERENCE_CHAIN} IN {PDB_ID}; RMSD REFERENCE",
    )

    ligand_source = fetch_ideal_ligand(work / "ligand_ideal.sdf")
    center = [sum(atom["xyz"][index] for atom in reference) / len(reference) for index in range(3)]
    control_center, control_distance, control_calcium = control_site(lines, ligand)
    inputs = {
        "pdb_id": PDB_ID,
        "title": "C-reactive protein complexed with phosphocholine",
        "method": "X-RAY DIFFRACTION",
        "resolution_angstrom": 2.5,
        "prepared_at_utc": datetime.now(UTC).isoformat(timespec="seconds"),
        "receptor": {
            "chains": sorted({line[21].strip() for line in protein}),
            "protein_atoms": len(protein),
            "calcium_ions": len(calcium),
            "waters_removed": len(waters),
            "ligand_removed": len(ligand),
            "source_file": str(structure.relative_to(project)),
            "source_sha256": sha256(structure),
        },
        "ligand": {
            "code": LIGAND_CODE,
            "name": "phosphocholine",
            "source": ligand_source,
            "note": "the deposited ligand is the RMSD reference; the ideal model is docked",
        },
        "reference_pose": {
            "chain": REFERENCE_CHAIN,
            "residue": 500,
            "atoms": [atom["name"] for atom in reference],
            "heavy_atoms": len(reference),
        },
        "box": {
            "center": [round(value, 3) for value in center],
            "size_angstrom": [BOX_SIZE_ANGSTROM] * 3,
            "origin": "centroid of the deposited phosphocholine of chain A",
        },
        "control_box": {
            "center": [round(value, 3) for value in control_center],
            "size_angstrom": [BOX_SIZE_ANGSTROM] * 3,
            "distance_to_ligand_angstrom": control_distance,
            "distance_to_nearest_calcium_angstrom": control_calcium,
            "origin": (
                "the protein atom furthest from every phosphocholine that is also at "
                "least 6 Å from every calcium; a wrong-site control without a metal site"
            ),
        },
    }
    (work / "inputs.json").write_text(json.dumps(inputs, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(inputs, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
