"""Export teaching figures from curated experimental coordinates and labeled schematics."""

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

PROJECT = Path(__file__).resolve().parents[1]
ASSETS = PROJECT / "assets"
COORDINATES = PROJECT / "data" / "processed" / "structures-view.json"
COLOR = {"A": "#087b73", "H": "#a95015", "L": "#245cb7"}


def trace_with_gaps(points, maximum_step):
    """Keep missing coordinates disconnected, using the viewer's trace convention."""
    trace = [points[0]]
    for left, right in zip(points[:-1], points[1:], strict=True):
        if np.linalg.norm(right - left) > maximum_step:
            trace.append(np.full(3, np.nan))
        trace.append(right)
    return np.asarray(trace)


def plot_comparison():
    """Show three distinct coordinate examples; never dock or align unrelated proteins."""
    data = json.loads(COORDINATES.read_text())
    structures = {item["id"]: item for item in data["structures"]}
    panels = [
        ("1TNF", "Soluble TNF trimer", "Three TNF chains | 2.60 Å"),
        ("3WD5", "TNF + adalimumab Fab", "One protomer + one Fab | 3.10 Å"),
        ("4FM9", "TOP2A cleavage core + DNA", "One asymmetric unit | 2.90 Å"),
    ]
    fig = plt.figure(figsize=(14, 5.2), layout="constrained", facecolor="white")
    point_counts = {}
    for index, (accession, title, subtitle) in enumerate(panels, start=1):
        axis = fig.add_subplot(1, 3, index, projection="3d")
        all_points = []
        for chain in structures[accession]["chains"]:
            points = np.asarray([residue["xyz"] for residue in chain["residues"]])
            if not len(points):
                continue
            if points.ndim != 2 or points.shape[1] != 3 or not np.isfinite(points).all():
                raise ValueError(f"Invalid coordinates in {accession}/{chain['id']}")
            all_points.extend(points)
            is_dna = chain["kind"] != "protein_ca"
            if accession == "1TNF":
                color = {"A": "#087b73", "B": "#245cb7", "C": "#a95015"}[chain["id"]]
            elif accession == "4FM9":
                color = {"A": "#7555a1", "C": "#aa6408", "D": "#245cb7"}[chain["id"]]
            else:
                color = COLOR[chain["id"]]
            trace = trace_with_gaps(points, 8.0 if is_dna else 4.5)
            name = f"DNA {chain['id']} (P)" if is_dna else f"Protein {chain['id']} (Cα)"
            axis.plot(*trace.T, color=color, lw=2.5 if is_dna else 1.4, label=name)
            if is_dna:
                axis.scatter(*points.T, color=color, s=12, depthshade=False)
        xyz = np.asarray(all_points)
        point_counts[accession] = len(xyz)
        center = (xyz.max(axis=0) + xyz.min(axis=0)) / 2
        radius = float(np.ptp(xyz, axis=0).max() / 2 + 3)
        axis.set_xlim(center[0] - radius, center[0] + radius)
        axis.set_ylim(center[1] - radius, center[1] + radius)
        axis.set_zlim(center[2] - radius, center[2] + radius)
        axis.set_box_aspect((1, 1, 1))
        axis.view_init(elev=22, azim=50 if accession != "4FM9" else 120)
        axis.set_axis_off()
        axis.set_title(f"{title}\n{accession} · {subtitle}", fontsize=12, pad=4)
        axis.legend(loc="lower center", fontsize=9, frameon=False)
    fig.supxlabel(
        "Experimental Cα / DNA-phosphate traces; gaps preserved. Panels use separate scales.\n"
        "Neither 3WD5 nor 4FM9 is a full-length protein complex; no RNA or docking is shown.",
        fontsize=10,
    )
    output = ASSETS / "structure-comparison.png"
    fig.savefig(
        output,
        dpi=180,
        metadata={
            "impeccable:prompt": "Origin: original Matplotlib experimental-coordinate comparison "
            "from data/processed/structures-view.json; method scripts/plot_teaching_figures.py. "
            "Sources: https://www.rcsb.org/structure/1TNF; https://www.rcsb.org/structure/3WD5; "
            "https://www.rcsb.org/structure/4FM9. Each panel has an independent scale. "
            "Coordinate gaps stay disconnected. No docking, solved RNA or efficacy is depicted.",
            "Description": "Original scientific teaching figure from experimental PDB coordinates.",
            "Source": "https://www.rcsb.org/structure/1TNF; "
            "https://www.rcsb.org/structure/3WD5; https://www.rcsb.org/structure/4FM9",
            "InputSHA256": hashlib.sha256(COORDINATES.read_bytes()).hexdigest(),
            "Method": "scripts/plot_teaching_figures.py; "
            "positive-occupancy Cα/P traces; no docking",
        },
    )
    plt.close(fig)
    return {
        "point_counts": point_counts,
        "input_sha256": hashlib.sha256(COORDINATES.read_bytes()).hexdigest(),
    }


def main():
    ASSETS.mkdir(exist_ok=True)
    comparison = plot_comparison()
    names = [
        "structure-comparison.png",
        "antibody-anatomy.svg",
        "evidence-pathway.svg",
        "sequence-to-structure.svg",
    ]
    provenance = {
        "generated_at_utc": datetime.now(UTC).isoformat(),
        "method": "uv run --project structural-bioinformatics python "
        "structural-bioinformatics/scripts/plot_teaching_figures.py",
        "comparison": comparison,
        "schematic_method": "Original authored static SVG files maintained in assets/; "
        "labeled conceptual diagrams, not molecular coordinates",
        "assets": [
            {
                "path": f"assets/{name}",
                "sha256": hashlib.sha256((ASSETS / name).read_bytes()).hexdigest(),
                "kind": "experimental_coordinate_plot" if name.endswith("png") else "schematic",
                "license": "Original project figure; cite upstream scientific sources",
            }
            for name in names
        ],
        "sources": [
            "https://www.rcsb.org/structure/1TNF",
            "https://www.rcsb.org/structure/3WD5",
            "https://www.rcsb.org/structure/4FM9",
            "https://www.accessdata.fda.gov/drugsatfda_docs/label/2025/125057s425lbl.pdf",
            "https://doi.org/10.3389/fimmu.2025.1668361",
            "https://www.ncbi.nlm.nih.gov/refseq/about/",
        ],
        "limits": [
            "Coordinate examples are distinct experiments, not an alignment or docking result.",
            "Panels have independent display scales; gaps and experimental fragments remain.",
            "Antibody and information-flow schematics are not solved molecular coordinates.",
            "Separate SIRPG experiments do not establish adalimumab→TOP2A mediation.",
            "No figure establishes anticancer benefit or an RNA fold.",
        ],
    }
    (ASSETS / "teaching-provenance.json").write_text(
        json.dumps(provenance, ensure_ascii=False, indent=2) + "\n"
    )
    print(
        "Exported experimental comparison and provenance for three authored scientific schematics."
    )


if __name__ == "__main__":
    main()
