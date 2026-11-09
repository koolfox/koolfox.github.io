import hashlib
import runpy
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PoolingFilmSourceTests(unittest.TestCase):
    def test_input_and_every_window_match_the_source_example(self):
        source = ROOT / 'assets/danna/spring-2026/s05.pdf'
        self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(),
                         'f736f7c4b6be0a031d8faf340a1f5737542a69e74ed59346d9c208028adfcec7')
        example = runpy.run_path(str(ROOT / 'animations/pooling_source_example.py'))['example']()
        self.assertEqual(example['input'], [[1, 1, 2, 4], [5, 6, 7, 8],
                                            [3, 2, 1, 0], [1, 2, 3, 4]])
        self.assertEqual([step['values'] for step in example['steps']],
                         [[1, 1, 5, 6], [2, 4, 7, 8], [3, 2, 1, 2], [1, 0, 3, 4]])
        self.assertEqual(example['output'], [[6, 8], [3, 4]])


if __name__ == '__main__':
    unittest.main()
