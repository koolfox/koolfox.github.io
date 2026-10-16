"""Reconstruct the 3WD5 crystal TNF trimer and characterize the full adalimumab Fab epitope.

Run from repository root with the locked environment; no network is needed:
uv run --project structural-bioinformatics python \
    structural-bioinformatics/scripts/analyze_full_epitope.py

Inputs are the public, hash-recorded `assets/3wd5.pdb` and `assets/1tnf.pdb`. Outputs:
`data/processed/full-epitope.json`, `assets/full-epitope.{svg,png}` and the model
`assets/3wd5-trimer-3fab.pdb` (symmetry-generated coordinates, not a new deposition).
"""

import argparse
import hashlib
import json
import platform
from collections import defaultdict
from datetime import UTC, datetime
from importlib.metadata import version
from itertools import permutations
from pathlib import Path

import matplotlib
import numpy as np
from Bio.PDB import PDBIO
from matplotlib.patches import Patch

from tnf_atlas.epitope import (
    APOLAR_CUTOFF,
    HBOND_CUTOFF,
    I213_CENTRING,
    I213_GENERAL_POSITIONS,
    SALT_BRIDGE_CUTOFF,
    assemble,
    buried_by_residue,
    chain_sequence,
    locate_cdrs,
    superposition_rmsd,
    symmetry_copies,
    transformed_chain,
    typed_interactions,
)
from tnf_atlas.feasibility import minimum_distance, selected_model

matplotlib.use("Agg")
from matplotlib import pyplot as plt  # noqa: E402

PROJECT = Path(__file__).resolve().parents[1]
CELL_3WD5 = (161.849, 161.849, 161.849, 90.0, 90.0, 90.0)  # CRYST1 record, I 21 3
CONTACT_CUTOFF = 4.5
SASA_POINTS = 960
BURIED_THRESHOLD = 1.0  # Å² of ΔSASA for listing a residue as buried
HU_2013_Q21A = {
    "source": "Hu et al. 2013, J Biol Chem 288:27059, Table 3; doi:10.1074/jbc.M113.491530",
    "kd_wild_type_molar": 1.152e-10,
    "kd_q21a_molar": 2.335e-8,
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cryst1(path):
    """Cell parameters and space group read from the PDB CRYST1 record."""
    for line in path.read_text().splitlines():
        if line.startswith("CRYST1"):
            values = tuple(float(line[i:j]) for i, j in ((6, 15), (15, 24), (24, 33)))
            angles = tuple(float(line[i:j]) for i, j in ((33, 40), (40, 47), (47, 54)))
            return values + angles, line[55:66].strip()
    raise ValueError("No CRYST1 record")


def label(record):
    return f"{record['chain']}:{record['name']}{record['number']}{record['insertion']}"


def build_assembly(model):
    """TNF trimer (A,B,C) and three Fabs (H/L, I/M, J/N) from the crystallographic 3-fold."""
    tnf = [atom.coord for atom in model["A"].get_atoms()]
    copies = symmetry_copies(tnf, CELL_3WD5, I213_GENERAL_POSITIONS, I213_CENTRING, 40.0)
    neighbours = [c for c in copies if c[0] > 1e-6]
    # The two nearest copies form the trimer; the next copy is reported as a lattice contact.
    trimer_ops = neighbours[:2]
    if len(trimer_ops) != 2 or abs(trimer_ops[0][0] - trimer_ops[1][0]) > 1e-3:
        raise ValueError("Expected two equidistant three-fold copies of the TNF protomer")
    chains = [model["A"].copy(), model["H"].copy(), model["L"].copy()]
    for (_, _, _, rotation, translation), (t_id, h_id, l_id) in zip(
        trimer_ops, (("B", "I", "M"), ("C", "J", "N")), strict=True
    ):
        chains.append(transformed_chain(model["A"], rotation, translation, t_id))
        chains.append(transformed_chain(model["H"], rotation, translation, h_id))
        chains.append(transformed_chain(model["L"], rotation, translation, l_id))
    order = ["A", "B", "C", "H", "L", "I", "M", "J", "N"]
    lookup = {chain.id: chain for chain in chains}
    return assemble([lookup[c] for c in order]), copies


def trimer_validation(assembly, reference_path):
    """Cα RMSD of reconstructed trimer against independent apo TNF trimer 1TNF."""
    reference = selected_model(reference_path, ("A", "B", "C"))

    def ca(chain):
        return {r.id[1]: r["CA"].coord for r in chain if "CA" in r}

    mine = {c: ca(assembly[c]) for c in "ABC"}
    results = []
    for pairing in permutations("ABC"):
        left, right = [], []
        for own, other in zip("ABC", pairing, strict=True):
            theirs = ca(reference[other])
            for number in sorted(set(mine[own]) & set(theirs)):
                left.append(mine[own][number])
                right.append(theirs[number])
        results.append((superposition_rmsd(left, right), "".join(pairing), len(left)))
    best = min(results)
    return {
        "reference_pdb": "1TNF",
        "best_chain_pairing": dict(zip("ABC", best[1], strict=True)),
        "paired_ca_atoms": best[2],
        "ca_rmsd_angstrom": round(best[0], 3),
        "note": "Optimal Kabsch superposition; 1TNF is an independent unbound TNF crystal.",
    }


def cdr_lookup(model):
    """Map (chain, author number) to Kabat-style CDR label for the deposited Fab."""
    lookup = {}
    spans_out = {}
    for chain_id, chain_type in (("H", "heavy"), ("L", "light")):
        sequence, numbers = chain_sequence(model[chain_id])
        spans = locate_cdrs(sequence, chain_type)
        for name, (start, end) in spans.items():
            spans_out[name] = {
                "chain": chain_id,
                "author_start": numbers[start],
                "author_end": numbers[end - 1],
                "sequence": sequence[start:end],
            }
            for number in numbers[start:end]:
                lookup[(chain_id, number)] = name
    return lookup, spans_out


def summarize(model, assembly, copies):
    fab_atoms = [a for c in ("H", "L") for a in assembly[c].get_atoms()]
    cdrs, cdr_spans = cdr_lookup(model)
    per_protomer = {}
    pairs = []
    for protomer in "ABC":
        table = typed_interactions(list(assembly[protomer].get_atoms()), fab_atoms, CONTACT_CUTOFF)
        per_protomer[protomer] = {
            "heavy_atom_contact_count": table["heavy_atom_contact_count"],
            "residue_pair_count": len(table["residue_pairs"]),
            "tnf_residues": sorted(
                {label(row["target"]) for row in table["residue_pairs"]},
                key=lambda x: int("".join(ch for ch in x.split(":")[1] if ch.isdigit())),
            ),
        }
        pairs.extend(table["residue_pairs"])
    for row in pairs:
        row["partner"]["region"] = cdrs.get(
            (row["partner"]["chain"], row["partner"]["number"]), "framework"
        )
    buried = buried_by_residue(assembly, ("A", "B", "C"), ("H", "L"), SASA_POINTS)
    partial = buried_by_residue(assembly, ("A",), ("H", "L"), SASA_POINTS)
    tnf_buried = {k: v for k, v in buried.items() if k[0] in "ABC" and v >= BURIED_THRESHOLD}
    fab_buried = {k: v for k, v in buried.items() if k[0] in "HL" and v >= BURIED_THRESHOLD}
    counts = defaultdict(set)
    for row in pairs:
        for kind in row["interaction_types"]:
            counts[kind].add((label(row["target"]), label(row["partner"])))
    region_area = defaultdict(float)
    region_contacts = defaultdict(int)
    for key, area in fab_buried.items():
        region_area[cdrs.get((key[0], key[1]), "framework")] += area
    for row in pairs:
        region_contacts[row["partner"]["region"]] += row["atom_pair_count"]
    fab_heavy = [a.coord for c in ("H", "L") for a in assembly[c].get_atoms()]
    fab_fab = {
        f"HL–{h}{lchain}": round(
            minimum_distance(
                fab_heavy, [a.coord for c in (h, lchain) for a in assembly[c].get_atoms()]
            ),
            3,
        )
        for h, lchain in (("I", "M"), ("J", "N"))
    }
    q21 = ("A", 21, "", "GLN")
    q21_rows = [
        row for row in pairs if (row["target"]["chain"], row["target"]["number"]) == ("A", 21)
    ]
    r31 = [row for row in pairs if row["target"]["number"] == 31]
    total_full = sum(v for v in buried.values() if v > 0)
    total_partial = sum(v for v in partial.values() if v > 0)
    return {
        "symmetry_search": [
            {
                "centroid_distance_angstrom": round(d, 3),
                "operator": op,
                "lattice_and_centring_shift": list(shift),
            }
            for d, op, shift, _, _ in copies
        ],
        "per_protomer": per_protomer,
        "neighbour_fraction_of_contacts": round(
            sum(v["heavy_atom_contact_count"] for k, v in per_protomer.items() if k != "A")
            / sum(v["heavy_atom_contact_count"] for v in per_protomer.values()),
            4,
        ),
        "buried_surface": {
            "points_per_atom": SASA_POINTS,
            "probe_radius_angstrom": 1.4,
            "residue_threshold_angstrom2": BURIED_THRESHOLD,
            "full_epitope_total_delta_sasa_angstrom2": round(total_full, 1),
            "full_epitope_mean_side_area_angstrom2": round(total_full / 2, 1),
            "single_protomer_total_delta_sasa_angstrom2": round(total_partial, 1),
            "tnf_by_protomer_angstrom2": {
                p: round(sum(v for k, v in tnf_buried.items() if k[0] == p), 1) for p in "ABC"
            },
            "fab_by_region_angstrom2": {k: round(v, 1) for k, v in sorted(region_area.items())},
            "tnf_residues": [
                {
                    "residue": label(
                        dict(zip(("chain", "number", "insertion", "name"), k, strict=True))
                    ),
                    "delta_sasa_angstrom2": round(v, 1),
                }
                for k, v in sorted(tnf_buried.items(), key=lambda kv: (kv[0][0], kv[0][1]))
            ],
            "fab_residues": [
                {
                    "residue": label(
                        dict(zip(("chain", "number", "insertion", "name"), k, strict=True))
                    ),
                    "region": cdrs.get((k[0], k[1]), "framework"),
                    "delta_sasa_angstrom2": round(v, 1),
                }
                for k, v in sorted(fab_buried.items(), key=lambda kv: (kv[0][0], kv[0][1]))
            ],
        },
        "interaction_candidates": {
            "definitions": {
                "hydrogen_bond_candidate": (
                    f"donor–acceptor N/O(/S) heavy atoms ≤ {HBOND_CUTOFF} Å; no H or angle"
                ),
                "salt_bridge_candidate": (
                    f"Lys NZ/Arg NE,NH1,NH2 to Asp/Glu carboxylate O ≤ {SALT_BRIDGE_CUTOFF} Å"
                ),
                "side_chain_carbon_contact": f"side-chain C–C ≤ {APOLAR_CUTOFF} Å",
            },
            "residue_pair_counts": {k: len(v) for k, v in sorted(counts.items())},
            "residue_pairs": {
                k: sorted(f"{a} — {b}" for a, b in v) for k, v in sorted(counts.items())
            },
        },
        "fab_contacts_by_region": dict(sorted(region_contacts.items())),
        "cdr_definitions": cdr_spans,
        "simultaneous_fab_minimum_distance_angstrom": fab_fab,
        "hu_2013_q21a_context": {
            **HU_2013_Q21A,
            "kd_ratio": round(
                HU_2013_Q21A["kd_q21a_molar"] / HU_2013_Q21A["kd_wild_type_molar"], 1
            ),
            "q21_delta_sasa_angstrom2": round(buried.get(q21, 0.0), 1),
            "q21_partners": [
                {
                    "partner": label(r["partner"]),
                    "region": r["partner"]["region"],
                    "minimum_distance_angstrom": r["minimum_distance_angstrom"],
                    "types": sorted(r["interaction_types"]),
                }
                for r in q21_rows
            ],
        },
        "construct_note": {
            "residue": "A:ASP31",
            "record": "_struct_ref_seq_dif: ASP vs UniProt P01375 ARG107, details 'conflict'",
            "fab_contacts_on_any_protomer": [
                f"{label(r['target'])} — {label(r['partner'])}" for r in r31
            ],
        },
        "rows": pairs,
    }


def export_figure(result, svg, png):
    matplotlib.rcParams.update(
        {
            "svg.fonttype": "none",
            "font.family": "DejaVu Sans",
            "font.size": 9,
            "svg.hashsalt": "tnf",
        }
    )
    residues = result["buried_surface"]["tnf_residues"]
    colours = {"A": "#2f6db3", "B": "#d17a22", "C": "#7a7a7a"}
    figure, (top, bottom) = plt.subplots(
        2, 1, figsize=(11, 6.4), gridspec_kw={"height_ratios": [3, 2]}
    )
    top.bar(
        range(len(residues)),
        [r["delta_sasa_angstrom2"] for r in residues],
        color=[colours[r["residue"][0]] for r in residues],
    )
    top.set_xticks(
        range(len(residues)),
        [r["residue"].split(":")[1] for r in residues],
        rotation=90,
        fontsize=7,
    )
    top.set_ylabel("ΔSASA per residue (Å²)")
    top.set_title("TNF residues buried by one adalimumab Fab (3WD5, crystal 3-fold trimer)")
    present = sorted({r["residue"][0] for r in residues})
    handles = [
        Patch(
            color=colours[key],
            label="protomer A (deposited)" if key == "A" else f"neighbouring protomer {key}",
        )
        for key in present
    ]
    top.legend(handles=handles, frameon=False)
    regions = result["buried_surface"]["fab_by_region_angstrom2"]
    names = sorted(regions, key=lambda n: (n == "framework", n))
    bottom.barh(names, [regions[n] for n in names], color="#4f8a5b")
    bottom.invert_yaxis()
    bottom.set_xlabel("Fab ΔSASA by region (Å²); Kabat CDRs from sequence rules")
    for axis in (top, bottom):
        axis.spines[["top", "right"]].set_visible(False)
    figure.text(
        0.01,
        0.005,
        "Static geometry of deposited coordinates; not affinity or efficacy.",
        fontsize=7,
        color="#555",
    )
    figure.tight_layout()
    figure.savefig(svg, metadata={"Date": None})
    figure.savefig(png, dpi=160, metadata={"Software": None})
    plt.close(figure)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--project", type=Path, default=PROJECT)
    args = parser.parse_args()
    project = args.project.resolve()
    source = project / "assets/3wd5.pdb"
    reference = project / "assets/1tnf.pdb"
    cell, space_group = cryst1(source)
    if space_group != "I 21 3" or not np.allclose(cell, CELL_3WD5):
        raise ValueError(f"Unexpected 3WD5 cell/space group: {cell} {space_group}")
    model = selected_model(source, ("A", "H", "L"))
    assembly, copies = build_assembly(model)
    result = summarize(model, assembly, copies)
    result = {
        "pdb_id": "3WD5",
        "question": "Which TNF and Fab residues form the complete adalimumab epitope "
        "once the crystallographic TNF trimer is restored?",
        "inputs": {
            "assets/3wd5.pdb": sha256(source),
            "assets/1tnf.pdb": sha256(reference),
            "cell_angstrom_degrees": list(cell),
            "space_group": space_group,
        },
        "method": [
            "Strict heavy-atom selection identical to the existing contact analysis.",
            "Symmetry copies from the twelve I 2_1 3 general positions plus body centring, "
            "lattice shifts −2…+2; the two nearest equidistant copies define the trimer.",
            "Contacts: heavy atoms ≤ 4.5 Å between each TNF protomer and the Fab bound to A.",
            "ΔSASA: Shrake–Rupley, 960 points/atom, probe 1.4 Å, pinned radii; "
            "trimer and Fab separated rigidly without relaxation.",
            "CDRs: Kabat-style spans located by Martin's sequence rules on deposited H/L.",
        ],
        "trimer_validation": trimer_validation(assembly, reference),
        **result,
        "limitations": [
            "3.1 Å X-ray coordinates; side-chain positions and atom-type rules are uncertain.",
            "Interaction labels are distance candidates, not measured hydrogen bonds or energies.",
            "ΔSASA uses rigid partners; it is neither affinity nor a hot-spot energy.",
            "The trimer is crystal-symmetry generated; the deposited assembly record lists only "
            "the identity operator although its oligomeric_details reads 'trimeric'.",
            "No result here measures neutralization, clinical response or TOP2A.",
        ],
        "software": {
            "python": platform.python_version(),
            **{name: version(name) for name in ("numpy", "biopython", "matplotlib")},
        },
        "generated_at_utc": datetime.now(UTC).isoformat(timespec="seconds"),
    }
    out = project / "data/processed/full-epitope.json"
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    export_figure(result, project / "assets/full-epitope.svg", project / "assets/full-epitope.png")
    model_path = project / "assets/3wd5-trimer-3fab.pdb"
    io = PDBIO()
    io.set_structure(assembly)
    io.save(str(model_path))
    remark = (
        "REMARK   1 MODEL GENERATED FROM 3WD5 (CC0) BY I 21 3 CRYSTAL 3-FOLD; NOT A DEPOSITION\n"
        "REMARK   1 TNF A,B,C; FAB HEAVY H,I,J; FAB LIGHT L,M,N; SEE full-epitope.json\n"
    )
    model_path.write_text(remark + model_path.read_text())
    print(
        json.dumps(
            {
                k: result[k]
                for k in ("trimer_validation", "per_protomer", "neighbour_fraction_of_contacts")
            },
            indent=1,
        )
    )
    print(json.dumps(result["buried_surface"]["fab_by_region_angstrom2"]))
    print(
        json.dumps(
            {k: v for k, v in result["buried_surface"].items() if "total" in k or "mean" in k}
        )
    )


if __name__ == "__main__":
    main()
