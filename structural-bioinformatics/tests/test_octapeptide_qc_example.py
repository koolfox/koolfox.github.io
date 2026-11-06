"""Check a recorded rejected docking pose independently from its summary."""

import hashlib
import json
import re
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1] / "assets/octapeptide-qc-example"


def coordinates(text):
    return np.array(
        [
            [float(line[i : i + 8]) for i in (30, 38, 46)]
            for line in text.splitlines()
            if line.startswith(("ATOM  ", "HETATM")) and line.split()[-1] not in ("H", "HD")
        ]
    )


def test_recorded_example_is_rejected_for_actual_clashes():
    audit = json.loads((ROOT / "audit.json").read_text())
    report = json.loads((ROOT / "report.json").read_text())
    assert audit["status"] == "failed_qc" and report["status"] == "failed"
    for name, expected in audit["files"].items():
        assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == expected
    receptor = coordinates((ROOT / "receptor.pdbqt").read_text())
    blocks = re.findall(
        r"^MODEL\s+\d+\s*$(.*?)^ENDMDL\s*$", (ROOT / "poses.pdbqt").read_text(), re.M | re.S
    )
    assert len(blocks) == len(audit["poses"]) == 2
    for block, pose in zip(blocks, audit["poses"], strict=True):
        score = re.search(r"^REMARK VINA RESULT:\s*([-+\d.]+)", block, re.M)
        assert score and float(score.group(1)) == pose["score_kcal_mol"]
        minimum = np.linalg.norm(
            coordinates(block)[:, None, :] - receptor[None, :, :], axis=2
        ).min()
        assert abs(minimum - pose["minimum_heavy_atom_distance_angstrom"]) < 0.001
        assert minimum < audit["threshold_angstrom"]
