"""Confirm the worked 1UBQ example against the curated coordinate file."""

import math
from pathlib import Path


def test_intro_ubiquitin_example_uses_curated_coordinates():
    root = Path(__file__).resolve().parents[1]
    atoms = [
        line
        for line in (root / "assets/course/gromacs/1ubq-protein.pdb").read_text().splitlines()
        if line.startswith("ATOM")
    ]
    first, second = atoms[:2]
    assert (first[12:16].strip(), first[17:20], first[21], int(first[22:26])) == (
        "N",
        "MET",
        "A",
        1,
    )
    assert second[12:16].strip() == "CA"
    coordinates = [tuple(float(line[i : i + 8]) for i in (30, 38, 46)) for line in (first, second)]
    assert coordinates == [(27.340, 24.430, 2.614), (26.266, 25.413, 2.842)]
    assert round(math.dist(*coordinates), 2) == 1.47
