import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


DIRECTORY = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("prepare_kaggle", DIRECTORY / "prepare_kaggle.py")
PREPARE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PREPARE)
TOKEN_SPEC = importlib.util.spec_from_file_location("tokenizer_probe", DIRECTORY / "tokenizer_probe.py")
TOKEN = importlib.util.module_from_spec(TOKEN_SPEC)
TOKEN_SPEC.loader.exec_module(TOKEN)
AUDIT_SPEC = importlib.util.spec_from_file_location("audit_pinned_sources", DIRECTORY / "audit_pinned_sources.py")
AUDIT = importlib.util.module_from_spec(AUDIT_SPEC)
AUDIT_SPEC.loader.exec_module(AUDIT)


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

    def test_tokenizer_probe_rejects_unexpected_file_before_loading_library(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "tokenizer.json"
            path.write_text("{}")
            with self.assertRaisesRegex(ValueError, "SHA-256"):
                TOKEN.probe(path)

    def test_static_audit_rejects_network_and_unsafe_torch_load(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "bad.py"
            path.write_text("import socket\ntorch.load('model.pth')\nexec('pass')\n")
            findings = AUDIT.audit_python(path)
            self.assertTrue(any("blocked import" in entry for entry in findings))
            self.assertTrue(any("weights_only=True" in entry for entry in findings))
            self.assertTrue(any("blocked call" in entry for entry in findings))


if __name__ == "__main__":
    unittest.main()
