"""Small immutable artifacts and download integrity, without weights or GPU."""

import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "model_fetch", ROOT / "models/fetch_artifacts.py"
)
fetcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetcher)


class WholeFileResponse(io.BytesIO):
    status = 200
    headers = {}


class SourceModelArtifacts(unittest.TestCase):
    def test_local_graphs_and_references_match_catalog_hashes(self):
        catalog = json.loads((ROOT / "models/source-models.json").read_text())
        for model in catalog["models"]:
            self.assertTrue(model["action_title_fa"].startswith("اجرای "))
            for artifact in model["artifacts"].values():
                if artifact["url"].startswith("./"):
                    target = ROOT / "models" / urlparse(artifact["url"]).path[2:]
                    payload = target.read_bytes()
                    self.assertEqual(len(payload), artifact["bytes"])
                    self.assertEqual(
                        hashlib.sha256(payload).hexdigest(), artifact["sha256"]
                    )

    def test_whole_file_200_response_is_valid_for_small_metadata(self):
        payload = b"published configuration"
        with tempfile.TemporaryDirectory() as folder:
            with (
                patch.object(fetcher, "CACHE", Path(folder)),
                patch.object(
                    fetcher.urllib.request,
                    "urlopen",
                    return_value=WholeFileResponse(payload),
                ),
            ):
                item = {
                    "file": "config.json",
                    "url": "https://example.test/config.json",
                    "size": len(payload),
                    "sha256": hashlib.sha256(payload).hexdigest(),
                }
                fetcher.fetch(item)
                self.assertEqual((Path(folder) / "config.json").read_bytes(), payload)

    def test_bad_checksum_never_becomes_a_usable_artifact(self):
        payload = b"incorrect checkpoint metadata"
        with tempfile.TemporaryDirectory() as folder:
            with (
                patch.object(fetcher, "CACHE", Path(folder)),
                patch.object(
                    fetcher.urllib.request,
                    "urlopen",
                    return_value=WholeFileResponse(payload),
                ),
            ):
                item = {
                    "file": "config.json",
                    "url": "https://example.test/config.json",
                    "size": len(payload),
                    "sha256": "0" * 64,
                }
                with self.assertRaisesRegex(ValueError, "checksum"):
                    fetcher.fetch(item)
                self.assertFalse((Path(folder) / "config.json").exists())
                self.assertFalse((Path(folder) / "config.json.part").exists())
