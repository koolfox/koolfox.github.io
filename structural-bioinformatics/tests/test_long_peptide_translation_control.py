"""Verify recorded scoring controls and their physical translation."""

import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "assets/long-peptide-pilot"
RUN = ROOT / "translation-control/final"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def coords(path, heavy_only=False):
    lines = path.read_text().splitlines()
    return [
        tuple(float(line[i : i + 8]) for i in (30, 38, 46))
        for line in lines
        if line.startswith(("ATOM  ", "HETATM"))
        and (not heavy_only or line.split()[-1] not in ("H", "HD"))
    ]


def test_real_translations_and_stored_distances():
    report = json.loads((RUN / "report.json").read_text())
    receptor_path = ROOT / "bounded-1000000/receptor.pdbqt"
    original = ROOT / "local-refinement/input-1.pdbqt"
    assert digest(receptor_path) == report["receptor_sha256"]
    assert digest(original) == report["pose_sha256"]
    receptor = coords(receptor_path, True)
    source = coords(original)
    assert len(source) == 129 and len(receptor) == 602
    for row, expected in zip(report["cases"], (45, 183, 0, 0), strict=True):
        dx = row["dx_angstrom"]
        path = RUN / f"pose-x{dx:+d}.pdbqt"
        log = RUN / f"vina-x{dx:+d}.log"
        assert row["exit_code"] == 0
        assert digest(path) == row["ligand_sha256"]
        assert digest(log) == row["log_sha256"]
        translated = coords(path)
        assert len(translated) == len(source)
        for before, after in zip(source, translated, strict=True):
            assert math.isclose(after[0] - before[0], dx, abs_tol=1e-9)
            assert after[1:] == before[1:]
        distances = [math.dist(a, b) for a in coords(path, True) for b in receptor]
        assert math.isclose(min(distances), row["minimum_heavy_atom_distance_angstrom"])
        assert sum(d < 2 for d in distances) == row["heavy_atom_pairs_below_2_angstrom"] == expected
        assert "Final Intermolecular Energy" in log.read_text()
