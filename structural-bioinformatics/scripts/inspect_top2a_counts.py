"""Extract a descriptive, donor-paired TOP2A count check; no inference or DE test."""

import argparse
import csv
import gzip
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

SOURCE_URL = (
    "https://ftp.ncbi.nlm.nih.gov/geo/series/GSE339nnn/GSE339038/suppl/"
    "GSE339038_Gene_counts_MLR.tsv.gz"
)


def inspect_counts(counts_path, soft_path):
    samples = {}
    for block in re.split(r"(?m)^\^SAMPLE = ", soft_path.read_text())[1:]:
        accession = block.splitlines()[0].strip()
        identifiers = set(re.findall(r"SH14181_SA\d+", block))
        if len(identifiers) != 1:
            raise ValueError(f"Ambiguous count-column mapping: {accession}")
        fields = dict(re.findall(r"(?m)^!Sample_characteristics_ch1 = ([^:]+): (.+)$", block))
        samples[identifiers.pop()] = {"accession": accession, **fields}
    with gzip.open(counts_path, "rt") as handle:
        rows = csv.reader(handle, delimiter="\t")
        header = next(rows)
        columns = header[2:]
        if set(columns) != set(samples):
            raise ValueError("Count columns and GEO sample metadata do not agree")
        sums = [0.0] * len(columns)
        target = None
        gene_count = 0
        for row in rows:
            if len(row) != len(header):
                raise ValueError("Inconsistent matrix width")
            values = [float(value) for value in row[2:]]
            if any(value < 0 for value in values):
                raise ValueError("Negative estimated count")
            sums = [a + b for a, b in zip(sums, values, strict=True)]
            gene_count += 1
            if row[1] == "TOP2A":
                if target:
                    raise ValueError("More than one TOP2A row")
                target = (row[0], values)
        if target is None or any(total <= 0 for total in sums):
            raise ValueError("Missing target or empty library")
    records = []
    for column, value, total in zip(columns, target[1], sums, strict=True):
        record = samples[column]
        if record["treatment"] in {"Ada + IgG1", "IgG1+IgG1"}:
            records.append(
                {
                    "column": column,
                    **record,
                    "estimated_count": value,
                    "library_estimated_count_sum": total,
                    "cpm": value / total * 1_000_000,
                }
            )
    paired = []
    for donor in sorted({record["batch"] for record in records}):
        group = [record for record in records if record["batch"] == donor]
        if len(group) != 2:
            raise ValueError("Incomplete donor pair")
        drug = next(r for r in group if r["treatment"] == "Ada + IgG1")
        control = next(r for r in group if r["treatment"] == "IgG1+IgG1")
        paired.append(
            {
                "donor": donor,
                "control_cpm": control["cpm"],
                "adalimumab_cpm": drug["cpm"],
                "ratio": drug["cpm"] / control["cpm"],
            }
        )
    return {
        "accession": "GSE339038",
        "gene_id": target[0],
        "gene_symbol": "TOP2A",
        "matrix_gene_rows": gene_count,
        "matrix_libraries": len(columns),
        "selected_libraries": records,
        "donor_pairs": paired,
        "normalization": "CPM = estimated gene count / sum of all gene counts * 1e6",
        "status": "descriptive_only_not_differential_expression",
        "limitations": [
            "Salmon estimated counts can be fractional; no rounding was performed.",
            "Library-total CPM does not apply composition correction (TMM).",
            "No gene filtering, limma-voom model, p-value or FDR was computed.",
            "RNA abundance is not TOP2A protein amount or enzymatic inhibition.",
            "Four donors in an in-vitro MLR assay are not a patient treatment trial.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("counts", type=Path)
    parser.add_argument("metadata", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--figure", type=Path)
    args = parser.parse_args()
    result = inspect_counts(args.counts, args.metadata)
    result["generated_at_utc"] = datetime.now(timezone.utc).isoformat()
    result["provenance"] = {
        "counts_url": SOURCE_URL,
        "counts_sha256": hashlib.sha256(args.counts.read_bytes()).hexdigest(),
        "geo_metadata_sha256": hashlib.sha256(args.metadata.read_bytes()).hexdigest(),
        "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
    if args.figure:
        plot_pairs(result, args.figure)
        result["figure"] = {
            "path": args.figure.name,
            "sha256": hashlib.sha256(args.figure.read_bytes()).hexdigest(),
            "representation": "descriptive donor-paired TOP2A CPM; not enzyme activity",
        }
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")


def plot_pairs(result, output):
    import matplotlib

    matplotlib.use("Agg")
    from matplotlib import pyplot as plt

    fig, ax = plt.subplots(figsize=(8, 5.5), layout="constrained")
    colors = ["#087b73", "#245cb7", "#a95015", "#7555a1"]
    for pair, color in zip(result["donor_pairs"], colors, strict=True):
        values = [pair["control_cpm"], pair["adalimumab_cpm"]]
        ax.plot([0, 1], values, "o-", color=color, linewidth=2.5, markersize=8)
        ax.annotate(pair["donor"].replace("Donor ", ""), (1.04, values[1]), color=color)
    ax.set_xticks([0, 1], ["IgG1 + IgG1\ncontrol", "Adalimumab + IgG1"])
    ax.set_ylabel("TOP2A estimated counts per million (CPM)", fontsize=12)
    ax.set_title("GSE339038: four paired donors", fontsize=16, pad=18)
    ax.set_xlim(-0.15, 1.2)
    ax.set_ylim(0, 75)
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(labelsize=12)
    fig.text(0.5, -0.04, "Descriptive only: no TMM, statistical test or enzyme assay", ha="center")
    fig.savefig(output, dpi=180, bbox_inches="tight", facecolor="white")
    plt.close(fig)


if __name__ == "__main__":
    main()
