"""Atom correspondence and fixed-frame RMSD are essential to redocking validation."""

import pytest

from peptide_lab.redock import atoms, compare


def test_fixed_receptor_frame_does_not_align_away_a_translation():
    reference = {1: (0.0, 0.0, 0.0), 2: (1.0, 0.0, 0.0)}
    shifted = {1: (3.0, 4.0, 0.0), 2: (4.0, 4.0, 0.0)}
    assert compare(reference, reference) == 0
    assert compare(reference, shifted) == 5


def test_atom_identity_mismatch_is_rejected():
    with pytest.raises(ValueError, match="serials differ"):
        compare({1: (0.0, 0.0, 0.0)}, {2: (0.0, 0.0, 0.0)})


def test_duplicate_atom_identifiers_are_rejected():
    line = "ATOM      1  C   UNK A   1       1.000   2.000   3.000  1.00  0.00     0.000 C"
    with pytest.raises(ValueError, match="Duplicate"):
        atoms(line + "\n" + line)
