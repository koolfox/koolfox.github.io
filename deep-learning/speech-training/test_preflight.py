import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


DIRECTORY = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("prepare_kaggle", DIRECTORY / "prepare_kaggle.py")
PREPARE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PREPARE)


class BundleTests(unittest.TestCase):
    def test_private_offline_empty_sources_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "bundle"
            PREPARE.prepare("test-owner", target)
            meta = json.loads((target / "kernel-metadata.json").read_text())
            self.assertTrue(meta["is_private"])
            self.assertFalse(meta["enable_internet"])
            self.assertTrue(meta["enable_gpu"])
            for key in ("dataset_sources", "competition_sources", "kernel_sources", "model_sources"):
                self.assertEqual(meta[key], [])
            self.assertEqual((target / "preflight.py").read_bytes(), (DIRECTORY / "preflight.py").read_bytes())
            with self.assertRaises(FileExistsError):
                PREPARE.prepare("test-owner", target)

    def test_invalid_owner_rejected_without_creating_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "bundle"
            with self.assertRaises(ValueError):
                PREPARE.prepare("../other", target)
            self.assertFalse(target.exists())


if __name__ == "__main__":
    unittest.main()
