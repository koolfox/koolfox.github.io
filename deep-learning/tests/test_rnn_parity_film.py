"""Keep the source-bound parity film aligned with the executable example."""
import json
import runpy
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ParityFilmTests(unittest.TestCase):
    def test_film_uses_the_source_notebook_values(self):
        record = json.loads((ROOT / 'animations/rnn-parity.record.json').read_text())
        manifest = json.loads((ROOT / 'animations/manifest.json').read_text())
        self.assertIn(record, manifest['films'])
        notebook = runpy.run_path(str(ROOT / 'workshops/spring-2026/s04_parity.py'))['result']
        self.assertEqual(record['source_states'], notebook['states'])
        self.assertEqual(record['source']['pages'], [27])
        self.assertEqual([round(value, 4) for value in notebook['states']],
                         [-0.9951, -0.9949, 0.9949, -0.9949])
        self.assertEqual(notebook['predicted_odd'], [1, 1, 0, 1])
