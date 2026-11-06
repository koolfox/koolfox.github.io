"""Pin the film assets and compare their two calculations with the notebook."""
import hashlib
import json
from pathlib import Path
import runpy
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PerceptronFilmTest(unittest.TestCase):
    def test_assets_and_source_pages(self):
        record = json.loads((ROOT / 'animations/perceptron-steps.record.json').read_text())
        self.assertEqual(record['source']['pages'], list(range(25, 31)))
        for key in ('video', 'captions'):
            entry = record[key]
            data = (ROOT / entry['path']).read_bytes()
            self.assertEqual(len(data), entry['bytes'])
            self.assertEqual(hashlib.sha256(data).hexdigest(), entry['sha256'])
        manifest = json.loads((ROOT / 'animations/manifest.json').read_text())
        self.assertIn(record, manifest['films'])

    def test_first_two_updates_match_notebook(self):
        trace = runpy.run_path(str(ROOT / 'workshops/spring-2026/s02_majority_epoch.py'))['trace']
        self.assertEqual((trace[0]['score'], trace[0]['prediction'], trace[0]['target']), (0, 1, -1))
        self.assertEqual(trace[0]['weights'], [-0.2, -0.2, 0, 0])
        self.assertAlmostEqual(trace[1]['score'], -0.4)
        self.assertEqual((trace[1]['prediction'], trace[1]['target']), (-1, 1))
        self.assertEqual(trace[1]['weights'], [0, 0, 0, 0.2])


if __name__ == '__main__':
    unittest.main()
