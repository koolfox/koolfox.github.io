import contextlib
import io
import runpy
import unittest
from pathlib import Path


class ShiftEquivarianceTests(unittest.TestCase):
    def test_translation_and_boundary(self):
        path = Path(__file__).resolve().parents[1] / 'workshops/spring-2026/s05_shift_equivariance.py'
        with contextlib.redirect_stdout(io.StringIO()):
            scope = runpy.run_path(str(path))
        result = scope['result']
        self.assertEqual(result['original_map'], [[0,0,0,0,0],[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[0,0,0,0,0]])
        self.assertTrue(result['same_after_shift'])
        self.assertFalse(result['unchanged'])
        self.assertFalse(result['boundary_equal'])
        self.assertEqual(result['boundary_map'][2][0], 1)
        self.assertEqual(result['boundary_expected'][2][0], 0)
        for shift in (0, 1, 2):
            moved = scope['shift_right'](scope['image'], shift)
            self.assertEqual(scope['correlate'](moved, scope['kernel']), scope['shift_right'](result['original_map'], shift))
        with self.assertRaises(ValueError):
            scope['shift_right'](scope['image'], 3)
