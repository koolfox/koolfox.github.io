"""Compare two independent fixed-configuration execution checks."""

import argparse
import json
from pathlib import Path


def verify(first, second):
    for report in (first, second):
        assert report["purpose"] == "execution_smoke_only"
        assert report["test_evaluations"] == 1
        assert report["partitions"]["training"]["count"] == 640
        assert report["partitions"]["validation"]["count"] == 160
        assert report["test"]["count"] == 320
        assert sum(map(sum, report["test"]["confusion"])) == 320
        assert report["selected_epoch"] == 1
        assert report["parameter_count"] == 9098
    for key in (
        "config",
        "source_sha256",
        "partitions",
        "history",
        "test",
        "parameter_sha256",
    ):
        assert first[key] == second[key], f"Reproducibility mismatch: {key}"
    return {
        "repeatable": True,
        "parameter_sha256": first["parameter_sha256"],
        "test_count": first["test"]["count"],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("first", type=Path)
    parser.add_argument("second", type=Path)
    args = parser.parse_args()
    print(
        json.dumps(
            verify(
                json.loads(args.first.read_text()), json.loads(args.second.read_text())
            )
        )
    )
