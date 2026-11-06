"""Check the worked RMSD values using explicit atom coordinates."""

import numpy as np


def test_rmsd_translation_example():
    reference = np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0]])
    model = np.array([[3, 4, 0], [4, 4, 0], [3, 5, 0]])
    rmsd = lambda x: np.sqrt(np.mean(np.sum((x - reference) ** 2, axis=1)))  # noqa: E731
    assert rmsd(model) == 5
    assert rmsd(model + [-3, -4, 0]) == 0
