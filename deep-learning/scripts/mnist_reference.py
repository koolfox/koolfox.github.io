"""Validate measured MNIST evidence before rendering or packaging it."""

import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def check_score(score):
    matrix = score["confusion"]
    require(
        len(matrix) == 10 and all(len(row) == 10 for row in matrix),
        "Confusion matrix must be ten by ten",
    )
    require(
        all(type(v) is int and v >= 0 for row in matrix for v in row),
        "Invalid confusion count",
    )
    count = sum(map(sum, matrix))
    require(count == score["count"] and count > 0, "Metric sample count mismatch")
    accuracy = sum(matrix[i][i] for i in range(10)) / count
    require(
        math.isclose(accuracy, score["accuracy"], abs_tol=1e-12),
        "Accuracy does not match confusion matrix",
    )
    recalls = [
        matrix[i][i] / sum(matrix[i]) if sum(matrix[i]) else None for i in range(10)
    ]
    require(len(score["recall_per_class"]) == 10, "Missing class recalls")
    for actual, stated in zip(recalls, score["recall_per_class"]):
        require(
            stated is None
            if actual is None
            else stated is not None and math.isclose(actual, stated, abs_tol=1e-12),
            "Recall does not match confusion matrix",
        )
    present = [r for r in recalls if r is not None]
    require(
        math.isclose(sum(present) / len(present), score["macro_recall"], abs_tol=1e-12),
        "Macro recall mismatch",
    )
    require(
        math.isfinite(score["loss"]) and score["loss"] >= 0, "Invalid cross entropy"
    )


def check_reference(reference, root=ROOT):
    runs = reference["runs"]
    require(
        {r["config"]["model"] for r in runs} == {"cnn", "linear"} and len(runs) == 2,
        "Both reference models are required",
    )
    require(
        runs[0]["partitions"] == runs[1]["partitions"],
        "Models must share the same partitions",
    )
    configurations = [
        {k: v for k, v in run["config"].items() if k != "model"} for run in runs
    ]
    require(configurations[0] == configurations[1], "Compared settings must match")
    expected_sources = json.loads(
        (root / "labs/cnn-mnist/data-sources.json").read_text()
    )["sources"]
    for run in runs:
        require(
            set(run["source_sha256"])
            == {"train.py", "mnist_data.py", "pyproject.toml", "uv.lock"},
            "Every executable source hash is required",
        )
        require(
            set(run["sources"]) == set(expected_sources),
            "Every official dataset file is required",
        )
        require(
            run["purpose"] == "educational_mnist_benchmark"
            and not run["config"]["smoke"],
            "Smoke results cannot become full results",
        )
        require(
            run["test_evaluations"] == 1 and run["test"]["count"] == 10000,
            "Official test evaluation missing",
        )
        history = run["history"]
        require(
            len(history) == run["config"]["epochs"]
            and [h["epoch"] for h in history] == list(range(1, len(history) + 1)),
            "Incomplete epoch history",
        )
        best = min(history, key=lambda h: h["validation"]["loss"])
        require(
            run["selected_epoch"] == best["epoch"],
            "Checkpoint was not selected by validation loss",
        )
        train_n = run["partitions"]["training"]["count"]
        val_n = run["partitions"]["validation"]["count"]
        require(
            train_n + val_n == 60000 and train_n > val_n > 0,
            "Official training pool partition mismatch",
        )
        for epoch in history:
            require(
                epoch["train"]["count"] == train_n
                and epoch["validation"]["count"] == val_n,
                "Epoch partition count changed",
            )
            check_score(epoch["train"])
            check_score(epoch["validation"])
        check_score(run["test"])
        require(
            run["parameter_count"]
            == {"cnn": 9098, "linear": 7850}[run["config"]["model"]],
            "Unexpected model parameter count",
        )
        for name, expected in expected_sources.items():
            require(
                run["sources"][name]["sha256"] == expected["sha256"],
                "Dataset identity changed",
            )
        for name, sha256 in run["source_sha256"].items():
            require(
                name in {"train.py", "mnist_data.py", "pyproject.toml", "uv.lock"},
                "Unexpected executable source",
            )
            require(
                hashlib.sha256(
                    (root / "labs/cnn-mnist" / name).read_bytes()
                ).hexdigest()
                == sha256,
                "Current project no longer matches reference source; re-execute before publishing",
            )
    return reference


def load_reference(root=ROOT):
    return check_reference(
        json.loads((root / "data/processed/mnist-reference.json").read_text()), root
    )


if __name__ == "__main__":
    result = load_reference()
    print(
        json.dumps(
            {
                r["config"]["model"]: {
                    "test_accuracy": r["test"]["accuracy"],
                    "selected_epoch": r["selected_epoch"],
                }
                for r in result["runs"]
            },
            indent=2,
        )
    )
