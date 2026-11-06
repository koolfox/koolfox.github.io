"""Check the VMD introductory exercise against its local coordinate subset."""

from collections import Counter
from pathlib import Path


def test_local_ubiquitin_exercise_counts():
    root = Path(__file__).resolve().parents[1]
    lines = (root / "assets/course/gromacs/1ubq-protein.pdb").read_text().splitlines()
    atoms = [line for line in lines if line.startswith("ATOM  ")]
    assert len(atoms) == 602
    assert {line[21] for line in atoms} == {"A"}
    assert sum(line[12:16].strip() == "CA" for line in atoms) == 76
    assert Counter(float(line[54:60]) for line in atoms) == {1.0: 574, 0.45: 19, 0.25: 9}
