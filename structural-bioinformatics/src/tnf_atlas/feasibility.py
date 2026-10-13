"""Static SASA/contact experiment on an explicitly selected partial TNF–Fab interface.

Distances are in Å and areas in Å². Rigid separation is a numerical control, not
a dissociation trajectory, affinity calculation or biological specificity test.
"""

import numpy as np
from Bio.PDB import Chain, Model, Residue
from Bio.PDB.SASA import ShrakeRupley

from .structure import distance_contacts, heavy_atoms, read_model, residue_key

# Explicitly pin the Biopython 1.88 default radii for the elements in 3WD5.
# Unknown elements are rejected instead of using an undocumented fallback radius.
VDW_RADII_ANGSTROM = {"C": 1.70, "N": 1.55, "O": 1.52, "S": 1.80}


def selected_model(path, chains=("A", "H", "L")):
    """Copy only strict protein-heavy selection into an ordinary Bio.PDB model."""
    source = read_model(path)
    if not chains or len(set(chains)) != len(chains):
        raise ValueError("Select nonempty distinct author chains")
    model = Model.Model(source.id)
    for chain_id in chains:
        if chain_id not in source:
            raise ValueError(f"Missing author chain {chain_id!r}")
        chain = Chain.Chain(chain_id)
        atoms = heavy_atoms(source[chain_id])
        if not atoms:
            raise ValueError(f"No selected protein heavy atoms in chain {chain_id!r}")
        for atom in atoms:
            original_residue = atom.get_parent()
            if original_residue.id not in chain:
                chain.add(Residue.Residue(original_residue.id, original_residue.resname, ""))
            copy = atom.copy()
            copy.set_coord(np.asarray(atom.coord, dtype=np.float64).copy())
            # The chosen alternate is now one explicit ordinary atom. Its altloc
            # identifier remains recorded; no DisorderedAtom wrapper is copied.
            copy.disordered_flag = 0
            chain[original_residue.id].add(copy)
        model.add(chain)
    return model


def atom_coordinates(model, chains):
    """Coordinates of all atoms in the requested selected author chains."""
    return np.asarray(
        [atom.coord for cid in chains for atom in model[cid].get_atoms()], dtype=float
    )


def component_model(model, chains):
    """Keep H/L together when extracting Fab, preserving their internal association."""
    if not chains or len(set(chains)) != len(chains):
        raise ValueError("Component chains must be nonempty and distinct")
    component = Model.Model(model.id)
    for chain_id in chains:
        component.add(model[chain_id].copy())
    return component


def rigid_translate(model, chains=("H", "L"), translation=(150.0, 0.0, 0.0)):
    """Translate whole selected chains in a copy; this has no time/force model."""
    vector = np.asarray(translation, dtype=float)
    if vector.shape != (3,) or not np.isfinite(vector).all():
        raise ValueError("Translation must be a finite three-dimensional vector")
    if not chains or len(set(chains)) != len(chains):
        raise ValueError("Translated chains must be nonempty and distinct")
    moved = model.copy()
    for chain_id in chains:
        for atom in moved[chain_id].get_atoms():
            atom.set_coord(np.asarray(atom.coord, dtype=float) + vector)
    return moved


def pair_distance_change(before, after, chunk_size=128):
    """Maximum change of *all* intracomponent atom-pair distances; bounded memory."""
    before, after = np.asarray(before, dtype=float), np.asarray(after, dtype=float)
    if (
        before.shape != after.shape
        or before.ndim != 2
        or before.shape[1] != 3
        or not np.isfinite(before).all()
        or not np.isfinite(after).all()
    ):
        raise ValueError("Paired finite coordinate arrays must have identical (N, 3) shape")
    maximum = 0.0
    for start in range(0, len(before), chunk_size):
        first = np.linalg.norm(before[start : start + chunk_size, None] - before[None], axis=2)
        second = np.linalg.norm(after[start : start + chunk_size, None] - after[None], axis=2)
        maximum = max(maximum, float(np.max(np.abs(first - second), initial=0.0)))
    return maximum


def minimum_distance(left, right, chunk_size=128):
    """Exact minimum intercomponent heavy-atom distance, in bounded memory."""
    left, right = np.asarray(left, dtype=float), np.asarray(right, dtype=float)
    if (
        left.ndim != 2
        or right.ndim != 2
        or left.shape[1] != 3
        or right.shape[1] != 3
        or not len(left)
        or not len(right)
        or not np.isfinite(left).all()
        or not np.isfinite(right).all()
    ):
        raise ValueError("Distance requires nonempty finite (N, 3) coordinates")
    closest = float("inf")
    for start in range(0, len(left), chunk_size):
        squared = np.sum((left[start : start + chunk_size, None] - right[None]) ** 2, axis=2)
        closest = min(closest, float(np.sqrt(squared.min())))
    return closest


def solvent_accessible_area(model, n_points=960, probe_radius=1.4):
    """Shrake–Rupley SASA with explicit radii, deterministic golden-spiral points."""
    if not np.isfinite(probe_radius) or probe_radius <= 0:
        raise ValueError("Probe radius must be finite and positive")
    if isinstance(n_points, bool) or not isinstance(n_points, int) or n_points < 1:
        raise ValueError("Sphere point count must be a positive integer")
    atoms = list(model.get_atoms())
    if not atoms:
        raise ValueError("SASA requires atoms")
    if any(atom.element not in VDW_RADII_ANGSTROM for atom in atoms):
        raise ValueError("Element has no explicitly declared van der Waals radius")
    if any(not np.isfinite(atom.coord).all() for atom in atoms):
        raise ValueError("SASA coordinates must be finite")
    calculator = ShrakeRupley(
        probe_radius=probe_radius, n_points=n_points, radii_dict=VDW_RADII_ANGSTROM
    )
    calculator.compute(model, level="M")
    return float(model.sasa)


def buried_surface(model, n_points=960, probe_radius=1.4, target="A", partners=("H", "L")):
    """Surface loss at the fixed deposited pose, without relaxing isolated partners.

    ΔSASA is loss from both sides. ΔSASA/2 is the explicitly chosen mean-side
    interface-area convention, not a free energy or a full physiological interface.
    """
    if target in partners:
        raise ValueError("Target and partner chains must be distinct")
    target_model = component_model(model, (target,))
    partner_model = component_model(model, partners)
    combined = component_model(model, (target, *partners))
    target_area = solvent_accessible_area(target_model, n_points, probe_radius)
    partner_area = solvent_accessible_area(partner_model, n_points, probe_radius)
    combined_area = solvent_accessible_area(combined, n_points, probe_radius)
    target_in_complex = sum(float(a.sasa) for a in combined[target].get_atoms())
    partner_in_complex = sum(float(a.sasa) for cid in partners for a in combined[cid].get_atoms())
    lost = target_area + partner_area - combined_area
    return {
        "n_points_per_atom": n_points,
        "probe_radius_angstrom": probe_radius,
        "isolated_target_sasa_angstrom2": target_area,
        "isolated_associated_fab_sasa_angstrom2": partner_area,
        "complex_sasa_angstrom2": combined_area,
        "target_lost_sasa_angstrom2": target_area - target_in_complex,
        "fab_lost_sasa_angstrom2": partner_area - partner_in_complex,
        "total_lost_sasa_angstrom2": lost,
        "mean_side_interface_area_angstrom2": lost / 2.0,
    }


def contact_summary(model, cutoff=4.5, target="A", partners=("H", "L")):
    """Contacts/residue counts for an already strictly selected model."""
    left = list(model[target].get_atoms())
    right = [atom for cid in partners for atom in model[cid].get_atoms()]
    contacts = distance_contacts([a.coord for a in left], [a.coord for a in right], cutoff)
    residue_pairs = {(residue_key(left[i]), residue_key(right[j])) for i, j, _ in contacts}
    return {
        "cutoff_angstrom": cutoff,
        "heavy_atom_contact_count": len(contacts),
        "residue_pair_count": len(residue_pairs),
        "target_interface_residue_count": len({a for a, _ in residue_pairs}),
        "fab_interface_residue_count": len({b for _, b in residue_pairs}),
    }
