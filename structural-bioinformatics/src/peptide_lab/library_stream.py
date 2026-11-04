"""Stream a complete combinatorial library with an explicit user-selected budget."""

import argparse
import hashlib
import json
from datetime import UTC, datetime
from itertools import product
from pathlib import Path

from .library import LibrarySpec, plan_library


def export(spec, output_dir, budget):
    if isinstance(budget, bool) or not isinstance(budget, int) or budget < 1:
        raise ValueError("Budget must be a positive integer")
    report = plan_library(spec)
    report.pop("max_export_sequences", None)
    report["export_limit_policy"] = "explicit_user_budget"
    if report["total_sequences"] > budget:
        raise ValueError("Complete library exceeds the explicit budget; nothing was written")
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=False)
    target = output_dir / "sequences.fasta"
    hasher = hashlib.sha256()
    count = 0
    with target.open("xb") as handle:
        for length in range(spec.min_length, spec.max_length + 1):
            for letters in product(spec.alphabet, repeat=length):
                count += 1
                line = f">peptide-{count:012d}\n{''.join(letters)}\n".encode()
                handle.write(line)
                hasher.update(line)
    report.update(
        status="sequences_generated",
        generated_at_utc=datetime.now(UTC).isoformat(),
        export_budget=budget,
        exported_sequences=count,
        generator_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        files={"sequences.fasta": {"sha256": hasher.hexdigest()}},
    )
    (output_dir / "manifest.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--alphabet", required=True)
    parser.add_argument("--min-length", type=int, required=True)
    parser.add_argument("--max-length", type=int, required=True)
    parser.add_argument("--budget", type=int, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    try:
        result = export(
            LibrarySpec(args.alphabet, args.min_length, args.max_length),
            args.output_dir,
            args.budget,
        )
    except (OSError, ValueError) as exc:
        parser.exit(1, f"Request rejected: {exc}\n")
    print(json.dumps({"status": result["status"], "count": result["exported_sequences"]}))


if __name__ == "__main__":
    main()
