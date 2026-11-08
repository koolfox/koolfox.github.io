"""Check reviewed speech records before a training manifest is used."""

import argparse
import hashlib
import json
import wave
from pathlib import Path


def validate(manifest: Path, audio_root: Path) -> list[str]:
    errors = []
    seen_audio = {}
    seen_text = {}
    root = audio_root.resolve()
    count = 0
    with manifest.open(encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            count += 1
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                errors.append(f"line {line_number}: invalid JSON")
                continue
            label = str(item.get("id") or f"line {line_number}")
            split = item.get("split")
            if split not in ("train", "validation", "test"):
                errors.append(f"{label}: invalid split")
            for field in ("spoken_text_fa", "speaker_id", "rights", "audio_path", "audio_sha256"):
                if not isinstance(item.get(field), str) or not item[field].strip():
                    errors.append(f"{label}: missing {field}")
            if item.get("review_status") != "approved" or item.get("rights") in (None, "review_required"):
                errors.append(f"{label}: review or rights not approved")
            if item.get("pronunciation_reviewed") is not True:
                errors.append(f"{label}: pronunciation not reviewed")
            text = item.get("spoken_text_fa")
            if isinstance(text, str) and text.strip():
                key = " ".join(text.split())
                if key in seen_text and seen_text[key] != split:
                    errors.append(f"{label}: transcript appears in more than one split")
                seen_text[key] = split
            relative = item.get("audio_path")
            if not isinstance(relative, str) or not relative.strip():
                continue
            path = (root / relative).resolve()
            if not path.is_relative_to(root) or not path.is_file():
                errors.append(f"{label}: audio path missing or outside dataset")
                continue
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest != item.get("audio_sha256"):
                errors.append(f"{label}: audio hash mismatch")
            if digest in seen_audio and seen_audio[digest] != split:
                errors.append(f"{label}: audio appears in more than one split")
            seen_audio[digest] = split
            try:
                with wave.open(str(path), "rb") as audio:
                    if audio.getnframes() <= 0 or audio.getframerate() <= 0:
                        errors.append(f"{label}: empty audio")
            except (wave.Error, EOFError):
                errors.append(f"{label}: invalid WAV")
    if not count:
        errors.append("manifest has no records")
    return errors


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--audio-root", required=True, type=Path)
    args = parser.parse_args()
    problems = validate(args.manifest, args.audio_root)
    if problems:
        for problem in problems:
            print(problem)
        raise SystemExit(1)
    print("Manifest checks passed; human listening and scientific review are still required.")
