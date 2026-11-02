"""Extract exact-line typography from the hash-pinned course PDFs."""

import argparse
from collections import Counter, defaultdict
from concurrent.futures import ProcessPoolExecutor
import hashlib
import importlib.metadata
import json
import math
from pathlib import Path
import re
import unicodedata


ROOT = Path(__file__).resolve().parents[1]
DOMINANCE = 0.7


def normalized(text):
    return " ".join(unicodedata.normalize("NFKC", text).split())


def validate_source(source, pdf_path):
    digest = hashlib.sha256(pdf_path.read_bytes()).hexdigest()
    if digest != source["source"]["sha256"]:
        raise ValueError(f"Source PDF hash differs: {pdf_path.name}")
    pages = source["pages"]
    if len(pages) != source["source"]["page_count"]:
        raise ValueError("Source page count differs")
    for number, page in enumerate(pages, 1):
        expected = hashlib.sha256("\n".join(page["lines"]).encode()).hexdigest()
        if page["number"] != number or page["source_text_sha256"] != expected:
            raise ValueError(f"Source line identity differs: page {number}")


def rgb_color(value):
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        value = (value,)
    if not isinstance(value, (list, tuple)) or len(value) not in (1, 3):
        return None
    if not all(
        isinstance(v, (int, float))
        and not isinstance(v, bool)
        and math.isfinite(v)
        and 0 <= v <= 1
        for v in value
    ):
        return None
    channels = value * 3 if len(value) == 1 else value
    return tuple(round(v * 255) for v in channels)


def font_weights(reader):
    candidates = defaultdict(set)
    seen = set()

    def visit_resources(resources):
        if resources is None:
            return
        resources = resources.get_object()
        if id(resources) in seen:
            return
        seen.add(id(resources))
        fonts_in_resources = resources.get("/Font")
        references = (
            fonts_in_resources.get_object().values() if fonts_in_resources else []
        )
        for reference in references:
            font = reference.get_object()
            descendants = font.get("/DescendantFonts", [])
            if hasattr(descendants, "get_object"):
                descendants = descendants.get_object()
            fonts = [font] + [value.get_object() for value in descendants]
            for entry in fonts:
                descriptor = entry.get("/FontDescriptor")
                if not descriptor:
                    continue
                descriptor = descriptor.get_object()
                weight = descriptor.get("/FontWeight")
                if not isinstance(weight, (int, float)) or not 100 <= weight <= 1000:
                    continue
                names = [
                    entry.get("/BaseFont"),
                    descriptor.get("/FontName"),
                    font.get("/BaseFont"),
                ]
                for name in names:
                    if name:
                        candidates[str(name).lstrip("/")].add(float(weight))
        objects = resources.get("/XObject")
        if objects:
            for reference in objects.get_object().values():
                visit_resources(reference.get_object().get("/Resources"))

    for page in reader.pages:
        visit_resources(page.get("/Resources"))
    return {
        name: next(iter(values))
        for name, values in candidates.items()
        if len(values) == 1
    }


def is_bold(font, weights):
    return weights.get(font, 0) >= 600 or bool(re.search("bold|demi", font, re.I))


def is_italic(font):
    return bool(re.search("italic|oblique", font, re.I))


def characters(chars):
    result = []
    for char in chars:
        text = unicodedata.normalize("NFKC", char["text"])
        for letter in text:
            if not letter.isspace():
                result.append(
                    {
                        "text": letter,
                        "font": char.get("fontname", ""),
                        "color": rgb_color(char.get("non_stroking_color")),
                    }
                )
    return result


def hex_color(color):
    return "#" + "".join(f"{channel:02x}" for channel in color)


def colored_accents(text, chars, weights, dominant):
    expanded, positions = [], []
    for index, letter in enumerate(text):
        for value in unicodedata.normalize("NFKC", letter):
            if not value.isspace():
                expanded.append(value)
                positions.append(index)
    if "".join(expanded) != "".join(char["text"] for char in chars):
        return []
    result = []
    start = 0
    while start < len(chars):
        color = chars[start]["color"]
        end = start + 1
        while end < len(chars) and chars[end]["color"] == color:
            end += 1
        if (
            color is not None
            and color != dominant
            and max(color) - min(color) >= 24
            and end - start >= 2
        ):
            snippet = text[positions[start] : positions[end - 1] + 1]
            snippet = re.sub(r"^[•◦▪●–—-]\s+(?=[A-Za-z])", "", snippet)
            if len("".join(snippet.split())) >= 2 and text.count(snippet) == 1:
                accent = {"text": snippet, "color": hex_color(color)}
                if (
                    sum(is_bold(c["font"], weights) for c in chars[start:end])
                    / (end - start)
                    >= DOMINANCE
                ):
                    accent["bold"] = True
                result.append(accent)
        start = end
    return result


def line_style(text, raw_chars, weights):
    chars = characters(raw_chars)
    if not chars:
        return {}
    result = {}
    color, count = Counter(char["color"] for char in chars).most_common(1)[0]
    dominant = color if count / len(chars) >= DOMINANCE else None
    if dominant is not None and not (max(dominant) <= 5 or min(dominant) >= 250):
        result["color"] = hex_color(dominant)
    if sum(is_bold(char["font"], weights) for char in chars) / len(chars) >= DOMINANCE:
        result["bold"] = True
    if sum(is_italic(char["font"]) for char in chars) / len(chars) >= DOMINANCE:
        result["italic"] = True
    accents = colored_accents(text, chars, weights, dominant)
    if accents:
        result["accents"] = accents
    return result


def match_lines(source_lines, extracted, weights):
    source_counts = Counter(normalized(line) for line in source_lines)
    extracted_by_text = defaultdict(list)
    for line in extracted:
        extracted_by_text[normalized(line["text"])].append(line)
    result, matched = [], 0
    for index, text in enumerate(source_lines):
        key = normalized(text)
        candidates = extracted_by_text.get(key, [])
        if not key or source_counts[key] != 1 or len(candidates) != 1:
            continue
        matched += 1
        style = line_style(text, candidates[0]["chars"], weights)
        if style:
            result.append({"index": index, **style})
    return result, matched


def extract_session(arguments):
    root, term, session, destination = arguments
    import pdfplumber
    from pypdf import PdfReader

    source = json.loads(
        (root / f"content/source-slides/{term}/{session}.json").read_text()
    )
    pdf_path = root / f"assets/danna/{term}/{session}.pdf"
    if source["session_id"] != session or source["term_id"] != term:
        raise ValueError("Source semester/session identity differs")
    validate_source(source, pdf_path)
    weights = font_weights(PdfReader(pdf_path))
    pages, total, matched, styled = [], 0, 0, 0
    with pdfplumber.open(pdf_path) as pdf:
        if len(pdf.pages) != len(source["pages"]):
            raise ValueError("PDF and source page counts differ")
        for page, original in zip(pdf.pages, source["pages"]):
            styles, found = match_lines(
                original["lines"], page.extract_text_lines(return_chars=True), weights
            )
            pages.append(
                {
                    "number": original["number"],
                    "source_text_sha256": original["source_text_sha256"],
                    "lines": styles,
                }
            )
            total += len(original["lines"])
            matched += found
            styled += len(styles)
            page.close()
    document = {
        "schema_version": 1,
        "term_id": term,
        "session_id": session,
        "source_sha256": source["source"]["sha256"],
        "extractor": {
            "name": "pdfplumber+pypdf",
            "version": importlib.metadata.version("pdfplumber")
            + "+"
            + importlib.metadata.version("pypdf"),
        },
        "pages": pages,
    }
    destination.mkdir(parents=True, exist_ok=True)
    path = destination / f"{session}.json"
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(path)
    return {
        "session": session,
        "pages": len(pages),
        "source_lines": total,
        "matched_lines": matched,
        "styled_lines": styled,
        "fonts_with_descriptor_weights": len(weights),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--term", default="spring-2026")
    parser.add_argument("--sessions", nargs="+")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--jobs", type=int, default=4)
    args = parser.parse_args()
    if not re.fullmatch(r"(?:spring|fall)-\d{4}", args.term) or not 1 <= args.jobs <= 8:
        parser.error("Invalid semester or job count")
    sessions = args.sessions or [
        p.stem
        for p in sorted(
            (args.root / f"content/source-slides/{args.term}").glob("s*.json")
        )
    ]
    if not sessions or any(not re.fullmatch(r"s\d{2}", value) for value in sessions):
        parser.error("Invalid source sessions")
    output = args.output or args.root / f"content/source-typography/{args.term}"
    work = [(args.root, args.term, session, output) for session in sessions]
    with ProcessPoolExecutor(max_workers=args.jobs) as pool:
        results = list(pool.map(extract_session, work))
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
