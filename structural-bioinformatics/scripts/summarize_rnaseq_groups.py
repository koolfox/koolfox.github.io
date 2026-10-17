"""Group-level descriptive summary of baseline PBMC RNA in GSE138746 (adalimumab arm).

Download the two GEO files listed in data/metadata/ra-rnaseq-learning.json into
structural-bioinformatics/data/raw/gse138746/ (gitignored), then run from repository root:
uv run --project structural-bioinformatics python \
    structural-bioinformatics/scripts/summarize_rnaseq_groups.py

Only aggregates are written: per month-6 response group, n, median and quartiles of the
author-normalized values for a few named genes. No per-participant value, clinical covariate
or identifier is published, and no test, p-value or fold change is computed: the RNA was
drawn before therapy, so this describes groups and cannot measure a drug effect.
"""

import argparse
import csv
import gzip
import hashlib
import json
from pathlib import Path

import numpy as np

PROJECT = Path(__file__).resolve().parents[1]
RAW = PROJECT / "data/raw/gse138746"
MATRIX = "GSE138746_series_matrix.txt.gz"
COUNTS = "GSE138746_Counts_Normalization_PBMC.csv.gz"
# Ensembl human gene IDs (GRCh38); the matrix rows are keyed by these IDs.
GENES = {
    "TNF": ("ENSG00000232810", "the drug's target; mRNA in blood cells, not TNF protein"),
    "TNFRSF1A": ("ENSG00000067182", "TNF receptor 1"),
    "TNFRSF1B": ("ENSG00000028137", "TNF receptor 2"),
    "TOP2A": ("ENSG00000131747", "parallel track; cell-division enzyme"),
    "ACTB": ("ENSG00000075624", "reference gene for scale; not a normalization step here"),
}
RESPONSES = {"g": "good", "m": "moderate", "n": "no"}
MIN_GROUP_SIZE = 5  # never summarize a group small enough to approach individual values


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sample_labels(path):
    """Column title -> (drug, response) from the GEO series matrix."""
    rows = {}
    with gzip.open(path, "rt") as handle:
        for line in handle:
            if line.startswith("!Sample_title"):
                rows["title"] = [v.strip('"') for v in line.rstrip("\n").split("\t")[1:]]
            elif line.startswith("!Sample_characteristics_ch1"):
                values = [v.strip('"') for v in line.rstrip("\n").split("\t")[1:]]
                key = values[0].split(":", 1)[0]
                if key in {"drug", "response"}:
                    rows[key] = [v.split(":", 1)[1].strip() for v in values]
    columns = zip(rows["title"], rows["drug"], rows["response"], strict=True)
    return {title: (drug, response) for title, drug, response in columns}


def summarize(raw):
    record = json.loads((PROJECT / "data/metadata/ra-rnaseq-learning.json").read_text())
    expected = {Path(item["url"]).name: item["sha256"] for item in record["provenance"]}
    for name in (MATRIX, COUNTS):
        if sha256(raw / name) != expected[name]:
            raise ValueError(f"{name} differs from the recorded SHA-256; re-check the download")
    labels = sample_labels(raw / MATRIX)
    wanted = {gene_id: symbol for symbol, (gene_id, _) in GENES.items()}
    with gzip.open(raw / COUNTS, "rt") as handle:
        reader = csv.reader(handle)
        header = next(reader)[1:]
        values = {wanted[row[0]]: row[1:] for row in reader if row[0] in wanted}
    adalimumab = [i for i, title in enumerate(header) if labels[title][0] == "Adalimumab"]
    for i in adalimumab:
        # Column titles encode drug and response; they must agree with the metadata rows.
        assert header[i].split("_")[1] == "A"
        assert RESPONSES[header[i].split("_")[2]] == labels[header[i]][1]
    groups = {
        response: [i for i in adalimumab if labels[header[i]][1] == response]
        for response in ("good", "moderate", "no")
    }
    if min(len(v) for v in groups.values()) < MIN_GROUP_SIZE:
        raise ValueError("A response group is too small to publish as an aggregate")
    genes = []
    for symbol, (gene_id, role) in GENES.items():
        row = np.array([float(v) for v in values[symbol]])
        summary = {}
        for response, columns in groups.items():
            q1, median, q3 = np.percentile(row[columns], [25, 50, 75])
            summary[response] = {
                "n": len(columns),
                "q1": round(float(q1), 1),
                "median": round(float(median), 1),
                "q3": round(float(q3), 1),
            }
        genes.append(
            {"symbol": symbol, "ensembl_gene_id": gene_id, "role": role, "groups": summary}
        )
    return {
        "accession": "GSE138746",
        "compartment": "PBMC",
        "arm": "Adalimumab",
        "value_type": "author-normalized counts as published in "
        "GSE138746_Counts_Normalization_PBMC.csv.gz; no new normalization",
        "timing": "RNA drawn before adalimumab started; response group assessed at month 6",
        "group_definition": "EULAR-style response label recorded by the authors: good, "
        "moderate, no",
        "statistics": "n, 25th percentile, median, 75th percentile (numpy linear "
        "interpolation). No minimum, maximum, individual value, test or p-value.",
        "inputs": expected,
        "generator": "scripts/summarize_rnaseq_groups.py",
        "genes": genes,
        "limitations": [
            "Baseline RNA only: differences between response groups are not drug effects.",
            "Descriptive only: no hypothesis test, multiple-testing control or covariates.",
            "Group sizes are small (9–18); quartiles are unstable and overlap is expected.",
            "mRNA in peripheral blood cells is neither TNF protein in the joint nor drug binding.",
            "Participant-level values and clinical covariates are not republished.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--raw", type=Path, default=RAW)
    args = parser.parse_args()
    result = summarize(args.raw.resolve())
    out = PROJECT / "data/processed/rnaseq-group-summary.json"
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    for gene in result["genes"]:
        print(gene["symbol"], {k: v["median"] for k, v in gene["groups"].items()})


if __name__ == "__main__":
    main()
