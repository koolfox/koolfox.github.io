import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "prepare_speech_text.py"
SPEC = importlib.util.spec_from_file_location("prepare_speech_text", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class SpeechTextPreparationTests(unittest.TestCase):
    def test_no_duplicate_leakage_or_fabricated_audio(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            document = {"term_id": "spring-2026", "session_id": "s01", "pages": [
                {"number": 1, "blocks": [{"kind": "text", "fa": "آموزش مدل"},
                                          {"kind": "reference", "fa": "https://example.com"}]},
                {"number": 2, "blocks": [{"kind": "text", "fa": "آموزش مدل"}]},
            ]}
            (root / "s01.json").write_text(json.dumps(document), encoding="utf-8")
            output = root / "result.jsonl"
            self.assertEqual(MODULE.prepare(root, output), (2, 1))
            item = json.loads(output.read_text(encoding="utf-8"))
            self.assertIsNone(item["audio_path"])
            self.assertIsNone(item["phonemes"])
            self.assertEqual(item["review_status"], "pending")
            with self.assertRaises(FileExistsError):
                MODULE.prepare(root, output)


if __name__ == "__main__":
    unittest.main()
