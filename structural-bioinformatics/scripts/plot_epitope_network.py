"""Draw the adalimumab epitope as an amino-acid interaction network.

Reads the executed contact analysis in data/processed/full-epitope.json and
writes assets/epitope-network.svg and .png. One node per TNF residue, one node
per Fab region, one edge per residue pair; the edge width is the number of
heavy-atom pairs that carry the contact. Nothing here is a prediction: the
graph is the same contact table the analysis produced.
"""

import json
from datetime import UTC, datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.lines import Line2D  # noqa: E402

PROJECT = Path(__file__).resolve().parents[1]
RECORD = PROJECT / "data" / "processed" / "full-epitope.json"
ASSETS = PROJECT / "assets"
CHAIN_COLOR = {"A": "#087b73", "B": "#245cb7", "C": "#a95015"}
REGION_COLOR = "#152e52"
EDGE_COLOR = "#9aa9be"
REGION_ORDER = ["CDR-H1", "CDR-H2", "CDR-H3", "CDR-L1", "CDR-L2", "CDR-L3", "framework"]


def load():
    record = json.loads(RECORD.read_text())
    rows = record["rows"]
    pairs = {}
    for row in rows:
        target = row["target"]
        region = row["partner"].get("region", "framework")
        key = (target["chain"], target["number"], target["name"], region)
        entry = pairs.setdefault(key, {"atom_pairs": 0, "contacts": 0})
        entry["atom_pairs"] += row["atom_pair_count"]
        entry["contacts"] += 1
    return record, pairs


def layout(pairs):
    residues = {}
    for chain, number, name, _ in pairs:
        residues.setdefault(chain, set()).add((number, name))
    residues = {chain: sorted(items) for chain, items in residues.items()}
    order = [chain for chain in ("A", "B", "C") if chain in residues]
    return residues, order


def plot(record, pairs):
    residues, chains = layout(pairs)
    active = [chain for chain in chains if any(key[0] == chain for key in pairs)]
    regions = [region for region in REGION_ORDER if any(key[3] == region for key in pairs)]
    left = {}
    y = 0.0
    spacing = 0.42
    for chain in active:
        for number, _name in residues[chain]:
            left[(chain, number)] = y
            y += spacing
        y += spacing
    right = {region: index * spacing for index, region in enumerate(regions)}
    height = max(y, len(regions) * spacing)

    fig, axis = plt.subplots(figsize=(13, 9.2), layout="constrained", facecolor="white")
    axis.set_facecolor("white")
    for (chain, number, _name, region), entry in pairs.items():
        if (chain, number) not in left:
            continue
        width = 0.4 + 2.2 * (entry["atom_pairs"] / 40.0) ** 0.6
        axis.plot(
            [0.0, 1.0],
            [left[(chain, number)], right[region]],
            color=EDGE_COLOR,
            lw=width,
            alpha=0.75,
            solid_capstyle="round",
            zorder=1,
        )
    for (chain, number), y_value in left.items():
        axis.scatter(
            [0.0],
            [y_value],
            s=150,
            color=CHAIN_COLOR[chain],
            edgecolor="white",
            linewidth=1.2,
            zorder=3,
        )
        name = next(item[1] for item in residues[chain] if item[0] == number)
        axis.text(
            -0.02,
            y_value,
            f"{name}{number}",
            ha="right",
            va="center",
            fontsize=9,
            color="#25344c",
        )
    for region, y_value in right.items():
        axis.scatter([1.0], [y_value], s=210, color=REGION_COLOR, edgecolor="white", zorder=3)
        axis.text(
            1.02,
            y_value,
            region,
            ha="left",
            va="center",
            fontsize=10,
            color=REGION_COLOR,
        )
    axis.text(
        0.0,
        height + 0.6,
        "TNF residues (reconstructed trimer)",
        ha="center",
        fontsize=12,
        color="#152e52",
    )
    axis.text(1.0, height + 0.6, "Fab regions", ha="center", fontsize=12, color="#152e52")
    total = record["neighbour_fraction_of_contacts"]
    axis.set_title(
        "Adalimumab epitope as an amino-acid interaction network\n"
        "365 heavy-atom contacts at 4.5 Å | "
        f"{total * 100:.0f}% of contacts on the neighbour protomer",
        fontsize=13,
        color="#152e52",
        pad=18,
    )
    handles = [
        Line2D(
            [0],
            [0],
            marker="o",
            color="none",
            markerfacecolor=CHAIN_COLOR[chain],
            markeredgecolor="white",
            markersize=11,
            label=f"TNF protomer {chain}",
        )
        for chain in active
    ]
    handles.append(
        Line2D(
            [0],
            [0],
            marker="o",
            color="none",
            markerfacecolor=REGION_COLOR,
            markeredgecolor="white",
            markersize=11,
            label="Fab region",
        )
    )
    axis.legend(
        handles=handles,
        loc="upper center",
        bbox_to_anchor=(0.5, 1.03),
        ncol=3,
        frameon=False,
        fontsize=10,
    )
    axis.set_xlim(-0.22, 1.28)
    axis.set_ylim(-0.8, height + 2.2)
    axis.axis("off")
    return fig, len(active), sum(len(items) for items in residues.values())


def main():
    record, pairs = load()
    fig, chains, residues = plot(record, pairs)
    ASSETS.mkdir(parents=True, exist_ok=True)
    fig.savefig(ASSETS / "epitope-network.svg", format="svg")
    fig.savefig(ASSETS / "epitope-network.png", dpi=170)
    print(
        json.dumps(
            {
                "contacts": sum(entry["atom_pairs"] for entry in pairs.values()),
                "residue_pairs": len(pairs),
                "tnf_residues": residues,
                "protomers_with_contacts": chains,
                "generated_at_utc": datetime.now(UTC).isoformat(timespec="seconds"),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
