"""Reproduce schematic course figures from the offline teaching calculations.

All coordinates and series below are synthetic, not measured protein dynamics.
English axis labels keep exported SVG text portable; Persian captions are in lessons.
"""

import math
import runpy
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT / "assets/course/figures"
LAB = runpy.run_path(str(PROJECT / "assets/course/learning_lab.py"))
BLUE, ORANGE, GRAY = "#245dc4", "#a74418", "#566579"
plt.rcParams.update(
    {
        "font.size": 11,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "svg.hashsalt": "course",
    }
)


def save(fig, name):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUTPUT / f"{name}.svg", metadata={"Date": None}, bbox_inches="tight")
    plt.close(fig)


def translation():
    points = [(0, 0), (1, 2), (3, 1), (4, 3)]
    fig, axes = plt.subplots(1, 2, figsize=(10, 3.7), layout="constrained")
    for ax in axes:
        ax.plot(*zip(*points, strict=True), "o-", color=BLUE, label="Reference")
        ax.set(xlabel="x (angstrom)", ylabel="y (angstrom)", ylim=(-1, 4))
        ax.set_aspect("equal")
    axes[0].plot([x + 10 for x, _ in points], [y for _, y in points], "s--", color=ORANGE)
    axes[0].set(title="Translation only: raw RMSD = 10 angstrom", xlim=(-1, 15))
    axes[1].plot(*zip(*points, strict=True), "s--", color=ORANGE, fillstyle="none", markersize=12)
    axes[1].set(title="Reverse the known shift: RMSD = 0", xlim=(-1, 5))
    save(fig, "translation")


def populations():
    deltas = [i / 20 for i in range(-80, 81)]
    fig, ax = plt.subplots(figsize=(7.7, 3.8), layout="constrained")
    ax.plot(deltas, [1 / (1 + math.exp(d)) for d in deltas], color=BLUE)
    probability = LAB["energy"]()["p_b"]
    ax.plot([2], [probability], "o", color=ORANGE)
    ax.annotate(
        f"B: {probability:.1%} at +2",
        (2, probability),
        xytext=(0.1, 0.45),
        arrowprops={"arrowstyle": "->", "color": ORANGE},
    )
    ax.axvline(0, color=GRAY, ls=":", lw=1)
    ax.set(
        xlabel="(G_B - G_A) / kBT",
        ylabel="Equilibrium probability of B",
        title="Illustrative two-state model",
        ylim=(0, 1),
    )
    save(fig, "populations")


def minimization():
    fig, axes = plt.subplots(1, 2, figsize=(9, 3.8), layout="constrained")
    x = [i / 25 for i in range(-110, 111)]
    descent = LAB["energy"]()["gradient_descent_x"]
    axes[0].plot(x, [v * v for v in x], color=GRAY)
    axes[0].plot(descent, [v * v for v in descent], "o--", color=BLUE)
    axes[0].set(xlabel="x", ylabel="U = x squared", title="Step size 0.25: x halves each step")
    for step, color in [(0.25, BLUE), (1.0, ORANGE), (1.1, GRAY)]:
        values = [4 * (1 - 2 * step) ** i for i in range(7)]
        axes[1].plot(range(7), values, "o-", label=f"step size {step}", color=color)
    axes[1].set(xlabel="Optimization step (not time)", ylabel="x", title="Choice of step size")
    axes[1].legend(fontsize=9)
    save(fig, "minimization")


def sampling():
    fig, axes = plt.subplots(1, 2, figsize=(9, 3.6), layout="constrained")
    result = LAB["sampling"]()
    axes[0].step(range(1, 101), [1] * 50 + [3] * 50, where="mid", color=BLUE)
    axes[0].axhline(result["mean"], color=ORANGE, ls="--", label="Whole-series mean = 2")
    axes[0].set(
        xlabel="Frame index", ylabel="Synthetic observable", title="One mean hides a change"
    )
    axes[0].legend(fontsize=9)
    axes[1].bar(range(1, 5), result["block_means"], color=BLUE)
    axes[1].set(
        xlabel="Consecutive block (25 frames each)", ylabel="Block mean", xticks=range(1, 5)
    )
    for ax in axes:
        ax.set_ylim(0, 3.8)
    save(fig, "sampling")


def networks():
    fig, axes = plt.subplots(1, 2, figsize=(9, 3.8), layout="constrained")
    for ax, cutoff in zip(axes, (4.1, 5.0), strict=True):
        result = LAB["graph"](cutoff)
        points = result["coordinates_angstrom"]
        for a, b in result["edges"]:
            ax.plot([points[a][0], points[b][0]], [points[a][1], points[b][1]], color=GRAY)
        for name, (x, y, _) in points.items():
            ax.scatter([x], [y], s=160, color=BLUE, zorder=3)
            ax.text(
                x, y + 0.45, f"{name} (degree {result['degrees'][name]})", ha="center", fontsize=9
            )
        ax.set(
            title=f"Cutoff {cutoff:g} angstrom: {len(result['edges'])} edges",
            xlim=(-1.5, 9.5),
            ylim=(-1, 4.6),
            xlabel="x (angstrom)",
            ylabel="y (angstrom)",
        )
        ax.set_aspect("equal")
    save(fig, "contact-network")


if __name__ == "__main__":
    for build in (translation, populations, minimization, sampling, networks):
        build()
