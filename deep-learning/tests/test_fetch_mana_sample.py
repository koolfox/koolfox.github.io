import importlib.util
import json
import tempfile
import unittest
import wave
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "fetch_mana_sample.py"
SPEC = importlib.util.spec_from_file_location("fetch_mana_sample", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ManaSampleTests(unittest.TestCase):
    def test_sample_keeps_transcript_and_audio_metadata(self):
        info = {"sha": "revision", "cardData": {"license": "cc0-1.0"}}
        response = {"rows": [{"row_idx": 0, "row": {"audio": [0.0, 0.5, -0.5], "samplerate": 16000,
                    "file name": "a.wav", "transcript": "سلام", "match quality": "HIGH"}}]}
        with tempfile.TemporaryDirectory() as tmp, patch.object(MODULE, "read_json", side_effect=[info, response]):
            output = Path(tmp) / "sample"
            MODULE.fetch(output, 1)
            metadata = json.loads((output / "manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(metadata["records"][0]["transcript"], "سلام")
            self.assertEqual(metadata["records"][0]["samples"], 3)
            with wave.open(str(output / "000000.wav")) as audio:
                self.assertEqual((audio.getnchannels(), audio.getframerate(), audio.getnframes()), (1, 16000, 3))
            with self.assertRaises(FileExistsError):
                MODULE.fetch(output, 1)


if __name__ == "__main__":
    unittest.main()
