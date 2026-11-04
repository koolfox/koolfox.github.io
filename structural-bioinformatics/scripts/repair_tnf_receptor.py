"""Template missing side-chain atoms from the second experimental TNF copy.

Fit each residue's occupied N, CA, C, CB in chain D to chain B and copy ONLY
missing side-chain atoms. Existing coordinates and missing loops are untouched.
"""

import copy
import json
from pathlib import Path

from Bio.PDB import PDBIO, PDBParser, Superimposer

PROJECT = Path(__file__).resolve().parents[1]


def main():
    work = PROJECT / "results/tnf-peptide/prepared"
    model = PDBParser(QUIET=True).get_structure("receptor", work / "receptor.pdb")
    template = PDBParser(QUIET=True).get_structure("ref", PROJECT / "assets/tnf-peptide/7ta3.pdb")[
        0
    ]["D"]
    records = []
    for number in (31, 72, 88, 102, 112):
        target = model[0]["B"][number]
        donor = template[number]
        if target.resname != donor.resname:
            raise ValueError(f"Reference mismatch at residue {number}")
        fit = Superimposer()
        anchors = ["N", "CA", "C", "CB"]
        fit.set_atoms([target[n] for n in anchors], [donor[n] for n in anchors])
        added = []
        for atom in donor:
            if atom.element in ("H", "D") or atom.name in target or (atom.occupancy or 0) <= 0:
                continue
            clone = copy.deepcopy(atom)
            clone.detach_parent()
            clone.transform(*fit.rotran)
            target.add(clone)
            added.append(clone.name)
        records.append(
            {
                "residue": number,
                "source_chain": "D",
                "anchors": anchors,
                "anchor_rmsd_angstrom": float(fit.rms),
                "added": added,
            }
        )
    writer = PDBIO()
    writer.set_structure(model)
    writer.save(str(work / "receptor-repaired.pdb"))
    report = {
        "method": "local experimental-copy side-chain templating",
        "residues": records,
        "existing_atoms_moved": False,
        "backbone_loops_rebuilt": False,
        "limitation": (
            "Added side chains are modeled from a second crystal copy, not directly observed in B"
        ),
        "rejected_alternative": (
            "PDBFixer seed 0 created 1.66 angstrom Arg31/Asn34 N-N clash; not used"
        ),
    }
    (PROJECT / "data/processed/tnf-receptor-repair.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
