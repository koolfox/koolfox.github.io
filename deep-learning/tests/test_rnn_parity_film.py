"""Keep the source-bound parity film aligned with the executable example."""
import json
from math import tanh
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

    def test_slide_rounded_states_and_film_unrounded_recurrence_are_distinct(self):
        record = json.loads((ROOT / 'animations/rnn-parity.record.json').read_text())
        slides = json.loads((ROOT / 'content/source-slides/spring-2026/s04.json').read_text())
        source = slides['pages'][26]['lines']
        self.assertIn('s1 = tanh 3 ⋅ −1 ⋅ 1 ≈ −1', source)
        self.assertIn('s2 = tanh 3 ⋅ 1 ⋅ −1 ≈ −1', source)
        states = record['source_states']
        previous = 1.0
        for value, bit in zip(states, [1, 0, 1, 1]):
            previous = tanh(3 * (-1 if bit else 1) * previous)
            self.assertAlmostEqual(value, previous)
        self.assertEqual([round(value) for value in states], [-1, -1, 1, -1])
        self.assertGreater(abs(states[1] - tanh(-3)), 0.00001)
        self.assertTrue(any('گرد نمی شود' in text and 'تقریبا' in text for text in record['transcript_fa']))
