import importlib.util
import hashlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


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
STAGE_SPEC = importlib.util.spec_from_file_location("stage_public_assets", DIRECTORY / "stage_public_assets.py")
STAGE = importlib.util.module_from_spec(STAGE_SPEC)
STAGE_SPEC.loader.exec_module(STAGE)
PUBLIC_SPEC = importlib.util.spec_from_file_location("prepare_public_stage", DIRECTORY / "prepare_public_stage.py")
PUBLIC = importlib.util.module_from_spec(PUBLIC_SPEC)
PUBLIC_SPEC.loader.exec_module(PUBLIC)


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

    def test_download_requires_exact_size_and_hash(self):
        with tempfile.TemporaryDirectory() as tmp:
            payload = b"public sample"
            path = Path(tmp) / "file.bin"
            with patch.object(STAGE.urllib.request, "urlopen", return_value=io.BytesIO(payload)):
                STAGE.download("https://example.org/file", path, hashlib.sha256(payload).hexdigest(), len(payload))
            self.assertEqual(path.read_bytes(), payload)
            with patch.object(STAGE.urllib.request, "urlopen", return_value=io.BytesIO(payload)):
                with self.assertRaisesRegex(ValueError, "integrity"):
                    STAGE.download("https://example.org/file", Path(tmp) / "wrong.bin", "0" * 64, len(payload))

    def test_public_asset_stage_has_no_attached_user_data(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "bundle"
            PUBLIC.prepare("test-owner", target)
            meta = json.loads((target / "kernel-metadata.json").read_text())
            self.assertTrue(meta["is_private"])
            self.assertTrue(meta["enable_internet"])
            self.assertFalse(meta["enable_gpu"])
            for key in ("dataset_sources", "competition_sources", "kernel_sources", "model_sources"):
                self.assertEqual(meta[key], [])


if __name__ == "__main__":
    unittest.main()
