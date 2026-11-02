"""Independent Pillow and official Rust-tokenizer fixtures for CLIP."""

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
from transformers import CLIPTokenizerFast

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "results/model-validation/cache/clip"
REFERENCE = ROOT / "models/references"
REFERENCE.mkdir(exist_ok=True)
tokenizer = CLIPTokenizerFast.from_pretrained(CACHE, local_files_only=True)
texts = [
    "A photo of a plane.",
    "A photo of a car.",
    "A photo of a dog.",
    "A photo of a bird.",
    "A café, a dog & a bird.",
    "  A photo\n of a DOG. ",
    "سلام دنیا!",
    "🙂 a cat's toy <|endoftext|>",
]
cases = [
    {
        "text": text,
        "ids": tokenizer(text)["input_ids"],
        "tokens": tokenizer.convert_ids_to_tokens(tokenizer(text)["input_ids"]),
    }
    for text in texts
]
(REFERENCE / "clip-tokenizer-cases.json").write_text(
    json.dumps(cases, ensure_ascii=False, indent=2) + "\n"
)
previews = []
for width, height in [(641, 479), (127, 311), (513, 512), (256, 256)]:
    y, x = np.indices((height, width))
    rgba = np.full((height, width, 4), 255, dtype=np.uint8)
    for channel in range(3):
        rgba[:, :, channel] = ((x * 13 + y * 7 + channel * 31) ^ (x * y % 251)) % 256
    size = (
        (int(width * 224 / height), 224)
        if width > height
        else (224, int(height * 224 / width))
    )
    image = Image.fromarray(rgba[:, :, :3]).resize(size, Image.Resampling.BICUBIC)
    left, top = (size[0] - 224) // 2, (size[1] - 224) // 2
    preview = np.full((224, 224, 4), 255, dtype=np.uint8)
    preview[:, :, :3] = np.asarray(image.crop((left, top, left + 224, top + 224)))
    (CACHE / f"preview-{width}x{height}.rgba").write_bytes(preview.tobytes())
    previews.append(
        {
            "width": width,
            "height": height,
            "preview_sha256": hashlib.sha256(preview.tobytes()).hexdigest(),
        }
    )
(REFERENCE / "clip-image-preprocess-cases.json").write_text(
    json.dumps(previews, indent=2) + "\n"
)
