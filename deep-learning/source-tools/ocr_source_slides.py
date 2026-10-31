"""Find possible English labels absent from PDF text. Never auto-approve OCR."""

import concurrent.futures, json, re, subprocess, tempfile
from pathlib import Path
import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data/raw/danna/slide-ocr"
OUTPUT.mkdir(parents=True, exist_ok=True)


def normalized(s):
    return re.sub(r"\W+", "", s).casefold()


def process(path):
    source = json.loads(path.read_text())
    pdf = pdfium.PdfDocument(
        str(ROOT / source["source"]["local_url"].removeprefix("/deep-learning/"))
    )
    child = subprocess.Popen(
        ["/tmp/dl-source-ocr"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        text=True,
        bufsize=1,
    )
    pages = []
    try:
        with tempfile.TemporaryDirectory(prefix="dl-page-ocr-") as folder:
            image = Path(folder) / "page.png"
            for record, page in zip(source["pages"], pdf, strict=True):
                page.render(scale=1.6).to_pil().save(image)
                child.stdin.write(json.dumps({"path": str(image)}) + "\n")
                child.stdin.flush()
                result = json.loads(child.stdout.readline())
                assert "error" not in result, record["number"]
                original = normalized(" ".join(record["lines"]))
                candidates = []
                for row in result["rows"]:
                    key = normalized(row["text"])
                    if row["confidence"] < 0.5 or not key or key in original:
                        continue
                    if not re.search(r"[A-Za-z]{2}|[=+×∑∫]", row["text"]):
                        continue
                    row["verified"] = False
                    candidates.append(row)
                pages.append({"number": record["number"], "candidates": candidates})
        out = {
            "session_id": source["session_id"],
            "source_sha256": source["source"]["sha256"],
            "ocr": "macOS Vision; unverified candidates only",
            "pages": pages,
        }
        (OUTPUT / path.name).write_text(
            json.dumps(out, ensure_ascii=False, indent=2) + "\n"
        )
        print(
            source["session_id"],
            "OCR ready:",
            sum(len(p["candidates"]) for p in pages),
            "candidates",
            flush=True,
        )
    finally:
        child.stdin.close()
        child.wait()


files = sorted((ROOT / "content/source-slides/spring-2022").glob("*.json"))
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    list(pool.map(process, files))
