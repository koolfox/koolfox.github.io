"""Inventory PDB models and author chains before selecting a docking receptor."""

import argparse
import hashlib
import json
from pathlib import Path

from Bio.PDB import PDBParser

from .receptor_input import inspect_pdb


def inventory(path):
    path = Path(path)
    raw = path.read_bytes()
    try:
        structure = PDBParser(QUIET=True, PERMISSIVE=False).get_structure("input", str(path))
    except Exception as exc:
        raise ValueError(f"Cannot parse PDB: {exc}") from exc
    models = list(structure)
    if not models:
        raise ValueError("PDB contains no coordinate models")
    result = {
        "source_sha256": hashlib.sha256(raw).hexdigest(),
        "model_count": len(models),
        "models": [],
        "limitations": [
            "Inventory is not receptor preparation or proof of biological assembly.",
            "Docking currently accepts one independently inspected protein chain and one model.",
        ],
    }
    for index, model in enumerate(models):
        item = {"model_index": index, "chains": []}
        for chain in model:
            residues = list(chain)
            protein = sum(residue.id[0] == " " for residue in residues)
            water = sum(residue.id[0] == "W" for residue in residues)
            other = sum(residue.id[0] not in (" ", "W") for residue in residues)
            entry = {
                "author_chain": chain.id,
                "protein_residues": protein,
                "water_residues": water,
                "other_residues": other,
                "eligible_for_current_inspection": False,
            }
            if len(models) != 1:
                entry["reason"] = "Multiple models require explicit selection before docking."
            else:
                try:
                    inspect_pdb(path, chain.id)
                except (OSError, ValueError) as exc:
                    entry["reason"] = str(exc)
                else:
                    entry["eligible_for_current_inspection"] = True
                    entry["reason"] = "Passed initial inspection; preparation remains necessary."
            item["chains"].append(entry)
        result["models"].append(item)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdb", required=True, type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(inventory(args.pdb), indent=2))
    except (OSError, ValueError) as exc:
        parser.exit(1, f"Input rejected: {exc}\n")


if __name__ == "__main__":
    main()
