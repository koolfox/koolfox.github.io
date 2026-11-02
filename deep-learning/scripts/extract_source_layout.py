"""Extract hash-bound source geometry; never infer untranslated figure text.

Only unique exact normalized source lines receive coordinates. Repeated or
unmatched lines remain explicit exceptions; raw geometry is not visual approval.
"""
import argparse
from collections import Counter, defaultdict
from concurrent.futures import ProcessPoolExecutor
import hashlib
import importlib.metadata
import json
from pathlib import Path
import statistics
import unicodedata
import re

ROOT = Path(__file__).resolve().parents[1]


def normalized(value):
    return " ".join(unicodedata.normalize("NFKC", value).split())


def compact(value):
    return "".join(normalized(value).split())


def translation_identity(page):
    content = {key: page.get(key, []) for key in ("blocks", "image_text", "tables")}
    return hashlib.sha256(json.dumps(content, ensure_ascii=False, sort_keys=True,
                                    separators=(",", ":")).encode()).hexdigest()


def placement_needed(block):
    return block["kind"] != "not_visible" and bool(re.search(r"[\u0620-\u063f\u0641-\u064a\u0671-\u06d3]", block["fa"]))


def rect(objects, width, height):
    return [round(max(0, min(1, value)), 8) for value in (
        min(o["x0"] for o in objects) / width,
        min(o["top"] for o in objects) / height,
        max(o["x1"] for o in objects) / width,
        max(o["bottom"] for o in objects) / height,
    )]


def rgb(value):
    if isinstance(value, (int, float)):
        value = [value] * 3
    if isinstance(value, (list, tuple)) and len(value) == 1:
        value = list(value) * 3
    if isinstance(value, (list, tuple)) and len(value) == 4:
        c, m, y, k = value
        value = [(1 - channel) * (1 - k) for channel in (c, m, y)]
    if not isinstance(value, (list, tuple)) or len(value) != 3:
        return None
    return "#" + "".join(f"{max(0, min(255, round(n * 255))):02x}" for n in value)


def geometry(line, width, height):
    chars = sorted(line["chars"], key=lambda char: char["x0"])
    sizes = [float(char["size"]) for char in chars if char["text"].strip()]
    size = statistics.median(sizes) if sizes else line["bottom"] - line["top"]
    chunks, current = [], []
    for char in chars:
        if current and char["x0"] - current[-1]["x1"] > max(size * .85, 7):
            chunks.append(current)
            current = []
        current.append(char)
    if current:
        chunks.append(current)
    colors = [rgb(char.get("non_stroking_color")) for char in chars if char["text"].strip()]
    color = Counter(colors).most_common(1)[0][0] if colors else None
    result = {"rect": rect([line], width, height), "font_size": round(size, 4)}
    if color:
        result["color"] = color
    if len(chunks) > 1:
        result["parts"] = []
        for chunk in chunks:
            colors = [rgb(char.get("non_stroking_color")) for char in chunk if char["text"].strip()]
            part = {"text": "".join(char["text"] for char in chunk).strip(),
                    "rect": rect(chunk, width, height),
                    "font_size": round(statistics.median(float(char["size"]) for char in chunk), 4)}
            color = Counter(colors).most_common(1)[0][0] if colors else None
            if color:
                part["color"] = color
            result["parts"].append(part)
    return result


def pdfium_geometry(page):
    """Read the canonical extraction engine's native character positions in order."""
    import ctypes
    import pypdfium2 as pdfium
    text = page.get_textpage()
    height = page.get_height()
    rows, current = [], []
    try:
        for index in range(text.count_chars()):
            code = pdfium.raw.FPDFText_GetUnicode(text.raw, index)
            if 0xDC00 <= code <= 0xDFFF:
                continue
            if 0xD800 <= code <= 0xDBFF and index + 1 < text.count_chars():
                low = pdfium.raw.FPDFText_GetUnicode(text.raw, index + 1)
                char = chr(0x10000 + ((code - 0xD800) << 10) + low - 0xDC00) if 0xDC00 <= low <= 0xDFFF else ""
            else:
                char = text.get_text_range(index, 1) if code else ""
            if char in {"\r", "\n"}:
                if current:
                    rows.append(current)
                    current = []
                continue
            if not char:
                continue
            left, bottom, right, top = text.get_charbox(index, loose=True)
            rgba = [ctypes.c_uint() for _ in range(4)]
            ok = pdfium.raw.FPDFText_GetFillColor(text.raw, index, *[ctypes.byref(v) for v in rgba])
            current.append({"text": char, "x0": left, "x1": right, "top": height-top,
                            "bottom": height-bottom,
                            "size": pdfium.raw.FPDFText_GetFontSize(text.raw, index),
                            "non_stroking_color": [v.value/255 for v in rgba[:3]] if ok else None})
        if current:
            rows.append(current)
        return [{"text": "".join(c["text"] for c in chars).strip(), "chars": chars,
                 "x0": min(c["x0"] for c in chars), "x1": max(c["x1"] for c in chars),
                 "top": min(c["top"] for c in chars), "bottom": max(c["bottom"] for c in chars)}
                for chars in rows if "".join(c["text"] for c in chars).strip()]
    finally:
        text.close()


def extract_session(args):
    import pdfplumber
    import pypdfium2 as pdfium
    root, term, session, destination = args
    source = json.loads((root / f"content/source-slides/{term}/{session}.json").read_text())
    translated = json.loads((root / f"content/translations/{term}/{session}.json").read_text())
    pdf_path = root / f"assets/danna/{term}/{session}.pdf"
    digest = hashlib.sha256(pdf_path.read_bytes()).hexdigest()
    if source["source"]["sha256"] != digest or translated["source_sha256"] != digest:
        raise ValueError(f"{session}: source PDF identity differs")
    pages, counts = [], Counter()
    with pdfplumber.open(pdf_path) as pdf, pdfium.PdfDocument(pdf_path) as canonical:
        if len(pdf.pages) != len(source["pages"]):
            raise ValueError(f"{session}: page count differs")
        for original, translation, page in zip(source["pages"], translated["pages"], pdf.pages):
            if hashlib.sha256("\n".join(original["lines"]).encode()).hexdigest() != original["source_text_sha256"]:
                raise ValueError(f"{session}: source text identity differs")
            source_counts = Counter(map(normalized, original["lines"]))
            compact_counts = Counter(map(compact, original["lines"]))
            extracted = defaultdict(list)
            sequences = []
            for line in page.extract_text_lines(return_chars=True):
                extracted[normalized(line["text"])].append(line)
                chars, letters = [], []
                for char in sorted(line["chars"], key=lambda char: char["x0"]):
                    for letter in unicodedata.normalize("NFKC", char["text"]):
                        if not letter.isspace():
                            letters.append(letter)
                            chars.append(char)
                sequences.append(("".join(letters), chars))
            lines, unmatched = [], []
            for index, text in enumerate(original["lines"]):
                key = normalized(text)
                candidates = extracted.get(key, [])
                if key and source_counts[key] == 1 and len(candidates) == 1:
                    lines.append({"index": index, "match": "exact-line", **geometry(candidates[0], page.width, page.height)})
                else:
                    token = compact(text)
                    matches = []
                    if token and compact_counts[token] == 1:
                        for letters, chars in sequences:
                            start = letters.find(token)
                            if start >= 0 and letters.find(token, start + 1) < 0:
                                selected = chars[start:start + len(token)]
                                matches.append({"x0": min(c["x0"] for c in selected),
                                    "top": min(c["top"] for c in selected), "x1": max(c["x1"] for c in selected),
                                    "bottom": max(c["bottom"] for c in selected), "chars": selected})
                    if len(matches) == 1:
                        lines.append({"index": index, "match": "exact-glyph-sequence", **geometry(matches[0], page.width, page.height)})
                    else:
                        unmatched.append(index)
            canonical_page = canonical[original["number"]-1]
            canonical_lines = pdfium_geometry(canonical_page)
            canonical_page.close()
            # Exact sequence equality disambiguates repeated labels using canonical line order.
            if [normalized(line["text"]) for line in canonical_lines] == [normalized(line) for line in original["lines"]]:
                existing = {line["index"]: line for line in lines}
                for index, native in enumerate(canonical_lines):
                    if index not in existing:
                        existing[index] = {"index": index, "match": "canonical-character-sequence",
                                           **geometry(native, page.width, page.height)}
                lines = [existing[index] for index in sorted(existing)]
                unmatched = []
            else:
                native_counts = Counter(normalized(line["text"]) for line in canonical_lines)
                native = {normalized(line["text"]): line for line in canonical_lines}
                existing = {line["index"]: line for line in lines}
                for index in unmatched[:]:
                    key = normalized(original["lines"][index])
                    if source_counts[key] == 1 and native_counts[key] == 1:
                        existing[index] = {"index": index, "match": "canonical-exact-line",
                                           **geometry(native[key], page.width, page.height)}
                        unmatched.remove(index)
                lines = [existing[index] for index in sorted(existing)]
            off_page_lines = [line["index"] for line in lines if line["rect"][0] >= line["rect"][2]
                              or line["rect"][1] >= line["rect"][3]]
            lines = [line for line in lines if line["index"] not in off_page_lines]
            unmatched = sorted(set(unmatched + off_page_lines))
            media = [{"rect": rect([image], page.width, page.height),
                      "width": image.get("srcsize", [None, None])[0],
                      "height": image.get("srcsize", [None, None])[1]} for image in page.images]
            media = [image for image in media if image["rect"][0] < image["rect"][2]
                     and image["rect"][1] < image["rect"][3]]
            vectors = []
            for drawing in [*page.curves, *page.rects, *page.lines]:
                item = dict(drawing)
                if (item["x1"]-item["x0"]) * (item["bottom"]-item["top"]) >= page.width*page.height*.9:
                    continue
                padding = max(.5, float(item.get("linewidth") or 0)/2)
                item.update(x0=item["x0"]-padding, x1=item["x1"]+padding,
                            top=item["top"]-padding, bottom=item["bottom"]+padding)
                vectors.append(item)
            graphics = [{"rect": rect(vectors, page.width, page.height)}] if vectors else []
            graphics = [item for item in graphics if item["rect"][0]<item["rect"][2]
                        and item["rect"][1]<item["rect"][3]]
            row = {"number": original["number"], "source_text_sha256": original["source_text_sha256"],
                   "width": float(page.width), "height": float(page.height),
                   "translation_sha256": translation_identity(translation),
                   "lines": lines, "unmatched_lines": unmatched, "images": media, "graphics": graphics,
                   "off_page_lines": off_page_lines,
                   "visual_reviewed": False}
            indices = {line["index"] for line in lines}
            needed = {i for block in translation["blocks"] if placement_needed(block)
                      for i in block["source_lines"]}
            row["coverage"] = {"source_lines": len(original["lines"]), "matched_lines": len(lines),
                "translated_native_lines": len(needed), "mapped_translated_native_lines": len(needed & indices),
                "unpositioned_image_labels": len(translation["image_text"]),
                "semantic_tables": len(translation.get("tables", []))}
            counts.update({"pages": 1, "source_lines": len(original["lines"]), "matched_lines": len(lines),
                           "translated_native_lines": len(needed), "mapped_translated_native_lines": len(needed & indices)})
            pages.append(row)
            page.close()
    document = {"schema_version": 1, "term_id": term, "session_id": session,
                "source_sha256": digest,
                "extractor": {"name": "pdfplumber+pypdfium2", "version": importlib.metadata.version("pdfplumber"),
                              "canonical_version": str(pdfium.PYPDFIUM_INFO)},
                "pages": pages}
    destination.mkdir(parents=True, exist_ok=True)
    path = destination / f"{session}.json"
    path.write_text(json.dumps(document, ensure_ascii=False, separators=(",", ":")) + "\n")
    return {"session": session, **counts}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--term", default="spring-2026")
    parser.add_argument("--session", action="append")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    destination = args.output or ROOT / f"content/source-layout/{args.term}"
    sessions = args.session or [path.stem for path in sorted((ROOT / f"content/source-slides/{args.term}").glob("s*.json"))]
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        results = list(pool.map(extract_session, [(ROOT, args.term, s, destination) for s in sessions]))
    report = {"sessions": results, "total": {key: sum(r.get(key, 0) for r in results)
             for key in ("pages", "source_lines", "matched_lines", "translated_native_lines", "mapped_translated_native_lines")}}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report["total"]))


if __name__ == "__main__":
    main()
