"""Run and export a small reproducible static 3WD5 surface/control experiment.

Run from repository root with the locked project environment. No network needed:
uv run --project structural-bioinformatics python \
    structural-bioinformatics/scripts/analyze_structural_feasibility.py
"""

import argparse
import hashlib
import inspect
import json
import platform
import sys
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from time import perf_counter

import Bio
import matplotlib
import numpy as np
from Bio.PDB.SASA import ShrakeRupley

from tnf_atlas.feasibility import (
    VDW_RADII_ANGSTROM,
    atom_coordinates,
    buried_surface,
    contact_summary,
    minimum_distance,
    pair_distance_change,
    rigid_translate,
    selected_model,
)

matplotlib.use("Agg")
from matplotlib import pyplot as plt  # noqa: E402

PROJECT = Path(__file__).resolve().parents[1]
TRANSLATION_ANGSTROM = (150.0, 0.0, 0.0)
DEPOSITED_PDB_SHA256 = "fae6eee1b06b8cba0a466280dbc32563efaa54ec639afd921cb610d17debd216"


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def display_path(path):
    """Avoid machine-specific absolute paths in a public research report."""
    try:
        return path.resolve().relative_to(PROJECT).as_posix()
    except ValueError:
        return path.name


def export_figure(result, path):
    """Plot measured numerical sensitivity and the explicitly labeled rigid control."""
    matplotlib.rcParams.update(
        {"svg.fonttype": "none", "font.family": "DejaVu Sans", "font.size": 10}
    )
    figure, axes = plt.subplots(1, 2, figsize=(10.6, 4.2))
    figure.set_facecolor("#fafbf9")
    for axis in axes:
        axis.set_facecolor("#fafbf9")
        axis.spines[["top", "right"]].set_visible(False)
        axis.grid(axis="y", alpha=0.2)
    points = [r["n_points_per_atom"] for r in result["surface_sampling"]]
    area = [r["mean_side_interface_area_angstrom2"] for r in result["surface_sampling"]]
    control_area = [
        r["mean_side_interface_area_angstrom2"]
        for r in result["rigid_separation_control"]["surface_sampling"]
    ]
    axes[0].plot(points, area, "o-", color="#087b73", label="Deposited A–Fab pose")
    axes[0].plot(points, control_area, "s--", color="#a95015", label="Rigid Fab +150 Å")
    axes[0].set(
        title="Partial-interface area convention: ΔSASA / 2",
        xlabel="Sphere points per selected atom",
        ylabel="Area (Å²)",
        xticks=points,
        ylim=(-35, max(area) * 1.18),
    )
    for count, measured in zip(points, area, strict=True):
        axes[0].annotate(
            f"{measured:.1f}",
            (count, measured),
            xytext=(0, 8),
            textcoords="offset points",
            ha="center",
            fontsize=9,
        )
    axes[0].legend(frameon=False, loc="center right")
    contacts = result["contact_cutoff_sensitivity"]
    axes[1].plot(
        [r["cutoff_angstrom"] for r in contacts],
        [r["heavy_atom_contact_count"] for r in contacts],
        "o-",
        color="#087b73",
        label="Deposited A–Fab pose",
    )
    axes[1].plot([4, 4.5, 5], [0, 0, 0], "s--", color="#a95015", label="Rigid Fab +150 Å")
    for row in contacts:
        axes[1].annotate(
            str(row["heavy_atom_contact_count"]),
            (row["cutoff_angstrom"], row["heavy_atom_contact_count"]),
            xytext=(0, 8),
            textcoords="offset points",
            ha="center",
            fontsize=9,
        )
    axes[1].set(
        title="Heavy-atom cutoff sensitivity",
        xlabel="Inclusive distance cutoff (Å)",
        ylabel="Cross-component atom pairs",
        xticks=[4, 4.5, 5],
        ylim=(-20, 525),
    )
    figure.suptitle("3WD5 asymmetric unit: one TNF protomer A + associated Fab H/L", fontsize=12)
    figure.text(
        0.5,
        0.018,
        "Static geometry and numerical control; no dynamics, affinity or efficacy inferred.",
        ha="center",
        fontsize=9,
        color="#536179",
    )
    figure.tight_layout(rect=(0, 0.06, 1, 0.92))
    path.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(
        path,
        metadata={
            "Title": "3WD5 partial interface: measured SASA and contact sensitivity",
            "Description": (
                "Original scientific plot of structural-feasibility.json. Rigid separation is a "
                "numerical control, not MD or a biological negative control."
            ),
        },
    )
    plt.close(figure)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=PROJECT / "assets/3wd5.pdb")
    parser.add_argument(
        "--output", type=Path, default=PROJECT / "data/processed/structural-feasibility.json"
    )
    parser.add_argument(
        "--figure", type=Path, default=PROJECT / "assets/structural-feasibility.svg"
    )
    parser.add_argument("--points", type=int, nargs="+", default=[100, 480, 960])
    args = parser.parse_args()
    if len(args.points) < 3 or len(set(args.points)) != len(args.points) or min(args.points) <= 0:
        parser.error("Use at least three distinct positive point counts")
    if sha256(args.input) != DEPOSITED_PDB_SHA256:
        parser.error("Input must be the pinned deposited 3WD5 PDB, not an edited/new structure")
    started = datetime.now(UTC).isoformat()
    timer = perf_counter()
    model = selected_model(args.input)
    moved = rigid_translate(model, translation=TRANSLATION_ANGSTROM)
    baseline_coords = atom_coordinates(model, ("A",))
    fab_coords = atom_coordinates(model, ("H", "L"))
    moved_fab_coords = atom_coordinates(moved, ("H", "L"))
    chain_counts = {
        cid: {
            "selected_heavy_atoms": len(list(model[cid].get_atoms())),
            "selected_residues": len(list(model[cid].get_residues())),
            "elements": dict(sorted(Counter(a.element for a in model[cid].get_atoms()).items())),
        }
        for cid in ("A", "H", "L")
    }
    surface_rows, control_rows = [], []
    for points in sorted(args.points):
        sample_started = perf_counter()
        row = buried_surface(model, n_points=points)
        row["calculation_elapsed_seconds"] = perf_counter() - sample_started
        surface_rows.append(row)
        sample_started = perf_counter()
        row = buried_surface(moved, n_points=points)
        row["calculation_elapsed_seconds"] = perf_counter() - sample_started
        control_rows.append(row)
    high_resolution = surface_rows[-1]["mean_side_interface_area_angstrom2"]
    areas = [row["mean_side_interface_area_angstrom2"] for row in surface_rows]
    manifest_path = PROJECT / "data/metadata/structure-downloads.json"
    previous_download = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    source_module = Path(inspect.getfile(ShrakeRupley))
    files = [
        PROJECT / "src/tnf_atlas/feasibility.py",
        PROJECT / "src/tnf_atlas/structure.py",
        Path(__file__).resolve(),
    ]
    result = {
        "schema_version": "1.0",
        "experiment": "static_partial_tnf_fab_surface_and_rigid_separation_control",
        "pdb_id": "3WD5",
        "input": {
            "path": display_path(args.input),
            "sha256": sha256(args.input),
            "bytes": args.input.stat().st_size,
            "source_url": "https://files.rcsb.org/download/3WD5.pdb",
            "source_page": "https://www.rcsb.org/structure/3WD5",
            "archive_retrieved_at_utc": previous_download.get("retrieved_at_utc"),
            "crystallographic_resolution_angstrom_rounded": 3.10,
        },
        "execution": {
            "started_at_utc": started,
            "completed_at_utc": datetime.now(UTC).isoformat(),
            "analysis_elapsed_seconds": perf_counter() - timer,
            "python": sys.version.split()[0],
            "system": platform.system(),
            "architecture": platform.machine(),
            "biopython": Bio.__version__,
            "numpy": np.__version__,
            "matplotlib": matplotlib.__version__,
            "code_sha256": {display_path(path): sha256(path) for path in files},
            "biopython_sasa_implementation_sha256": sha256(source_module),
            "random_seed": None,
            "stochastic_sampling": False,
            "reproduction_command": (
                "uv run --project structural-bioinformatics python "
                "structural-bioinformatics/scripts/analyze_structural_feasibility.py"
            ),
        },
        "selection": {
            "model_id": model.id,
            "chain_namespace": "author",
            "target": ["A"],
            "associated_fab": ["H", "L"],
            "policy": (
                "protein ATOM, model 1, highest finite positive occupancy alternate; "
                "ties blank then A then alphabetical; exclude H/D, waters and heterogens"
            ),
            "chain_counts": chain_counts,
            "representation": (
                "deposited asymmetric unit: one TNF protomer and one Fab; "
                "no crystal symmetry mates or full IgG"
            ),
        },
        "surface_method": {
            "algorithm": "Biopython ShrakeRupley, deterministic golden-spiral sphere points",
            "probe_radius_angstrom": 1.4,
            "atomic_vdw_radii_angstrom": VDW_RADII_ANGSTROM,
            "relaxation_of_isolated_components": False,
            "total_loss_definition": (
                "SASA(A isolated) + SASA(H/L associated isolated) - SASA(A+H+L)"
            ),
            "mean_side_area_definition": (
                "total lost SASA / 2; explicitly chosen interface-area convention"
            ),
            "documentation_url": "https://biopython.org/docs/latest/api/Bio.PDB.SASA.html",
            "implementation_url": "https://github.com/biopython/biopython/blob/biopython-188/Bio/PDB/SASA.py",
            "method_reference_doi": "10.1016/0022-2836(73)90011-9",
        },
        "contact_cutoff_sensitivity": [
            contact_summary(model, cutoff) for cutoff in (4.0, 4.5, 5.0)
        ],
        "surface_sampling": surface_rows,
        "numerical_sensitivity": {
            "mean_side_area_range_angstrom2": [min(areas), max(areas)],
            "mean_side_range_relative_to_highest_points_percent": 100
            * (max(areas) - min(areas))
            / high_resolution,
            "two_highest_point_resolutions_absolute_difference_angstrom2": abs(
                surface_rows[-2]["mean_side_interface_area_angstrom2"] - high_resolution
            ),
            "interpretation": (
                "Discretization sensitivity at a fixed pose, not biological uncertainty, "
                "independent replicates or a confidence interval"
            ),
        },
        "rigid_separation_control": {
            "translated_author_chains": ["H", "L"],
            "translation_angstrom": list(TRANSLATION_ANGSTROM),
            "time_or_force_model": None,
            "minimum_cross_distance_before_angstrom": minimum_distance(baseline_coords, fab_coords),
            "minimum_cross_distance_after_angstrom": minimum_distance(
                baseline_coords, moved_fab_coords
            ),
            "maximum_probe_inflated_atom_diameter_angstrom": 2
            * (max(VDW_RADII_ANGSTROM.values()) + 1.4),
            "max_all_fab_atom_pair_distance_change_angstrom": pair_distance_change(
                fab_coords, moved_fab_coords
            ),
            "max_all_target_atom_pair_distance_change_angstrom": pair_distance_change(
                baseline_coords, atom_coordinates(moved, ("A",))
            ),
            "contact_cutoff_sensitivity": [
                contact_summary(moved, cutoff) for cutoff in (4.0, 4.5, 5.0)
            ],
            "surface_sampling": control_rows,
            "interpretation": (
                "A geometry/software control; does not test sequence specificity, "
                "equilibrium dissociation or drug action"
            ),
        },
        "limitations": [
            "Partial deposited interface excludes crystal-symmetry epitope contacts, "
            "physiological TNF trimer and full antibody Fc.",
            "Missing and zero-occupancy atoms remain absent; no added hydrogens, solvent, "
            "repair or force-field preparation.",
            "SASA loss and distance contacts are geometric descriptors; no binding affinity, "
            "hydrogen-bond assignment, free energy or efficacy inferred.",
            "Rigid translation is a synthetic static control, not molecular dynamics "
            "or a measured dissociation trajectory.",
            "Crystallographic resolution 3.10 Å is not the standard deviation "
            "of independent atomic-position noise.",
            "Sphere-point sensitivity does not measure experimental uncertainty "
            "or generate independent biological observations.",
            "No TOP2A, gene expression, CRP, RNA folding, clinical outcome or "
            "cancer response was simulated or measured.",
        ],
    }
    export_figure(result, args.figure)
    result["original_figure"] = {
        "path": display_path(args.figure),
        "sha256": sha256(args.figure),
        "interpretation": "Original plot of executed static measurements and numerical control",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "output": display_path(args.output),
                "figure": display_path(args.figure),
                "baseline_4_5_angstrom": result["contact_cutoff_sensitivity"][1],
                "mean_side_areas_angstrom2": dict(zip(sorted(args.points), areas, strict=True)),
                "control_total_sasa_loss_angstrom2": [
                    r["total_lost_sasa_angstrom2"] for r in control_rows
                ],
                "control_minimum_distance_angstrom": result["rigid_separation_control"][
                    "minimum_cross_distance_after_angstrom"
                ],
                "analysis_elapsed_seconds": result["execution"]["analysis_elapsed_seconds"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
