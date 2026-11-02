"""Regenerate independent Pillow image fixtures under ignored results."""

from pathlib import Path
from PIL import Image
import numpy as np
import json
import hashlib

r = Path("deep-learning/results/model-validation")
cases = []
vit_cases = []
for width, height in [(641, 479), (127, 311), (513, 512), (256, 256)]:
    y, x = np.indices((height, width))
    rgba = np.zeros((height, width, 4), dtype=np.uint8)
    for c in range(3):
        rgba[:, :, c] = ((x * 13 + y * 7 + c * 31) ^ (x * y % 251)) % 256
    rgba[:, :, 3] = 255
    raw = rgba.tobytes()
    (r / f"image-{width}x{height}.rgba").write_bytes(raw)
    ratio = 256 / min(width, height)
    size = (
        (round(width * ratio), 256) if width > height else (256, round(height * ratio))
    )
    im = Image.fromarray(rgba[:, :, :3]).resize(size, Image.Resampling.BILINEAR)
    left = size[0] // 2 - 112
    top = size[1] // 2 - 112
    crop = np.asarray(im.crop((left, top, left + 224, top + 224)))
    preview = np.full((224, 224, 4), 255, dtype=np.uint8)
    preview[:, :, :3] = crop
    (r / f"image-{width}x{height}-preview.rgba").write_bytes(preview.tobytes())
    vit_rgb = np.asarray(
        Image.fromarray(rgba[:, :, :3]).resize((224, 224), Image.Resampling.BILINEAR)
    )
    vit_preview = np.full((224, 224, 4), 255, dtype=np.uint8)
    vit_preview[:, :, :3] = vit_rgb
    (r / f"vit-{width}x{height}-preview.rgba").write_bytes(vit_preview.tobytes())
    vit_tensor = (vit_rgb.transpose(2, 0, 1).astype(np.float32) / 255 - 0.5) / 0.5
    vit_tensor.astype("<f4").tofile(r / f"vit-{width}x{height}-tensor.bin")
    vit_cases.append(
        {
            "width": width,
            "height": height,
            "preview_sha256": hashlib.sha256(vit_preview.tobytes()).hexdigest(),
        }
    )

    tensor = np.transpose(crop, (2, 0, 1)).astype(np.float32)
    tensor = (
        (tensor / 255 - np.array([0.485, 0.456, 0.406])[:, None, None])
        / np.array([0.229, 0.224, 0.225])[:, None, None]
    ).astype("<f4")
    tensor.tofile(r / f"image-{width}x{height}-tensor.bin")
    cases.append(
        {
            "width": width,
            "height": height,
            "preview_sha256": hashlib.sha256(preview.tobytes()).hexdigest(),
        }
    )
(r / "image-preprocess-cases.json").write_text(json.dumps(cases, indent=2) + "\n")

(r / "vit-image-preprocess-cases.json").write_text(
    json.dumps(vit_cases, indent=2) + "\n"
)
