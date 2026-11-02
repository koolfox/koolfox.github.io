"""Small, explicit geometry screen for single-chain, standard-residue PDB models.

This rejects grossly broken peptide connections. Passing is not a full chemical
validation or permission to infer binding. Coordinates and distances are in Å.
"""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from Bio.PDB import PDBParser, Superimposer
from Bio.SeqUtils import seq1

from .library import CANONICAL_ALPHABET

CN_WINDOW = (1.1, 1.6)  # Deliberately broad screening bounds, not an ideal-bond restraint.


def read_chain(path):
    """Require one model and one protein chain; never silently concatenate chains."""
    structure = PDBParser(QUIET=True, PERMISSIVE=False).get_structure("model", Path(path))
    if len(structure) != 1:
        raise ValueError("This screen requires exactly one model")
    chains = []
    for chain in structure[0]:
        residues = [r for r in chain if r.id[0] == " "]
        if residues:
            chains.append((chain.id, residues))
    if len(chains) != 1:
        raise ValueError("This screen requires exactly one protein chain")
    chain_id, residues = chains[0]
    atoms_by_residue = []
    for residue in residues:
        if seq1(residue.resname) not in CANONICAL_ALPHABET:
            raise ValueError(f"Unsupported residue: {residue.resname}")
        alternatives = {
            atom.name: atom.disordered_get_list() if atom.is_disordered() else [atom]
            for atom in residue
        }
        labels = sorted({a.altloc for sites in alternatives.values() for a in sites} - {" "})
        # Select one conformer for the entire residue, not a mixture of A/B atoms.
        selected = min(
            labels,
            key=lambda label: (
                -sum(
                    a.occupancy or 0
                    for sites in alternatives.values()
                    for a in sites
                    if a.altloc == label
                ),
                label,
            ),
            default=" ",
        )
        chosen = {}
        for name, sites in alternatives.items():
            sites = [a for a in sites if (a.occupancy or 0) > 0 and a.altloc in (" ", selected)]
            if not sites:
                continue
            site = sorted(sites, key=lambda a: (-a.occupancy, a.altloc))[0]
            if not np.isfinite(site.coord).all():
                raise ValueError("Non-finite occupied coordinate")
            chosen[name] = site
        if not all(name in chosen for name in ("N", "CA", "C", "O")):
            raise ValueError(f"Missing occupied backbone atom: {residue.id}")
        atoms_by_residue.append(chosen)
    return chain_id, residues, atoms_by_residue


def screen_structure(path, expected_sequence):
    """Report all adjacent author-residue connections; do not draw across gaps."""
    chain, residues, atoms = read_chain(path)
    sequence = "".join(seq1(r.resname) for r in residues)
    if sequence != expected_sequence:
        raise ValueError("Coordinate sequence does not match the requested sequence")
    connections = []
    for i in range(len(residues) - 1):
        left, right = residues[i : i + 2]
        numbered_adjacent = right.id[1] == left.id[1] + 1 and not (
            left.id[2].strip() or right.id[2].strip()
        )
        cn = float(np.linalg.norm(atoms[i]["C"].coord - atoms[i + 1]["N"].coord))
        ca = float(np.linalg.norm(atoms[i]["CA"].coord - atoms[i + 1]["CA"].coord))
        connections.append(
            {
                "from": f"{chain}:{left.id[1]}{left.id[2].strip()}",
                "to": f"{chain}:{right.id[1]}{right.id[2].strip()}",
                "author_numbering_adjacent": numbered_adjacent,
                "c_n_angstrom": round(cn, 4),
                "ca_ca_angstrom": round(ca, 4),
                "passes_cn_screen": numbered_adjacent and CN_WINDOW[0] <= cn <= CN_WINDOW[1],
            }
        )
    passed = bool(connections) and all(c["passes_cn_screen"] for c in connections)
    return {
        "sequence": sequence,
        "chain": chain,
        "residue_count": len(residues),
        "occupied_atom_count": sum(len(row) for row in atoms),
        "mean_ca_b_column": round(float(np.mean([a["CA"].bfactor for a in atoms])), 4),
        "cn_screen_bounds_angstrom": list(CN_WINDOW),
        "connections": connections,
        "cn_screen": "pass" if passed else "fail",
        "docking_gate": "requires_further_validation" if passed else "blocked_geometry",
    }


def compare_ca(predicted, reference):
    """Fit every sequence-matched Cα equally, with no outlier/terminal trimming."""
    _, moving_residues, moving = read_chain(predicted)
    _, fixed_residues, fixed = read_chain(reference)
    if [r.resname for r in moving_residues] != [r.resname for r in fixed_residues]:
        raise ValueError("Reference and prediction must have identical residue sequences")
    fit = Superimposer()
    fit.set_atoms([r["CA"] for r in fixed], [r["CA"] for r in moving])
    rotation, translation = fit.rotran
    aligned = np.array([a["CA"].coord for a in moving]) @ rotation + translation
    target = np.array([a["CA"].coord for a in fixed])
    return (
        {
            "matched_ca": len(fixed),
            "rmsd_angstrom": round(float(fit.rms), 4),
            "per_residue_displacement_angstrom": np.linalg.norm(aligned - target, axis=1)
            .round(4)
            .tolist(),
        },
        aligned,
        target,
    )


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdb", type=Path, required=True)
    parser.add_argument("--sequence", required=True)
    parser.add_argument("--reference", type=Path)
    args = parser.parse_args(argv)
    try:
        result = screen_structure(args.pdb, args.sequence)
        result["pdb_sha256"] = hashlib.sha256(args.pdb.read_bytes()).hexdigest()
        if args.reference:
            result["reference_comparison"] = compare_ca(args.pdb, args.reference)[0]
            result["reference_sha256"] = hashlib.sha256(args.reference.read_bytes()).hexdigest()
    except (OSError, ValueError) as error:
        parser.error(str(error))
    print(json.dumps(result, indent=2))
    if result["cn_screen"] == "fail":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
