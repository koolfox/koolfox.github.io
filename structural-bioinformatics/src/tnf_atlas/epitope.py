"""Full-epitope geometry of 3WD5: crystal-symmetry TNF trimer, interaction types and CDRs.

Distances are in Å, areas in Å². Every quantity is geometric and computed from deposited
coordinates. Interaction labels are distance/atom-type rules without hydrogens, angles,
electrostatics or energies; they are candidates for interpretation, not measured bonds.
"""

import re
from collections import defaultdict
from itertools import product

import numpy as np
from Bio.PDB import Model
from Bio.PDB.SASA import ShrakeRupley
from Bio.SeqUtils import seq1

from .feasibility import VDW_RADII_ANGSTROM
from .structure import distance_contacts, residue_key, residue_record

# International Tables for Crystallography Vol. A, space group 199 (I 2_1 3): the twelve
# general positions of the primitive part; the body-centring vector (1/2,1/2,1/2) is added.
I213_GENERAL_POSITIONS = (
    "x,y,z",
    "-x+1/2,-y,z+1/2",
    "-x,y+1/2,-z+1/2",
    "x+1/2,-y+1/2,-z",
    "z,x,y",
    "z+1/2,-x+1/2,-y",
    "-z+1/2,-x,y+1/2",
    "-z,x+1/2,-y+1/2",
    "y,z,x",
    "-y,z+1/2,-x+1/2",
    "y+1/2,-z+1/2,-x",
    "-y+1/2,-z,x+1/2",
)
I213_CENTRING = ((0.0, 0.0, 0.0), (0.5, 0.5, 0.5))

# Polar atoms that can donate or accept a hydrogen bond in standard residues. Backbone N
# donates (except proline) and backbone O accepts. Without hydrogens, His/Ser/Thr/Tyr
# hydroxyl and imidazole atoms are counted as both.
DONORS = {
    "ARG": {"NE", "NH1", "NH2"},
    "ASN": {"ND2"},
    "GLN": {"NE2"},
    "HIS": {"ND1", "NE2"},
    "LYS": {"NZ"},
    "SER": {"OG"},
    "THR": {"OG1"},
    "TRP": {"NE1"},
    "TYR": {"OH"},
}
ACCEPTORS = {
    "ASP": {"OD1", "OD2"},
    "GLU": {"OE1", "OE2"},
    "ASN": {"OD1"},
    "GLN": {"OE1"},
    "HIS": {"ND1", "NE2"},
    "SER": {"OG"},
    "THR": {"OG1"},
    "TYR": {"OH"},
    "MET": {"SD"},
}
CATIONIC = {"LYS": {"NZ"}, "ARG": {"NE", "NH1", "NH2"}}
ANIONIC = {"ASP": {"OD1", "OD2"}, "GLU": {"OE1", "OE2"}}
BACKBONE = {"N", "CA", "C", "O", "OXT"}

HBOND_CUTOFF = 3.5
SALT_BRIDGE_CUTOFF = 4.0
APOLAR_CUTOFF = 4.0


def parse_operator(text):
    """Parse an International-Tables operator such as 'z+1/2,-x+1/2,-y' into (R, t)."""
    terms = text.replace(" ", "").split(",")
    if len(terms) != 3:
        raise ValueError(f"Operator needs three components: {text!r}")
    rotation, translation = np.zeros((3, 3)), np.zeros(3)
    for row, expression in enumerate(terms):
        for sign, token in re.findall(r"([+-]?)([xyz]|\d+/\d+|\d+)", expression):
            value = -1.0 if sign == "-" else 1.0
            if token in "xyz":
                rotation[row, "xyz".index(token)] = value
            else:
                numerator, _, denominator = token.partition("/")
                translation[row] += value * float(numerator) / float(denominator or 1)
        if not rotation[row].any():
            raise ValueError(f"Operator row has no coordinate: {expression!r}")
    if not np.isclose(abs(np.linalg.det(rotation)), 1.0):
        raise ValueError(f"Operator is not a crystallographic rotation: {text!r}")
    return rotation, translation


def orthogonalization(cell):
    """PDB-convention fractional→Cartesian matrix for (a, b, c, α, β, γ) in Å and degrees."""
    a, b, c, alpha, beta, gamma = cell
    alpha, beta, gamma = np.radians([alpha, beta, gamma])
    volume = np.sqrt(
        1
        - np.cos(alpha) ** 2
        - np.cos(beta) ** 2
        - np.cos(gamma) ** 2
        + 2 * np.cos(alpha) * np.cos(beta) * np.cos(gamma)
    )
    return np.array(
        [
            [a, b * np.cos(gamma), c * np.cos(beta)],
            [
                0,
                b * np.sin(gamma),
                c * (np.cos(alpha) - np.cos(beta) * np.cos(gamma)) / np.sin(gamma),
            ],
            [0, 0, c * volume / np.sin(gamma)],
        ]
    )


def symmetry_copies(coordinates, cell, operators, centring, max_centroid_distance):
    """Cartesian symmetry operations whose copy's centroid lies near the original centroid.

    Lattice translations −2…+2 per axis are searched. Returns sorted
    (distance, operator, lattice shift, 3×3 rotation, translation vector) records.
    """
    points = np.asarray(coordinates, dtype=float)
    to_cartesian = orthogonalization(cell)
    to_fractional = np.linalg.inv(to_cartesian)
    centroid = points.mean(axis=0)
    fractional_centroid = to_fractional @ centroid
    found = []
    for operator in operators:
        rotation, translation = parse_operator(operator)
        cartesian_rotation = to_cartesian @ rotation @ to_fractional
        for shift in centring:
            for lattice in product(range(-2, 3), repeat=3):
                offset = translation + np.asarray(shift) + np.asarray(lattice, dtype=float)
                moved = to_cartesian @ (rotation @ fractional_centroid + offset)
                distance = float(np.linalg.norm(moved - centroid))
                if distance <= max_centroid_distance:
                    found.append(
                        (
                            distance,
                            operator,
                            tuple(float(v) for v in np.asarray(shift) + lattice),
                            cartesian_rotation,
                            to_cartesian @ offset,
                        )
                    )
    return sorted(found, key=lambda item: (round(item[0], 6), item[1], item[2]))


def transformed_chain(chain, rotation, translation, new_id):
    """Copy a chain and apply x' = R x + t to every atom."""
    copy = chain.copy()
    copy.id = new_id
    for atom in copy.get_atoms():
        atom.set_coord(rotation @ np.asarray(atom.coord, dtype=float) + translation)
    return copy


def assemble(chains):
    """Ordinary model from already-selected chains; duplicate identifiers are rejected."""
    model = Model.Model(0)
    for chain in chains:
        if chain.id in model:
            raise ValueError(f"Duplicate chain identifier {chain.id!r}")
        model.add(chain)
    return model


def superposition_rmsd(moving, reference):
    """Kabsch optimal-superposition RMSD between paired (N, 3) coordinates."""
    moving, reference = np.asarray(moving, dtype=float), np.asarray(reference, dtype=float)
    if moving.shape != reference.shape or moving.ndim != 2 or len(moving) < 3:
        raise ValueError("Superposition needs at least three paired (N, 3) points")
    left, right = moving - moving.mean(axis=0), reference - reference.mean(axis=0)
    u, _, vt = np.linalg.svd(left.T @ right)
    correction = np.diag([1.0, 1.0, np.sign(np.linalg.det(u @ vt))])
    rotated = left @ (u @ correction @ vt)
    return float(np.sqrt(np.mean(np.sum((rotated - right) ** 2, axis=1))))


def classify_pair(left, right, distance):
    """Interaction labels for one heavy-atom pair, by element/atom name and distance."""
    labels = []
    a_res, b_res = left.get_parent().resname, right.get_parent().resname
    a_name, b_name = left.get_id(), right.get_id()

    def donor(residue, name):
        return (name == "N" and residue != "PRO") or name in DONORS.get(residue, ())

    def acceptor(residue, name):
        return name in {"O", "OXT"} or name in ACCEPTORS.get(residue, ())

    if distance <= HBOND_CUTOFF and (
        (donor(a_res, a_name) and acceptor(b_res, b_name))
        or (acceptor(a_res, a_name) and donor(b_res, b_name))
    ):
        labels.append("hydrogen_bond_candidate")
    if distance <= SALT_BRIDGE_CUTOFF and (
        (a_name in CATIONIC.get(a_res, ()) and b_name in ANIONIC.get(b_res, ()))
        or (a_name in ANIONIC.get(a_res, ()) and b_name in CATIONIC.get(b_res, ()))
    ):
        labels.append("salt_bridge_candidate")
    if (
        distance <= APOLAR_CUTOFF
        and left.element == "C"
        and right.element == "C"
        and a_name not in BACKBONE
        and b_name not in BACKBONE
    ):
        labels.append("side_chain_carbon_contact")
    return labels


def typed_interactions(target_atoms, partner_atoms, cutoff=4.5):
    """Residue-pair interaction table between two atom lists."""
    contacts = distance_contacts(
        [a.coord for a in target_atoms], [a.coord for a in partner_atoms], cutoff
    )
    grouped = defaultdict(lambda: {"distances": [], "types": defaultdict(list)})
    for i, j, distance in contacts:
        left, right = target_atoms[i], partner_atoms[j]
        entry = grouped[(residue_key(left), residue_key(right))]
        entry["distances"].append(distance)
        for label in classify_pair(left, right, distance):
            entry["types"][label].append(
                {"target_atom": left.get_id(), "partner_atom": right.get_id(), "distance": distance}
            )
    rows = []
    for (a, b), entry in sorted(grouped.items()):
        rows.append(
            {
                "target": residue_record(a),
                "partner": residue_record(b),
                "atom_pair_count": len(entry["distances"]),
                "minimum_distance_angstrom": round(min(entry["distances"]), 3),
                "interaction_types": {
                    label: [
                        {**item, "distance": round(item["distance"], 3)}
                        for item in sorted(items, key=lambda x: x["distance"])
                    ]
                    for label, items in sorted(entry["types"].items())
                },
            }
        )
    return {"heavy_atom_contact_count": len(contacts), "residue_pairs": rows}


def residue_sasa(model, n_points=960, probe_radius=1.4):
    """Per-residue SASA (Å²) keyed by residue_key, using the pinned feasibility radii."""
    atoms = list(model.get_atoms())
    if any(atom.element not in VDW_RADII_ANGSTROM for atom in atoms):
        raise ValueError("Element has no explicitly declared van der Waals radius")
    ShrakeRupley(
        probe_radius=probe_radius, n_points=n_points, radii_dict=VDW_RADII_ANGSTROM
    ).compute(model, level="R")
    return {residue_key(next(iter(r))): float(r.sasa) for r in model.get_residues()}


def buried_by_residue(model, target_chains, partner_chains, n_points=960, probe_radius=1.4):
    """ΔSASA per residue when target and partner groups separate rigidly (no relaxation)."""
    if set(target_chains) & set(partner_chains):
        raise ValueError("Target and partner chain groups must be disjoint")
    complex_area = residue_sasa(
        assemble([model[c].copy() for c in (*target_chains, *partner_chains)]),
        n_points,
        probe_radius,
    )
    alone = {}
    for group in (target_chains, partner_chains):
        alone.update(
            residue_sasa(assemble([model[c].copy() for c in group]), n_points, probe_radius)
        )
    return {key: alone[key] - complex_area[key] for key in alone}


def chain_sequence(chain):
    """One-letter sequence and author residue numbers of standard polymer residues."""
    residues = [r for r in chain if r.id[0] == " "]
    return "".join(seq1(r.resname) for r in residues), [r.id[1] for r in residues]


def locate_cdrs(sequence, chain_type):
    """Kabat-style CDR spans from Martin's sequence rules (0-based, end-exclusive).

    Rules (www.bioinf.org.uk/abs/info.html): heavy H1 starts four residues after the
    Cys near position 22 plus the 'GFTF'-type segment (Kabat 31) and precedes W-V/I-R-Q;
    H2 starts 15 residues after H1 and ends before K/R-L/I/V/F/T/A-T/S/I/A; H3 follows
    C-X-X and precedes W-G-X-G. Light L1 follows the Cys near 23 and precedes W-Y/L/F-Q/L;
    L2 starts 16 after L1 and is seven residues; L3 follows Cys and precedes F-G-X-G.
    Unrecognized sequences raise rather than guess.
    """
    s = sequence
    if chain_type == "heavy":
        first_cys = s.find("C", 18, 26)
        h1_start = first_cys + 9
        h1_end = re.search(r"W[VI][RK]Q", s[h1_start:]).start() + h1_start
        h2_start = h1_end + 14
        tail = re.search(r"[KR][LIVFTA][TSIA]", s[h2_start + 15 : h2_start + 21])
        h2_end = h2_start + 15 + tail.start()
        cys = s.find("C", h2_end + 25, h2_end + 35)
        h3_start = cys + 3
        h3_end = re.search(r"WG.G", s[h3_start:]).start() + h3_start
        spans = {"CDR-H1": (h1_start, h1_end), "CDR-H2": (h2_start, h2_end)}
        spans["CDR-H3"] = (h3_start, h3_end)
    elif chain_type == "light":
        first_cys = s.find("C", 18, 26)
        l1_start = first_cys + 1
        l1_end = re.search(r"W[YLF][QL]", s[l1_start:]).start() + l1_start
        l2_start = l1_end + 15
        l2_end = l2_start + 7
        cys = s.find("C", l2_end + 25, l2_end + 36)
        l3_start = cys + 1
        l3_end = re.search(r"FG.G", s[l3_start:]).start() + l3_start
        spans = {"CDR-L1": (l1_start, l1_end), "CDR-L2": (l2_start, l2_end)}
        spans["CDR-L3"] = (l3_start, l3_end)
    else:
        raise ValueError("chain_type must be 'heavy' or 'light'")
    if first_cys < 0 or any(end <= start for start, end in spans.values()):
        raise ValueError("Antibody variable-domain landmarks were not found")
    return spans
