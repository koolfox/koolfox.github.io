"""Films must use the same numerical examples as the executable notebook."""
import contextlib
import io
import json
from pathlib import Path
import runpy
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
sys.path.insert(0, str(ROOT / 'animations'))
from source_animations import animation_files
from source_math import attention, backprop, convolution


def notebook(name):
    with contextlib.redirect_stdout(io.StringIO()):
        return runpy.run_path(str(ROOT / f'workshops/spring-2026/{name}.py'))['result']


class SourceAnimationTests(unittest.TestCase):
    def test_film_math_matches_page_notebooks_without_slide_rounding(self):
        result = notebook('s13_source_attention')
        scores, weights, output = attention()
        self.assertEqual(scores, result['scores'])
        self.assertEqual(weights, result['weights'])
        self.assertEqual(output, result['output'])
        self.assertEqual(convolution(), notebook('s05_source_convolution')['feature_map'])
        result = notebook('s03')['source_network']
        actual = backprop()
        for key in ('z4', 'z5', 'z6', 'o4', 'o5', 'o6'):
            self.assertAlmostEqual(actual[key], result['forward'][key], places=14)
        self.assertAlmostEqual(actual['e6'], result['source_scaled_gradients']['b6'], places=14)

    def test_film_artifacts_and_source_identity_are_pinned(self):
        self.assertEqual(len(animation_files(ROOT)), 7)
        originals = {row['session_id']: row for row in json.loads((ROOT / 'data/metadata/spring-2026-slide-identity.json').read_text())['records']}
        films = json.loads((ROOT / 'animations/manifest.json').read_text())['films']
        for film in films:
            self.assertEqual(film['source']['pdf_sha256'], originals[film['source']['session']]['sha256'])
            self.assertEqual(film['render']['resolution'], [1920, 1080])
            self.assertTrue(film['transcript_fa'])
            self.assertGreater(film['duration_seconds'], 10)
