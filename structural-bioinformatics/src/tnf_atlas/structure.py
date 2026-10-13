"""Heavy-atom contact analysis using author chain/residue identifiers, distances in Å."""

from collections import defaultdict
from pathlib import Path

import numpy as np
from Bio.PDB import MMCIFParser, PDBParser, is_aa


def read_model(path: Path):
    """Read the first coordinate model; mmCIF defaults to author chain identifiers."""
    parser = (
        MMCIFParser(QUIET=True, auth_chains=True, auth_residues=True)
        if path.suffix.lower() in {".cif", ".mmcif"}
        else PDBParser(QUIET=True, PERMISSIVE=False)
    )
    try:
        structure = parser.get_structure(path.stem, str(path))
        model = next(structure.get_models())
    except (StopIteration, ValueError) as exc:
        raise ValueError(f"No valid coordinate model in {path}") from exc
    if not list(model.get_atoms()):
        raise ValueError(f"No atoms in {path}")
    return model


def heavy_atoms(chain):
    """Protein ATOM heavy atoms, excluding waters, heterogens, H/D and zero occupancy.

    Alternate sites: highest occupancy; ties prefer blank, then A, then alphabetical.
    """
    atoms = []
    for residue in chain:
        if residue.id[0] != " " or not is_aa(residue, standard=False):
            continue
        for candidate in residue:
            choices = (
                candidate.disordered_get_list() if candidate.is_disordered() == 2 else [candidate]
            )
            if any(
                item.get_occupancy() is None or not np.isfinite(item.get_occupancy())
                for item in choices
            ):
                raise ValueError("Atomic occupancy must be finite and specified")
            atom = sorted(
                choices,
                key=lambda item: (
                    -(item.get_occupancy() or 0),
                    item.get_altloc() != " ",
                    item.get_altloc() != "A",
                    item.get_altloc(),
                ),
            )[0]
            if atom.element.upper() in {"H", "D"} or (atom.get_occupancy() or 0) <= 0:
                continue
            if not np.isfinite(atom.coord).all():
                raise ValueError("Non-finite atomic coordinates")
            atoms.append(atom)
    return atoms


def distance_contacts(left, right, cutoff: float):
    """Return indices and distances for inclusive heavy-atom contacts; bounded memory."""
    if not np.isfinite(cutoff) or cutoff <= 0:
        raise ValueError("Cutoff must be finite and positive")
    left = np.asarray(left, dtype=float)
    right = np.asarray(right, dtype=float)
    if left.shape == (0,):
        left = left.reshape((0, 3))
    if right.shape == (0,):
        right = right.reshape((0, 3))
    if any(points.ndim != 2 or points.shape[1] != 3 for points in [left, right]):
        raise ValueError("Coordinates must have shape (N, 3)")
    if not np.isfinite(left).all() or not np.isfinite(right).all():
        raise ValueError("Coordinates must be finite")
    contacts = []
    for start in range(0, len(left), 256):
        squared = np.sum((left[start : start + 256, None, :] - right[None, :, :]) ** 2, axis=2)
        rows, columns = np.where(squared <= cutoff**2)
        contacts.extend(
            (int(start + row), int(column), float(np.sqrt(squared[row, column])))
            for row, column in zip(rows, columns, strict=True)
        )
    return contacts


def residue_key(atom):
    residue = atom.get_parent()
    return (residue.get_parent().id, residue.id[1], residue.id[2].strip(), residue.resname)


def residue_record(key):
    chain, number, insertion, name = key
    return {"chain": chain, "number": number, "insertion": insertion, "name": name}


def analyze_interface(path: Path, target="A", partners=("H", "L"), cutoff=4.5):
    """Analyze one explicitly selected protomer–Fab interface, not a generated TNF trimer."""
    if target in partners or len(set(partners)) != len(partners) or not partners:
        raise ValueError("Target and nonempty partner chains must be distinct")
    model = read_model(path)
    requested = [target, *partners]
    for chain in requested:
        if chain not in model:
            raise ValueError(f"Missing author chain {chain!r}; available: {list(model.child_dict)}")
    left = heavy_atoms(model[target])
    right = [atom for chain in partners for atom in heavy_atoms(model[chain])]
    if not left or not right:
        raise ValueError("Selected chains must contain protein heavy atoms")
    contacts = distance_contacts([a.coord for a in left], [a.coord for a in right], cutoff)
    grouped = defaultdict(list)
    for i, j, distance in contacts:
        grouped[(residue_key(left[i]), residue_key(right[j]))].append(distance)
    pairs = [
        {
            "target": residue_record(a),
            "partner": residue_record(b),
            "minimum_distance_angstrom": round(min(distances), 4),
            "atom_pair_count": len(distances),
        }
        for (a, b), distances in sorted(grouped.items())
    ]
    target_residues = sorted({residue_key(left[i]) for i, _, _ in contacts})
    partner_residues = sorted({residue_key(right[j]) for _, j, _ in contacts})
    counts = {
        chain: {
            "protein_residues": sum(r.id[0] == " " and is_aa(r) for r in model[chain]),
            "heavy_atoms": len(heavy_atoms(model[chain])),
            "ca_atoms": sum(atom.name == "CA" for atom in heavy_atoms(model[chain])),
        }
        for chain in requested
    }
    return {
        "cutoff_angstrom": cutoff,
        "model_id": model.id,
        "chain_namespace": "author",
        "target_chain": target,
        "partner_chains": list(partners),
        "atom_selection": "protein ATOM, highest-occupancy altloc, no H/D or zero occupancy",
        "chain_counts": counts,
        "heavy_atom_contact_count": len(contacts),
        "residue_pair_count": len(pairs),
        "target_interface_residues": [residue_record(key) for key in target_residues],
        "partner_interface_residues": [residue_record(key) for key in partner_residues],
        "residue_pairs": pairs,
    }
