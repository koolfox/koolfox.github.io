"""Publication-exportable geometric contact maps, not inferred binding energies."""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

from .structure import heavy_atoms  # noqa: E402


def plot_contacts(report: dict, output: Path):
    """Plot residue contacts, preserving author residue numbering and chain identity."""
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.6), sharey=True, layout="constrained")
    for axis, chain, color in zip(axes, ["H", "L"], ["#a95015", "#245cb7"], strict=True):
        selected = [p for p in report["residue_pairs"] if p["partner"]["chain"] == chain]
        if selected:
            plot = axis.scatter(
                [p["partner"]["number"] for p in selected],
                [p["target"]["number"] for p in selected],
                c=[p["minimum_distance_angstrom"] for p in selected],
                cmap="viridis_r",
                vmin=2.5,
                vmax=report["cutoff_angstrom"],
                s=45,
                edgecolors="white",
                linewidths=0.3,
            )
            fig.colorbar(plot, ax=axis, label="Minimum heavy-atom distance (Å)", shrink=0.8)
        axis.set_title(f"TNF A × Fab {'heavy' if chain == 'H' else 'light'} {chain}", color=color)
        axis.set_xlabel(f"Fab {chain} author residue number")
        axis.spines[["top", "right"]].set_visible(False)
        axis.grid(alpha=0.15)
    axes[0].set_ylabel("TNF A author residue number")
    fig.suptitle(f"3WD5 asymmetric unit | contacts ≤ {report['cutoff_angstrom']:g} Å", fontsize=14)
    output.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output, dpi=180)
    fig.savefig(output.with_suffix(".svg"))
    plt.close(fig)


def plot_coordinates(model, output: Path, interface: list):
    """A Cα trace from experimental coordinates; each gap stays disconnected."""
    fig = plt.figure(figsize=(9, 6), layout="constrained", facecolor="#f5f5f7")
    axis = fig.add_subplot(111, projection="3d", facecolor="#f5f5f7")
    colors = {"A": "#087b73", "H": "#a95015", "L": "#245cb7"}
    all_points = []
    for chain, label in [("A", "TNF-α A"), ("H", "Fab heavy H"), ("L", "Fab light L")]:
        atoms = [atom for atom in heavy_atoms(model[chain]) if atom.name == "CA"]
        if not atoms:
            raise ValueError(f"No occupied Cα coordinates in chain {chain}")
        points = np.asarray([a.coord for a in atoms])
        all_points.extend(points)
        separated = [points[0]]
        for left, right in zip(points[:-1], points[1:], strict=True):
            if np.linalg.norm(right - left) > 4.5:
                separated.append(np.full(3, np.nan))
            separated.append(right)
        trace = np.asarray(separated)
        axis.plot(*trace.T, color=colors[chain], lw=2, label=label)
    for residue in interface:
        key = (" ", residue["number"], residue["insertion"] or " ")
        if key in model["A"] and "CA" in model["A"][key]:
            ca = [a for a in heavy_atoms(model["A"]) if a.name == "CA" and a.parent.id == key]
            if ca:
                axis.scatter(*ca[0].coord, color="#d63862", s=18)
    xyz = np.asarray(all_points)
    center = (xyz.min(axis=0) + xyz.max(axis=0)) / 2
    radius = float(np.ptp(xyz, axis=0).max() / 2 + 4)
    axis.set_xlim(center[0] - radius, center[0] + radius)
    axis.set_ylim(center[1] - radius, center[1] + radius)
    axis.set_zlim(center[2] - radius, center[2] + radius)
    axis.set_box_aspect((1, 1, 1))
    axis.view_init(elev=22, azim=50)
    axis.set_axis_off()
    axis.legend(loc="upper left", frameon=False)
    axis.set_title("TNF–adalimumab Fab | 3WD5, 3.10 Å\nOne TNF protomer, experimental Cα trace")
    fig.savefig(output, dpi=180)
    plt.close(fig)
