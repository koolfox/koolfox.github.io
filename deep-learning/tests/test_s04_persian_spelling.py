"""Keep the lesson's Persian copy consistent with its spelling convention."""
import json
import re
import unittest
from pathlib import Path


class LessonFourSpellingTests(unittest.TestCase):
    def test_copy_has_no_hamza_diacritics_or_misspelled_problem(self):
        root = Path(__file__).resolve().parents[1]
        path = root / 'content/translations/spring-2026/s04.json'
        pages = json.loads(path.read_text(encoding='utf-8'))['pages']
        self.assertEqual(len(pages), 61)
        for page in pages:
            for group in ('blocks', 'image_text'):
                for item in page.get(group, []):
                    text = item.get('fa', '')
                    with self.subTest(page=page['number'], group=group, text=text[:30]):
                        self.assertNotRegex(text, re.compile(r'[ءأإؤئۀ\u064b-\u065f\u0670]'))
                        self.assertNotIn('مسیله', text)
                        self.assertNotIn('تاحدی', text)
