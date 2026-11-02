"""HTTP failures must not turn into a false availability claim."""
import sys
from pathlib import Path
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from check_slide_links import check, normalize


class SlideLinkTests(unittest.TestCase):
    def test_access_restriction_is_not_a_missing_article(self):
        for code, status in [(403, 'unverified'), (429, 'unverified'), (404, 'missing'), (410, 'missing')]:
            with self.subTest(code=code), patch('check_slide_links.urlopen', side_effect=HTTPError('https://example.org', code, '', {}, None)):
                self.assertEqual(check('https://example.org')['status'], status)

    def test_pdf_hyphen_and_unbalanced_reference_punctuation(self):
        self.assertEqual(normalize('https://example.org/first\ufffesecond)'), 'https://example.org/first-second')
        self.assertEqual(normalize('https://example.org/article_(math)'), 'https://example.org/article_(math)')
