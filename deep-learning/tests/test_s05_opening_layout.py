"""Check source-linked coverage for the opening CNN slides."""

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class OpeningSlideChecks(unittest.TestCase):
    def test_opening_regions_cover_each_source_line_once(self):
        source = json.loads((ROOT / 'content/source-slides/spring-2026/s05.json').read_text())['pages']
        translated = json.loads((ROOT / 'content/translations/spring-2026/s05.json').read_text())['pages']
        for number in range(3, 11):
            with self.subTest(page=number):
                page = translated[number - 1]
                mapped = [index for block in page['blocks'] for index in block['source_lines']]
                self.assertEqual(sorted(mapped), list(range(len(source[number - 1]['lines']))))
                self.assertEqual(len(mapped), len(set(mapped)))
                text = ' '.join(block['fa'] for block in page['blocks'])
                self.assertNotIn('مسیله', text)
                self.assertIsNone(re.search(r'[\u064b-\u065fئأإءۀ]', text))

    def test_flattened_vectors_keep_the_source_values(self):
        page = json.loads((ROOT / 'content/translations/spring-2026/s05.json').read_text())['pages'][9]
        literal = {tuple(block['source_lines']): block['fa'] for block in page['blocks'] if block['kind'] == 'literal'}
        self.assertEqual([literal[(index,)] for index in (8, 9, 10, 11)], ['1 1', '0 0', '0 0', '1 1'])
        self.assertEqual(literal[(14,)], '1 1 0 0 0 0 1 1')


if __name__ == '__main__':
    unittest.main()
