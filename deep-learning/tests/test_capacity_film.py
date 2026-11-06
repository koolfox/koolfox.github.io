"""Checks for the source-bound lesson-one capacity film."""
import hashlib
import json
import runpy
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class CapacityFilmTest(unittest.TestCase):
    def test_manifest_pins_video_captions_and_exact_source_page(self):
        manifest = json.loads((ROOT / 'animations/manifest.json').read_text())
        film = next(item for item in manifest['films'] if item['id'] == 'capacity-boundary')
        self.assertEqual(film['source']['session'], 's01')
        self.assertEqual(film['source']['pages'], [53])
        self.assertEqual(film['render']['resolution'], [1920, 1080])
        self.assertGreater(film['duration_seconds'], 15)
        for key in ('video', 'captions'):
            artifact = film[key]
            data = (ROOT / artifact['path']).read_bytes()
            self.assertEqual(len(data), artifact['bytes'])
            self.assertEqual(hashlib.sha256(data).hexdigest(), artifact['sha256'])
        captions = (ROOT / film['captions']['path']).read_text()
        self.assertIn('مختصات نقاط شکل نیستند', captions)
        self.assertEqual([item['label_fa'] for item in film['chapters']], ['خط', 'سهمی', 'منحنی', 'نمونه کد'])

    def test_notebook_values_match_the_film_example(self):
        result = runpy.run_path(str(ROOT / 'workshops/spring-2026/s01_boundary_functions.py'))['result']
        self.assertEqual(result, {'x': [-2, -1, 0, 1, 2],
                                  'line': [-2, -1, 0, 1, 2],
                                  'parabola': [4, 1, 0, 1, 4]})


if __name__ == '__main__':
    unittest.main()
