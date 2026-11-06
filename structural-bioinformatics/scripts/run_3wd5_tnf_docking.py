#!/usr/bin/env python
"""Reproduce the source-specific 3WD5 TNF monomer exploratory docking run.

Meeko 0.8.0 detects an extra bond in the deposited disulfide geometry. Remove
only that inferred bond from its graph; coordinates and the S-S bond remain.
"""

import hashlib
import importlib.util
import runpy
import sys
from importlib.metadata import version
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT / "assets/3wd5.pdb"
SOURCE_SHA = "fae6eee1b06b8cba0a466280dbc32563efaa54ec639afd921cb610d17debd216"


def verify_source():
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != SOURCE_SHA:
        raise ValueError("3WD5 source hash differs from the reviewed deposition")
    if version("meeko") != "0.8.0":
        raise ValueError("This source-specific bond correction requires Meeko 0.8.0")


def correct_bonds(molecules, bonds):
    """Remove exactly A69 SG--A101 CB while retaining A69 SG--A101 SG."""
    key = next((k for k in bonds if set(k) == {"A:69", "A:101"}), None)
    if key is None:
        raise ValueError("Expected cysteine bond pair is missing")
    names = []
    for pair in bonds[key]:
        names.append(
            tuple(
                molecules[k][0].GetAtomWithIdx(i).GetPDBResidueInfo().GetName().strip()
                for k, i in zip(key, pair, strict=True)
            )
        )
    expected_extra = ("SG", "CB") if key[0] == "A:69" else ("CB", "SG")
    if names.count(expected_extra) != 1 or names.count(("SG", "SG")) != 1 or len(names) != 2:
        raise ValueError(f"Unexpected cysteine bond perception: {names}")
    bonds[key] = [
        pair for pair, name in zip(bonds[key], names, strict=True) if name != expected_extra
    ]
    print("3WD5 correction: removed inferred A:69 SG--A:101 CB; retained SG--SG")
    return bonds


def main():
    verify_source()
    if len(sys.argv) > 1 and sys.argv[1] == "--read_pdb":
        # The preparer is invoked only on the exact selection produced by the workflow.
        import meeko.polymer as polymer
        from Bio.PDB import PDBParser

        selected = Path(sys.argv[2])
        parser = PDBParser(QUIET=True, PERMISSIVE=False)
        source = parser.get_structure("source", SOURCE)[0]["A"]
        prepared = parser.get_structure("selected", selected)

        def atoms(structure):
            return {
                (a.parent.id, a.name): tuple(a.coord)
                for a in structure.get_atoms()
                if a.parent.id[0] == " "
            }

        if (
            len(list(prepared[0])) != 1
            or prepared[0].child_list[0].id != "A"
            or atoms(source) != atoms(prepared)
        ):
            raise ValueError("Selected receptor does not match deposited chain A")
        original = polymer.find_inter_mols_bonds

        def corrected(molecules, *args, **kwargs):
            return correct_bonds(molecules, original(molecules, *args, **kwargs))

        polymer.find_inter_mols_bonds = corrected
        runpy.run_module("meeko.cli.mk_prepare_receptor", run_name="__main__")
        return

    if len(sys.argv) != 2:
        raise SystemExit("Usage: run_3wd5_tnf_docking.py NEW_OUTPUT_DIRECTORY")
    output = sys.argv[1]
    spec = importlib.util.spec_from_file_location(
        "general_docking", PROJECT / "scripts/run_general_peptide_docking.py"
    )
    workflow = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(workflow)
    # The exception is confined to this exact source and single chain; the guard
    # is exercised on all other contacts after masking only this known pair.
    from Bio.PDB import PDBParser

    from peptide_lab.receptor_input import reject_close_cysteine_contacts

    structure = PDBParser(QUIET=True).get_structure("source", SOURCE)
    sg = structure[0]["A"][69]["SG"]
    cb = structure[0]["A"][101]["CB"]
    distance = float(sg - cb)
    if not 1.74 < distance < 1.76:
        raise ValueError("Expected source contact changed")
    structure[0]["A"][101].detach_child("CB")
    reject_close_cysteine_contacts(structure, ["A"])
    workflow.reject_close_cysteine_contacts = lambda structure, chains: None
    sys.argv = [
        str(PROJECT / "scripts/run_general_peptide_docking.py"),
        "--pdb",
        str(SOURCE),
        "--chain",
        "A",
        "--exclude-water",
        "--sequence",
        "AC",
        "--center",
        "0",
        "12",
        "5",
        "--size",
        "20",
        "20",
        "20",
        "--receptor-preparer",
        str(Path(__file__).resolve()),
        "--vina",
        str(Path(sys.executable).parent / "vina"),
        "--output-dir",
        output,
    ]
    workflow.main()


if __name__ == "__main__":
    main()
