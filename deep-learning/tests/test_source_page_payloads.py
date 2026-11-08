"""Page payload identity and compatibility with the complete reader payload."""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from source_page_payloads import build_page_payloads


class SourcePagePayloadsTest(unittest.TestCase):
    def setUp(self):
        self.payload = {'term_id': 'spring-2026', 'session_id': 's04',
                        'source': {'sha256': 'a' * 64, 'page_count': 2, 'url': 'https://example.org/a.pdf'},
                        'reference_targets': {'https://example.org': '/reference'},
                        'pages': [{'number': 1, 'blocks': [{'fa': 'صفحه اول'}], 'source_layout': {'lines': []}},
                                  {'number': 2, 'blocks': [], 'image_text': [{'fa': 'شکل'}]}]}
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def test_reconstructs_existing_page_records_and_hashes_exact_bytes(self):
        manifest = build_page_payloads(self.root, self.payload)
        directory = self.root / 'source-pages/spring-2026/s04'
        self.assertEqual(json.loads((directory / 'manifest.json').read_bytes()), manifest)
        self.assertEqual(manifest['reference_targets'], self.payload['reference_targets'])
        self.assertEqual(manifest['source'], self.payload['source'])
        self.assertEqual([entry['title'] for entry in manifest['pages']], ['صفحه اول', ''])
        for entry, original in zip(manifest['pages'], self.payload['pages']):
            data = (directory / entry['file']).read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(), entry['sha256'])
            record = json.loads(data)
            self.assertEqual(record['page'], original)
            self.assertEqual(record['source_sha256'], self.payload['source']['sha256'])
        before = [entry['sha256'] for entry in manifest['pages']]
        self.payload['pages'][1]['image_text'][0]['fa'] = 'تغییر شکل'
        updated = build_page_payloads(self.root, self.payload)
        self.assertEqual(before[0], updated['pages'][0]['sha256'])
        self.assertNotEqual(before[1], updated['pages'][1]['sha256'])

    def test_invalid_identity_and_page_sequences_are_rejected(self):
        for key, value in [('term_id', '../other'), ('session_id', 's04/..')]:
            with self.assertRaises(ValueError):
                build_page_payloads(self.root, {**self.payload, key: value})
        with self.assertRaises(ValueError):
            build_page_payloads(self.root, {**self.payload, 'pages': list(reversed(self.payload['pages']))})
        with self.assertRaises(ValueError):
            build_page_payloads(self.root, {**self.payload, 'source': {'sha256': 'bad', 'page_count': 2}})


if __name__ == '__main__':
    unittest.main()
