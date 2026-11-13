import contextlib
import io
import runpy
import unittest
from pathlib import Path


class SourcePatternTests(unittest.TestCase):
    def test_every_selected_window_matches_reference_map(self):
        path = Path(__file__).resolve().parents[1] / 'workshops/spring-2026/s05_source_pattern.py'
        with contextlib.redirect_stdout(io.StringIO()):
            scope = runpy.run_path(str(path))
        expected = [[4, 3, 4], [2, 4, 3], [2, 3, 4]]
        self.assertEqual(scope['result']['feature_map'], expected)
        for row in range(3):
            for column in range(3):
                result = scope['inspect_window'](scope['image'], scope['kernel'], row, column)
                self.assertEqual(result['response'], expected[row][column])
                self.assertEqual(result['window'], [line[column:column + 3] for line in scope['image'][row:row + 3]])
        with self.assertRaises(ValueError):
            scope['inspect_window'](scope['image'], scope['kernel'], 3, 0)
        with self.assertRaises(ValueError):
            scope['inspect_window'](scope['image'], scope['kernel'], False, 0)
