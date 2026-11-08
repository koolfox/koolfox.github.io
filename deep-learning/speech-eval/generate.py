"""Create a local blinded listening set from two existing Piper models."""
import argparse
import hashlib
import html
import json
import random
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent
NAMES = ("fa_IR-gyro-medium", "fa_IR-mana-medium")
SEED = 2606


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    root = args.output.resolve()
    if root.exists() and any(root.iterdir()):
        raise SystemExit("Output directory must be empty")
    from piper import PiperVoice, SynthesisConfig

    rows = json.loads((HERE / "sentences.json").read_text(encoding="utf-8"))
    if len(rows) != 20:
        raise ValueError("Expected 20 sentences")
    root.mkdir(parents=True, exist_ok=True)
    audio = root / "blind"
    audio.mkdir()
    voices, hashes = {}, {}
    for name in NAMES:
        model = args.models / (name + ".onnx")
        config = args.models / (name + ".onnx.json")
        for file in (model, config):
            with file.open("rb") as source:
                hashes[file.name] = hashlib.file_digest(source, "sha256").hexdigest()
        voices[name] = PiperVoice.load(str(model), config_path=str(config))
    rng = random.Random(SEED)
    order = list(range(len(rows)))
    rng.shuffle(order)
    key, sections = [], []
    for number, index in enumerate(order, 1):
        row = rows[index]
        names = list(NAMES)
        rng.shuffle(names)
        players = []
        for label, name in zip(("A", "B"), names):
            filename = f"{number:02}-{label}.wav"
            with wave.open(str(audio / filename), "wb") as wav:
                voices[name].synthesize_wav(row["spoken"], wav, syn_config=SynthesisConfig(length_scale=1.1, noise_scale=0.55, noise_w_scale=0.65))
            key.append({"item": number, "label": label, "sentence_index": index + 1, "voice": name})
            players.append(f'<label dir="ltr">{label} <audio controls preload="none" src="{filename}"></audio></label>')
        sections.append(f'<section><h2>جمله {number}</h2><p>{html.escape(row["display"])}</p>{"".join(players)}<p>طبیعی بودن، وضوح و تلفظ هر نمونه را جداگانه از ۱ تا ۵ ارزیابی کنید.</p></section>')
    document = '<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>آزمون شنیداری</title><style>body{font:18px system-ui;max-width:760px;margin:auto;padding:1rem;line-height:1.7}section{border-bottom:1px solid #ccc;padding:1rem 0}label{display:flex;gap:1rem;align-items:center;margin:.5rem 0}audio{max-width:85%}</style><h1>آزمون شنیداری</h1><p>ترتیب A و B در هر جمله مستقل است. ابتدا هر دو نمونه را گوش کنید و امتیازها را ثبت کنید.</p>' + ''.join(sections) + '</html>'
    (audio / "index.html").write_text(document, encoding="utf-8")
    (root / "answer-key-private.json").write_text(json.dumps({"seed": SEED, "sha256": hashes, "key": key}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {len(key)} local samples in {audio}; answer key is separate.")


if __name__ == "__main__":
    main()
