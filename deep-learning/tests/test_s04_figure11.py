"""The figure 5 caption transcribes a synchronous, not asynchronous, net."""
import hashlib
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FigureElevenTests(unittest.TestCase):
    def test_figure_caption_and_layout_hash(self):
        path = ROOT / 'content/translations/spring-2026/s04.json'
        page = json.loads(path.read_text())['pages'][10]
        caption = page['image_text'][0]
        self.assertIn('A synchronous iterative net', caption['en'])
        self.assertNotIn('Asynchronous iterative net', caption['en'])
        self.assertIn('شبکه تکرارشونده همگام', caption['fa'])
        payload = {key: page.get(key, []) for key in ('blocks', 'image_text', 'tables')}
        digest = hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        geometry = json.loads((ROOT / 'content/source-layout/spring-2026/s04.json').read_text())['pages'][10]
        self.assertEqual(geometry['translation_sha256'], digest)
