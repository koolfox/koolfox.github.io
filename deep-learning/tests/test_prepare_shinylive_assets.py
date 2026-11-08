import hashlib
import io
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import prepare_shinylive_assets as assets


def bundle(name='shinylive-0.10.15/shinylive/pyodide/pyodide-lock.json', kind=tarfile.REGTYPE):
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode='w:gz') as tar:
        data = b'{"info": {"version": "test"}}'
        item = tarfile.TarInfo(name)
        item.type = kind
        item.size = len(data) if kind == tarfile.REGTYPE else 0
        if kind == tarfile.SYMTYPE:
            item.linkname = '../../outside'
        tar.addfile(item, io.BytesIO(data) if item.size else None)
    return output.getvalue()


class PrepareAssetsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.data = bundle()
        self.sha = hashlib.sha256(self.data).hexdigest()

    def test_download_falls_back_verifies_and_reuses_cache(self):
        calls = []
        def opener(request, timeout):
            calls.append(request.full_url)
            if 'first' in request.full_url:
                raise OSError('unavailable')
            return io.BytesIO(self.data)
        path = self.root / 'asset.tar.gz'
        assets.obtain_archive(path, ('https://first', 'https://second'), self.sha, len(self.data), opener)
        self.assertEqual(calls, ['https://first', 'https://second'])
        self.assertTrue(assets.valid_archive(path, self.sha, len(self.data)))
        assets.obtain_archive(path, (), self.sha, len(self.data), opener)
        self.assertEqual(len(calls), 2)
        assets.install_archive(path, self.root / 'cache')
        self.assertTrue((self.root / 'cache/shinylive-0.10.15/shinylive/pyodide/pyodide-lock.json').is_file())
        with self.assertRaises(FileExistsError):
            assets.install_archive(path, self.root / 'cache')

    @patch('prepare_shinylive_assets.time.sleep')
    def test_bad_hash_never_replaces_existing_archive(self, _sleep):
        path = self.root / 'asset.tar.gz'
        path.write_bytes(b'old')
        with self.assertRaises(RuntimeError):
            assets.obtain_archive(path, ('https://bad',), '0' * 64, len(self.data),
                                  lambda request, timeout: io.BytesIO(self.data))
        self.assertEqual(path.read_bytes(), b'old')

    def test_extraction_refuses_traversal_and_links(self):
        for data in (bundle('../outside'), bundle('shinylive-0.10.15/link', tarfile.SYMTYPE)):
            path = self.root / 'bad.tar.gz'
            path.write_bytes(data)
            with self.assertRaises(ValueError):
                assets.install_archive(path, self.root / 'cache')
            self.assertFalse((self.root / 'outside').exists())
            self.assertFalse((self.root / 'cache/shinylive-0.10.15').exists())


if __name__ == '__main__':
    unittest.main()
