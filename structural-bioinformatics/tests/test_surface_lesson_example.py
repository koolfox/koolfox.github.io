"""Verify simple radius-of-gyration and surface-area teaching arithmetic."""

import numpy as np
import pytest


def test_worked_radius_and_surface_examples():
    points = np.array([[-3.0, 0, 0], [0, 0, 0], [3, 0, 0]])
    center = points.mean(axis=0)
    rg = np.sqrt(np.mean(np.sum((points - center) ** 2, axis=1)))
    assert rg == pytest.approx(np.sqrt(6))
    assert 900 + 700 - 1300 == 300
    assert (900 + 700 - 1300) / 2 == 150


def test_radius_of_gyration_is_translation_invariant():
    points = np.array([[-2.0, 0, 0], [2, 0, 0]])

    def radius(coords):
        return np.sqrt(np.mean(np.sum((coords - coords.mean(axis=0)) ** 2, axis=1)))

    assert radius(points) == pytest.approx(2)
    assert radius(points + [10, 0, 0]) == pytest.approx(radius(points))
