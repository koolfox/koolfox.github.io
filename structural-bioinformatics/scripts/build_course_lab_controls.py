"""Record native-Python control results for independent browser-runtime comparison."""

import hashlib
import json
import runpy
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

PROJECT = Path(__file__).resolve().parents[1]
ENGINE = PROJECT / "assets/course/interactive_lab.py"
PDB = PROJECT / "assets/course/gromacs/1ubq-protein.pdb"


def build():
    lab = runpy.run_path(str(ENGINE))
    cases = [
        (
            "sequence",
            {"dna": "AACGT"},
            lab["sequence"]("AACGT"),
            ["length", "gc_percent", "reverse_complement_5_to_3", "rna_5_to_3"],
        ),
        (
            "geometry",
            {"shift": 10, "angle": 73, "deformation": 3},
            lab["geometry"](PDB, 10, 73, 3),
            ["raw_rmsd", "fitted_rmsd", "reference_rg", "moving_rg"],
        ),
        ("energy", {"delta": -2}, lab["populations"](-2), ["probability_b", "ratio"]),
        (
            "minimization",
            {"start": 4, "rate": 1.1, "steps": 6},
            lab["minimize"](4, 1.1, 6),
            ["positions", "energies"],
        ),
        (
            "sampling",
            {"mean_shift": 2, "noise": 0.4, "correlation": 0.8, "seed": 17, "block": "25"},
            lab["sampling"](2, 0.4, 0.8, 17, 25),
            ["mean", "series", "block_means"],
        ),
        (
            "graph",
            {"dataset": "protein", "cutoff": 8, "exclude": "2", "node": "A:21"},
            lab["graph"](PDB, 8, "protein", 2, "A:21"),
            ["labels", "degrees", "neighbors", "edges"],
        ),
    ]
    return {
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "engine_sha256": hashlib.sha256(ENGINE.read_bytes()).hexdigest(),
        "input_sha256": hashlib.sha256(PDB.read_bytes()).hexdigest(),
        "native_runtime": {"python": sys.version.split()[0], "numpy": np.__version__},
        "purpose": (
            "Native execution controls, not experimental biological measurements. "
            "Browser tests compare live Python outputs with these results "
            "at floating-point tolerance."
        ),
        "cases": [
            {"mode": mode, "inputs": inputs, "expected": {k: result[k] for k in fields}}
            for mode, inputs, result, fields in cases
        ],
    }


if __name__ == "__main__":
    path = PROJECT / "data/processed/interactive-lab-controls.json"
    path.write_text(json.dumps(build(), ensure_ascii=False, indent=2) + "\n")
