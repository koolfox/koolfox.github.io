"""Descriptive, donor-paired RNA panel; no DE test, mediation or enzyme inference."""

import argparse
import csv
import gzip
import hashlib
import json
import math
import platform
from datetime import datetime, timezone
from pathlib import Path
from statistics import median

PROJECT = Path(__file__).resolve().parents[1]
PANEL = ("TOP2A", "MKI67", "UBE2C", "CCNB1", "PCNA", "SIRPG", "TNF")
DRUG = "Ada + IgG1"
CONTROL = "IgG1+IgG1"


def inspect_panel(counts_path, selections, genes=PANEL):
    """Use all matrix rows as CPM denominators; pair within donor before summarizing."""
    columns = [r["column"] for r in selections]
    if len(set(columns)) != len(columns):
        raise ValueError("Duplicate selected library")
    donors = sorted({r["batch"] for r in selections})
    pairs = []
    for donor in donors:
        rows = [r for r in selections if r["batch"] == donor]
        if len(rows) != 2 or {r["treatment"] for r in rows} != {DRUG, CONTROL}:
            raise ValueError("One single-drug and one matched control per donor required")
        pairs.append(
            tuple(next(r["column"] for r in rows if r["treatment"] == t) for t in (CONTROL, DRUG))
        )
    totals = dict.fromkeys(columns, 0.0)
    found = {}
    row_count = 0
    with gzip.open(counts_path, "rt") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        if not set(columns) <= set(reader.fieldnames or []):
            raise ValueError("Selected library missing from matrix")
        matrix_libraries = len(reader.fieldnames) - 2
        for row in reader:
            row_count += 1
            values = {c: float(row[c]) for c in columns}
            if not all(math.isfinite(v) and v >= 0 for v in values.values()):
                raise ValueError("Counts must be finite and nonnegative")
            for c, v in values.items():
                totals[c] += v
            name = row["gene_name"]
            if name in genes:
                if name in found:
                    raise ValueError("Repeated panel gene")
                found[name] = (row["gene_id"], values)
    if set(genes) != set(found) or not all(totals.values()):
        raise ValueError("Missing panel gene or empty selected library")
    summaries = []
    for name in genes:
        gene_id, values = found[name]
        cpm = {c: v / totals[c] * 1e6 for c, v in values.items()}
        ratios = [cpm[d] / cpm[c] for c, d in pairs if cpm[c] > 0]
        log_ratios = [math.log2(r) for r in ratios if r > 0]
        summaries.append(
            {
                "gene": name,
                "gene_id": gene_id,
                "n_pairs": len(pairs),
                "lower_cpm_pairs": sum(cpm[d] < cpm[c] for c, d in pairs),
                "equal_cpm_pairs": sum(cpm[d] == cpm[c] for c, d in pairs),
                "valid_ratio_pairs": len(ratios),
                "valid_log_ratio_pairs": len(log_ratios),
                "median_paired_cpm_ratio": median(ratios) if ratios else None,
                "median_paired_log2_cpm_ratio": median(log_ratios) if log_ratios else None,
                "ratio_range": [min(ratios), max(ratios)] if ratios else None,
            }
        )
    return {
        "matrix_rows": row_count,
        "matrix_libraries": matrix_libraries,
        "selected_libraries": len(columns),
        "biological_donors": len(donors),
        "panel": summaries,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("counts", type=Path)
    args = parser.parse_args()
    pilot_path = PROJECT / "data/processed/top2a-count-inspection.json"
    pilot = json.loads(pilot_path.read_text())
    digest = hashlib.sha256(args.counts.read_bytes()).hexdigest()
    if digest != pilot["provenance"]["counts_sha256"]:
        raise ValueError("Source matrix SHA-256 does not match the recorded dataset")
    result = inspect_panel(args.counts, pilot["selected_libraries"])
    result.update(
        {
            "accession": "GSE339038",
            "python": platform.python_version(),
            "status": "descriptive_only_not_differential_expression",
            "contrast": {"drug": DRUG, "control": CONTROL, "paired_by": "donor"},
            "panel_selection": (
                "TOP2A; four cell-cycle context genes; SIRPG and TNF. "
                "Fixed in code before execution; not selected by significance."
            ),
            "normalization": (
                "Gene estimated count / whole-library gene-count sum * 1e6; "
                "no TMM or inferred absolute RNA amount"
            ),
            "provenance": {
                "at_utc": datetime.now(timezone.utc).isoformat(),
                "source_url": pilot["provenance"]["counts_url"],
                "source_sha256": digest,
                "sample_selection_file": "data/processed/top2a-count-inspection.json",
                "sample_selection_sha256": hashlib.sha256(pilot_path.read_bytes()).hexdigest(),
                "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            },
            "limitations": [
                "Four healthy donors in an in-vitro MLR; not RA patients.",
                "No TMM, differential-expression model, p-value or FDR.",
                "No mediation test, protein assay or direct enzyme inhibition measured.",
                "No pseudocount; zero denominators/log ratios are explicitly excluded and counted.",
                "Parallel RNA changes do not establish a specific mechanism.",
                "The existing TOP2A pilot motivated this follow-up; not independent validation.",
            ],
        }
    )
    (PROJECT / "data/processed/top2a-panel-inspection.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    )
    for row in result["panel"]:
        print(row["gene"], row["lower_cpm_pairs"], row["median_paired_cpm_ratio"])


if __name__ == "__main__":
    main()
