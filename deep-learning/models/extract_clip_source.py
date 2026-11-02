"""Recover the exact source-page dog photograph from the CC-BY paper PDF.

Run after fetch_artifacts.py, using pypdf >= 6. Preserve its separate attribution.
"""

import hashlib
import io
import json
from pathlib import Path

from PIL import Image
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
metadata = json.loads((ROOT / "models/references/clip-image-source.json").read_text())
pdf = ROOT / "results/model-validation/cache/clip/radford21a.pdf"
assert hashlib.sha256(pdf.read_bytes()).hexdigest() == metadata["source_pdf_sha256"]
page = PdfReader(pdf).pages[metadata["source_pdf_page"] - 1]
image = next(
    item for item in page.images if item.name.split(".")[0] == metadata["image_object"]
)
output = io.BytesIO()
Image.open(io.BytesIO(image.data)).convert("RGB").save(output, format="PNG")
assert hashlib.sha256(output.getvalue()).hexdigest() == metadata["source_image_sha256"]
(ROOT / "models/references/clip-source-dog.png").write_bytes(output.getvalue())
