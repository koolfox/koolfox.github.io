"""Geometry must remain bound to both the PDF and the translated page content."""
import copy
import hashlib
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import test_source_reader as fixtures
from extract_source_layout import rgb, translation_identity
from source_reader import source_reader_page


class SourceLayoutTests(unittest.TestCase):
    def setUp(self):
        self.fixture = fixtures.SourceReaderTests()
        self.fixture.setUp()
        f = self.fixture
        self.path = f.root / f'content/source-layout/{f.term_id}/s01.json'
        self.path.parent.mkdir(parents=True)
        pages = []
        for source, translated in zip(f.source['pages'], f.translation['pages']):
            pages.append({'number': source['number'], 'source_text_sha256': source['source_text_sha256'],
                          'translation_sha256': translation_identity(translated),
                          'width': 960, 'height': 540, 'lines': [],
                          'unmatched_lines': list(range(len(source['lines']))),
                          'images': [], 'visual_reviewed': False})
        self.layout = {'schema_version': 1, 'term_id': f.term_id, 'session_id': 's01',
                       'source_sha256': f.source['source']['sha256'], 'pages': pages,
                       'extractor': {'name':'pdfplumber', 'version':'fixture'}}
        self.flush()

    def tearDown(self):
        self.fixture.tearDown()

    def flush(self):
        self.path.write_text(json.dumps(self.layout))

    def test_layout_is_attached_without_claiming_visual_review(self):
        page = self.fixture.load()['pages'][0]
        self.assertEqual(page['source_layout']['unmatched_lines'], [0, 1])
        self.assertFalse(page['source_layout']['visual_reviewed'])

    def test_translation_correction_invalidates_geometry(self):
        self.fixture.translation['pages'][0]['blocks'][0]['fa'] = 'عنوان اصلاح‌شده'
        self.fixture.flush()
        with self.assertRaisesRegex(ValueError, 'Stale layout translation'):
            self.fixture.load()

    def test_pdf_identity_change_invalidates_geometry(self):
        self.layout['source_sha256'] = '0' * 64
        self.flush()
        with self.assertRaisesRegex(ValueError, 'Stale layout source PDF'):
            self.fixture.load()

    def test_overlapping_line_inventory_is_rejected(self):
        self.layout['pages'][0]['lines'] = [{'index': 0, 'match': 'exact-line', 'rect': [.1, .1, .5, .2], 'font_size': 24}]
        self.flush()
        with self.assertRaisesRegex(ValueError, 'Incomplete source layout line inventory'):
            self.fixture.load()

    def test_off_page_or_zero_area_regions_are_rejected(self):
        page = self.layout['pages'][0]
        page['unmatched_lines'] = [1]
        page['lines'] = [{'index': 0, 'match': 'exact-line', 'rect': [.1, 1, .5, 1], 'font_size': 24}]
        self.flush()
        with self.assertRaisesRegex(ValueError, 'Invalid source line geometry'):
            self.fixture.load()

    def test_guessed_geometry_match_is_rejected(self):
        page = self.layout['pages'][0]
        page['unmatched_lines'] = [1]
        page['lines'] = [{'index': 0, 'match': 'approximate', 'rect': [.1,.1,.5,.2], 'font_size': 24}]
        self.flush()
        with self.assertRaisesRegex(ValueError, 'Unverified source geometry match'):
            self.fixture.load()

    def test_coverage_cannot_claim_more_native_lines_than_are_mapped(self):
        self.layout['pages'][0]['coverage'] = {'matched_lines': 2}
        self.flush()
        with self.assertRaisesRegex(ValueError, 'Incorrect source layout coverage'):
            self.fixture.load()

    def test_identity_includes_tables_image_labels_and_hidden_blocks(self):
        page = self.fixture.translation['pages'][0]
        before = translation_identity(page)
        for field in ('blocks', 'image_text', 'tables'):
            changed = copy.deepcopy(page)
            changed.setdefault(field, []).append({'test': 'change'})
            self.assertNotEqual(before, translation_identity(changed))

    def test_pdf_gray_rgb_and_cmyk_colors_preserve_white(self):
        for color in (1, (1,), (1, 1, 1), (0, 0, 0, 0)):
            self.assertEqual(rgb(color), '#ffffff')
        self.assertEqual(rgb((0,)), '#000000')
        self.assertEqual(rgb((1, 0, 0)), '#ff0000')

    def test_2026_controls_use_only_authored_page_examples_and_questions(self):
        fixture = fixtures.Spring2026SourceReaderTests()
        fixture.setUp()
        try:
            payload = fixture.load()
            unit = {"session_id": "s01", "source_page": 1,
                    "questions": [{"source_page": 1}],
                    "activities": {"pages": [{"number": 1, "question_ids": ["q1"]},
                                               {"number": 2, "question_ids": []}]},
                    "source_examples": [{"pages": [2], "questions": [{"id": "q2"}]}]}
            html = source_reader_page({"id": fixture.term_id}, {"id": "s01", "workshop": unit},
                                      {"supervisor_fa": "دکتر نگار مجمع"}, payload)
            parser = fixtures.ReaderParser()
            parser.feed(html)
            config = json.loads(parser.config)
            self.assertEqual(config["interactivePages"], [2])
            self.assertEqual(config["questionPages"], [1])
        finally:
            fixture.tearDown()

    def test_all_spring_2026_pages_have_explicit_geometry_inventory(self):
        root = Path(__file__).resolve().parents[1]
        pages = 0
        for path in (root / 'content/source-layout/spring-2026').glob('*.json'):
            document = json.loads(path.read_text())
            for page in document['pages']:
                pages += 1
                mapped = {line['index'] for line in page['lines']}
                unmatched = set(page['unmatched_lines'])
                self.assertFalse(mapped & unmatched)
                self.assertEqual(mapped | unmatched, set(range(page['coverage']['source_lines'])))
                self.assertEqual(len(page['translation_sha256']), 64)
        self.assertEqual(pages, 1303)


if __name__ == '__main__':
    unittest.main()
