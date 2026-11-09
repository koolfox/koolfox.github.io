import hashlib
import json
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

    def test_film_record_pins_the_original_slide_and_timed_captions(self):
        record = json.loads((ROOT / 'animations/pooling-s05p48.record.json').read_text())
        manifest = json.loads((ROOT / 'animations/manifest.json').read_text())
        self.assertIn(record, manifest['films'])
        self.assertEqual((record['source']['session'], record['source']['pages']), ('s05', [48]))
        self.assertEqual([chapter['time'] for chapter in record['chapters']], [0, 4, 11, 18, 25, 32])
        self.assertEqual(record['duration_seconds'], 38)
        captions = (ROOT / record['captions']['path']).read_text()
        for time in ('00:00:04.000', '00:00:11.000', '00:00:18.000',
                     '00:00:25.000', '00:00:32.000', '00:00:38.000'):
            self.assertIn(time, captions)


if __name__ == '__main__':
    unittest.main()
