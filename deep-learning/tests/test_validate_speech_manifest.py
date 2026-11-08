import hashlib
import importlib.util
import json
import tempfile
import unittest
import wave
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "validate_speech_manifest.py"
SPEC = importlib.util.spec_from_file_location("validate_speech_manifest", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class SpeechManifestTests(unittest.TestCase):
    def test_rejects_split_leakage_and_unreviewed_records(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            audio_path = root / "sample.wav"
            with wave.open(str(audio_path), "wb") as out:
                out.setnchannels(1)
                out.setsampwidth(2)
                out.setframerate(16000)
                out.writeframes(b"\x00\x00\x01\x00")
            digest = hashlib.sha256(audio_path.read_bytes()).hexdigest()
            base = {"id": "a", "split": "train", "spoken_text_fa": "سلام", "speaker_id": "s1",
                    "rights": "cc0", "audio_path": "sample.wav", "audio_sha256": digest,
                    "review_status": "approved", "pronunciation_reviewed": True}
            manifest = root / "manifest.jsonl"
            manifest.write_text(json.dumps(base) + "\n", encoding="utf-8")
            self.assertEqual(MODULE.validate(manifest, root), [])
            other = {**base, "id": "b", "split": "test", "review_status": "pending"}
            manifest.write_text(json.dumps(base) + "\n" + json.dumps(other) + "\n", encoding="utf-8")
            errors = MODULE.validate(manifest, root)
            self.assertTrue(any("transcript appears" in error for error in errors))
            self.assertTrue(any("audio appears" in error for error in errors))
            self.assertTrue(any("review or rights" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
