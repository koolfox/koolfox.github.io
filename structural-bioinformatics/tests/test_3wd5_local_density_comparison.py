"""Offline numerical checks for the fixed local density protocol."""
import importlib.util
import unittest
from pathlib import Path

import gemmi
import numpy as np

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/compare_3wd5_local_density.py'
spec = importlib.util.spec_from_file_location('local_density', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class LocalDensityTests(unittest.TestCase):
    def test_sphere_selection_and_periodic_wrap(self):
        grid = gemmi.FloatGrid(10, 10, 10)
        grid.set_unit_cell(gemmi.UnitCell(10, 10, 10, 90, 90, 90))
        arr = np.asarray(grid)
        arr[:] = 0
        arr[9, 0, 0] = 7
        result = module.sample(grid, np.array([0., 0., 0.]), 0, 1)
        self.assertEqual(result['voxel_count'], 7)
        self.assertAlmostEqual(result['sphere_mean_sigma'], 1)
        self.assertEqual(result['sphere_max_sigma'], 7)
        self.assertEqual(result['center_sigma'], 0)

    def test_rotation_preserves_geometry(self):
        ca, cb, sg = (np.array(x, dtype=float) for x in ([0, 0, 0], [1, 0, 0], [1, 1, 0]))
        rotated = module.rotate(ca, cb, sg, -90)
        np.testing.assert_allclose(rotated, [1, 0, -1], atol=1e-12)
        self.assertAlmostEqual(np.linalg.norm(rotated - cb), np.linalg.norm(sg - cb))

    def test_rejects_changed_input(self):
        with self.assertRaises(ValueError):
            module.verify(SCRIPT, '0' * 64)

    @unittest.skipUnless(module.COEFFICIENTS.exists() and module.MAP.exists(), 'local inputs absent')
    def test_existing_inputs_and_candidate(self):
        result = module.run()
        self.assertTrue(result['all_rebuilt_voxels_equal'])
        self.assertEqual(result['grid'], [160, 160, 160])
        candidate = result['models']['scan_candidate']
        np.testing.assert_allclose(candidate['sg_displacement_angstrom'], [2.354, 0.285], atol=0.001)
        self.assertAlmostEqual(candidate['sg_sg_angstrom'], 1.904, delta=0.001)
        self.assertEqual(candidate['density']['69']['voxel_count'], 3)
        self.assertAlmostEqual(candidate['density']['69']['center_sigma'], 0.437766, places=5)


if __name__ == '__main__':
    unittest.main()
