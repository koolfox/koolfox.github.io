import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('build_slide_pages', Path(__file__).resolve().parents[1] / 'scripts' / 'build_slide_pages.py')
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class PageVerificationTests(unittest.TestCase):
    def test_detects_changed_page(self):
        with tempfile.TemporaryDirectory() as tmp:
            page = Path(tmp) / '001.json'
            page.write_bytes(b'page')
            manifest = {'pages': [{'file': page.name, 'sha256': hashlib.sha256(b'page').hexdigest()}]}
            self.assertEqual(MODULE.verify_manifest(Path(tmp), manifest), 1)
            page.write_bytes(b'changed')
            with self.assertRaises(ValueError):
                MODULE.verify_manifest(Path(tmp), manifest)


if __name__ == '__main__':
    unittest.main()
