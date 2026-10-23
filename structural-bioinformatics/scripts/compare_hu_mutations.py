"""Compare Hu 2013 Table 3 alanine mutants with this project's buried-surface values.

Run from repository root; no network is needed:
uv run --project structural-bioinformatics python \
    structural-bioinformatics/scripts/compare_hu_mutations.py

Inputs are data/metadata/hu-2013-mutations.json (the authors' measurements, transcribed) and
data/processed/full-epitope.json (this project's executed geometry). The output is descriptive:
a fold change in the authors' KD beside our buried surface for the same residue. Buried surface
is not an energy, so this comparison cannot establish why a substitution changes affinity.

TNF is a homotrimer, so one substitution changes every protomer. Each residue is therefore
matched to the protomer copy that contacts the Fab in the reconstructed trimer; a residue whose
deposited-protomer copy makes no contact is marked as reached only through the neighbour.
"""

import argparse
import json
from pathlib import Path

import numpy as np

PROJECT = Path(__file__).resolve().parents[1]
# Buried surface is not an energy; a substitution is only called "large" using the authors' own
# grouping in the paper, never using our geometry.
LARGE_FOLD_CHANGE = 100.0


def spearman(x, y):
    """Rank correlation, computed as Pearson on average ranks; no SciPy dependency."""

    def ranks(values):
        order = np.argsort(values, kind="stable")
        result = np.empty(len(values), dtype=float)
        result[order] = np.arange(len(values), dtype=float)
        # average the ranks of ties so repeated values do not bias the correlation
        for value in np.unique(values):
            mask = values == value
            result[mask] = result[mask].mean()
        return result

    a, b = ranks(np.asarray(x, dtype=float)), ranks(np.asarray(y, dtype=float))
    return float(np.corrcoef(a, b)[0, 1])


def compare(project):
    record = json.loads((project / "data/metadata/hu-2013-mutations.json").read_text())
    epitope = json.loads((project / "data/processed/full-epitope.json").read_text())
    surface = {
        entry["residue"]: entry["delta_sasa_angstrom2"]
        for entry in epitope["buried_surface"]["tnf_residues"]
    }
    contacts = {}
    for row in epitope["rows"]:
        target = row["target"]
        key = f"{target['chain']}:{target['name']}{target['number']}{target['insertion']}".strip()
        contacts[key] = contacts.get(key, 0) + row["atom_pair_count"]

    rows = record["table_3"]["rows"]
    wild_type = next(row for row in rows if row["residue"] is None)
    results = []
    for row in rows:
        if row["residue"] is None:
            continue
        copies = {chain: surface.get(f"{chain}:{row['residue']}", 0.0) for chain in ("A", "B", "C")}
        chain = max(copies, key=lambda key: copies[key])
        key = f"{chain}:{row['residue']}"
        results.append(
            {
                "mutant": row["label"],
                "residue": row["residue"],
                "contacting_chain": chain if copies[chain] > 0 else None,
                "reached_through_neighbour": chain == "C" and copies[chain] > 0,
                "our_delta_sasa_angstrom2": round(copies[chain], 1),
                "our_heavy_atom_contacts": contacts.get(key, 0),
                "authors_kd_molar": row["KD"],
                "authors_kd_fold_change_vs_wild_type": round(row["KD"] / wild_type["KD"], 1),
            }
        )

    large = [r for r in results if r["authors_kd_fold_change_vs_wild_type"] >= LARGE_FOLD_CHANGE]
    small = [r for r in results if r["authors_kd_fold_change_vs_wild_type"] < LARGE_FOLD_CHANGE]
    buried = epitope["buried_surface"]
    authors_area = record["authors_reported_interface"][
        "adalimumab_fab_total_buried_surface_angstrom2"
    ]
    return {
        "question": "Do the residues whose substitution weakened adalimumab binding in Hu 2013 "
        "also bury the most surface in our reconstructed trimer interface?",
        "inputs": {
            "authors_measurements": "data/metadata/hu-2013-mutations.json",
            "our_geometry": "data/processed/full-epitope.json",
        },
        "comparison": results,
        "summary": {
            "mutants_compared": len(results),
            "mutants_reached_only_through_the_neighbouring_protomer": sum(
                1 for r in results if r["reached_through_neighbour"]
            ),
            "mutants_with_no_contact_in_our_map": sum(
                1 for r in results if r["contacting_chain"] is None
            ),
            "spearman_delta_sasa_vs_log_fold_change": round(
                spearman(
                    [r["our_delta_sasa_angstrom2"] for r in results],
                    [np.log10(r["authors_kd_molar"] / wild_type["KD"]) for r in results],
                ),
                2,
            ),
            "median_delta_sasa_fold_change_at_or_above_100": float(
                np.median([r["our_delta_sasa_angstrom2"] for r in large])
            ),
            "median_delta_sasa_fold_change_below_100": float(
                np.median([r["our_delta_sasa_angstrom2"] for r in small])
            ),
            "largest_buried_residue_tested": max(
                results, key=lambda r: r["our_delta_sasa_angstrom2"]
            )["mutant"],
        },
        "buried_surface_cross_check": {
            "authors_reported_total_angstrom2": authors_area,
            "our_reconstructed_trimer_total_angstrom2": buried[
                "full_epitope_total_delta_sasa_angstrom2"
            ],
            "our_deposited_view_total_angstrom2": buried[
                "single_protomer_total_delta_sasa_angstrom2"
            ],
            "reconstructed_fraction_of_authors_value": round(
                buried["full_epitope_total_delta_sasa_angstrom2"] / authors_area, 3
            ),
            "deposited_view_fraction_of_authors_value": round(
                buried["single_protomer_total_delta_sasa_angstrom2"] / authors_area, 3
            ),
            "note": "The project total sums the losses on both partners. The original "
            "paper calls its value total buried surface but its exact convention "
            "requires verification. The authors did not "
            "publish their probe radius or sphere-point count, so exact agreement is not "
            "expected; this is a contextual numerical comparison, not independent "
            "validation. With our fixed selection the deposited view does not "
            "reach the reported number and the reconstructed trimer is numerically "
            "closer; this does not establish uniqueness of the reconstruction or "
            "equivalence of area conventions.",
        },
        "cdr_usage_check": {
            "authors_claim": record["authors_reported_interface"]["cdr_claim_quote"],
            "our_delta_sasa_by_region_angstrom2": buried["fab_by_region_angstrom2"],
            "our_contacts_by_region": epitope["fab_contacts_by_region"],
            "disagreement": "By both measures the largest light-chain contribution in our map is "
            "CDR-L1, not CDR-L2, while CDR-H2 is the largest overall and agrees with the "
            "authors. The authors did not state which CDR definition they used; ours is Kabat, "
            "so the light-chain label may differ by definition rather than by geometry.",
        },
        "limitations": [
            "The fold changes are the authors' SPR measurements on soluble protein; they are not "
            "our results and are not reproduced here.",
            "Buried surface is geometry. It is not a binding energy, so no substitution effect is "
            "predicted or explained by it.",
            "A substitution can change folding, local charge or dynamics; a residue that buries "
            "little surface may still matter, and the reverse.",
            "Only 14 of the interface residues were mutated by the authors, and alanine is one "
            "substitution out of many.",
            "The comparison matches KD and buried surface by residue (paired at the "
            "residue level), is descriptive, and reports no hypothesis test. Residues "
            "are selected interface positions, not independent patient replicates.",
        ],
        "generator": "scripts/compare_hu_mutations.py",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--project", type=Path, default=PROJECT)
    project = parser.parse_args().project.resolve()
    result = compare(project)
    out = project / "data/processed/hu-mutation-comparison.json"
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    for row in result["comparison"]:
        print(
            f"{row['mutant']:<14} dSASA {row['our_delta_sasa_angstrom2']:>6} A2  "
            f"contacts {row['our_heavy_atom_contacts']:>3}  "
            f"fold {row['authors_kd_fold_change_vs_wild_type']:>7}"
        )
    print(json.dumps(result["summary"], indent=2))
    print(json.dumps(result["buried_surface_cross_check"], indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
