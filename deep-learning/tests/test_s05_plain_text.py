"""Keep the reviewed CNN lesson text consistent with its Persian style."""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UNWANTED = re.compile(r'[\u064b-\u065fئأإءۀ]')


class CnnPlainTextTests(unittest.TestCase):
    def test_persian_slide_and_exercise_text_has_no_diacritics(self):
        def visit(value, key='', persian=False):
            persian = persian or key == 'fa' or key.endswith('_fa')
            if isinstance(value, dict):
                for name, item in value.items():
                    visit(item, name, persian)
            elif isinstance(value, list):
                for item in value:
                    visit(item, key, persian)
            elif persian and isinstance(value, str):
                self.assertIsNone(UNWANTED.search(value), value)

        for folder in ['translations', 'activities', 'workshops']:
            data = json.loads((ROOT / f'content/{folder}/spring-2026/s05.json').read_text())
            visit(data)
