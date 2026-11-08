"""Fetch a small public Mana-TTS sample for an offline data-format check."""

import argparse
import array
import datetime
import hashlib
import json
import math
import sys
import urllib.parse
import urllib.request
import wave
from pathlib import Path


DATASET = "MahtaFetrat/Mana-TTS"


def read_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=60) as response:
        return json.load(response)


def fetch(output: Path, limit: int) -> None:
    if not 1 <= limit <= 10:
        raise ValueError("limit must be between 1 and 10")
    if output.exists():
        raise FileExistsError(output)
    info = read_json("https://huggingface.co/api/datasets/" + DATASET)
    if info.get("cardData", {}).get("license") != "cc0-1.0" or not info.get("sha"):
        raise ValueError("dataset license or revision needs review")
    query = urllib.parse.urlencode({"dataset": DATASET, "config": "default", "split": "train", "offset": 0, "length": limit})
    response = read_json("https://datasets-server.huggingface.co/rows?" + query)
    rows = response.get("rows", [])
    if len(rows) != limit:
        raise ValueError("requested number of records was not returned")
    output.mkdir(parents=True)
    manifest = []
    for item in rows:
        row = item["row"]
        audio = row["audio"]
        rate = row["samplerate"]
        if not isinstance(audio, list) or not audio or not isinstance(rate, (int, float)) or rate <= 0 or not float(rate).is_integer():
            raise ValueError("unsupported audio format")
        if any(not isinstance(value, (int, float)) or not math.isfinite(value) or abs(value) > 1 for value in audio):
            raise ValueError("audio samples must be finite and within [-1, 1]")
        pcm = array.array("h", (round(value * 32767) for value in audio))
        if sys.byteorder != "little":
            pcm.byteswap()
        filename = f'{item["row_idx"]:06d}.wav'
        with wave.open(str(output / filename), "wb") as target:
            target.setnchannels(1)
            target.setsampwidth(2)
            target.setframerate(int(rate))
            target.writeframes(pcm.tobytes())
        manifest.append({"row": item["row_idx"], "original_file": row["file name"], "transcript": row["transcript"],
                         "wav": filename, "wav_sha256": hashlib.sha256((output / filename).read_bytes()).hexdigest(),
                         "sample_rate": int(rate), "samples": len(audio), "source_quality": row.get("match quality")})
    metadata = {"dataset": DATASET, "source": "https://huggingface.co/datasets/" + DATASET,
                "observed_revision": info["sha"], "license": "cc0-1.0", "split": "train",
                "retrieved_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "records": manifest}
    (output / "manifest.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--limit", type=int, default=1)
    args = parser.parse_args()
    fetch(args.output, args.limit)
    print(f"Saved {args.limit} public samples to {args.output}; this is not a trained model.")
