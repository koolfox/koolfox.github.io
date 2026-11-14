"""Validate source-faithful translations and render the original/Persian reader shell.

The PDF's visible page is authoritative. A ``not_visible`` block records text in
its extraction layer that a reviewer found covered or clipped in the original.
Consumers must exclude those source-line indices from an English text fallback.
For a visible block with a partly occluded extraction line, ``visible_en`` is a
verified transcription of only its visible English. Consumers render this string
as text instead of the corresponding raw lines; it never changes their hashes.
Validation establishes provenance and completeness, not scientific correctness.
"""

import hashlib
import json
import re
import unicodedata
from copy import deepcopy
from html import escape
from pathlib import Path

from source_catalog import ROOT, require, valid_url

TERM = "spring-2022"
SUPPORTED_TERMS = frozenset({"spring-2022", "spring-2026"})
TERM_TITLES = {"spring-2022": "بهار ۲۰۲۲", "spring-2026": "بهار ۲۰۲۶"}
BASE = "/deep-learning"
BLOCK_KINDS = {"heading", "text", "bullet", "math", "reference", "literal", "not_visible"}
SHA256 = re.compile(r"[0-9a-f]{64}")
SESSION = re.compile(r"s[0-9]{2}")
PLACEHOLDER = re.compile(
    r"(?:todo|tbd|pending|translation pending|coming soon|placeholder|"
    r"ترجمه(?:ٔ)? در حال آماده[‌ ]سازی(?: است)?|"
    r"ترجمه(?:ٔ)? این صفحه در حال آماده[‌ ]سازی(?: است)?|"
    r"در حال ترجمه|به[‌ ]زودی|ترجمه نشده(?: است)?)",
    re.IGNORECASE,
)


def _nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def _specific_reason(value):
    return _nonempty(value) and len(value.strip()) >= 16 and len(value.split()) >= 3


def _regular_bytes(path):
    require(
        not any(p.is_symlink() for p in (path, *path.parents)),
        f"Symlink source-reader input: {path}",
    )
    try:
        return path.read_bytes()
    except OSError as error:
        raise ValueError(f"Unreadable source-reader input: {path}") from error


def _document(path):
    try:
        document = json.loads(_regular_bytes(path))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError(f"Invalid source-reader JSON: {path}") from error
    require(isinstance(document, dict), f"Expected a JSON object: {path}")
    return document


def _identity(document, session, label, term_id):
    require(
        type(document.get("schema_version")) is int
        and document["schema_version"] == 1,
        f"{session}: unsupported {label} schema",
    )
    require(
        document.get("term_id") == term_id and document.get("session_id") == session,
        f"{session}: {label} identity mismatch",
    )


def _validated_term(term_id):
    require(
        isinstance(term_id, str) and term_id in SUPPORTED_TERMS,
        "Unsupported source-reader term",
    )
    return term_id


def _limits(value, location):
    """Keep explicit source-legibility limits; never infer or silently add one."""
    if isinstance(value, str):
        require(_specific_reason(value), f"{location}: image limit needs a specific reason")
        return
    values = value if isinstance(value, list) else [value]
    require(bool(values), f"{location}: empty image_text_limits")
    for item in values:
        require(isinstance(item, dict), f"{location}: invalid image_text_limits")
        reason = item.get("reason_fa", item.get("reason"))
        require(_specific_reason(reason), f"{location}: image limit needs a specific reason")
        if "verified" in item:
            require(item["verified"] is True, f"{location}: unverified image limit")


def _review_flag(page, name, location, require_reviewed):
    value = page.get(name, False)
    require(type(value) is bool, f"{location}: {name} must be boolean")
    if require_reviewed:
        require(value is True, f"{location}: {name} is pending")
    return value


def _translation_page(source_page, translated_page, session, require_reviewed):
    location = f"{session}/page {source_page['number']}"
    require(isinstance(translated_page, dict), f"{location}: invalid translation page")
    require(
        type(translated_page.get("number")) is int
        and translated_page["number"] == source_page["number"],
        f"{location}: translation page order mismatch",
    )
    require(
        translated_page.get("source_text_sha256") == source_page["source_text_sha256"],
        f"{location}: stale translation page hash",
    )
    text_reviewed = _review_flag(translated_page, "text_reviewed", location, require_reviewed)
    image_reviewed = _review_flag(
        translated_page, "image_text_reviewed", location, require_reviewed
    )
    blocks = translated_page.get("blocks")
    require(isinstance(blocks, list), f"{location}: blocks must be a list")
    covered = []
    for block in blocks:
        require(isinstance(block, dict), f"{location}: invalid translation block")
        require(
            isinstance(block.get("kind"), str) and block["kind"] in BLOCK_KINDS,
            f"{location}: invalid block kind",
        )
        indices = block.get("source_lines")
        require(isinstance(indices, list) and bool(indices), f"{location}: missing source_lines")
        require(
            all(type(i) is int and 0 <= i < len(source_page["lines"]) for i in indices),
            f"{location}: source_lines must be valid integer indices",
        )
        require(len(indices) == len(set(indices)), f"{location}: duplicate source line")
        covered.extend(indices)
        if block["kind"] == "not_visible":
            require(block.get("fa") == "", f"{location}: not_visible must have empty fa")
            require(block.get("verified") is True, f"{location}: unverified not_visible block")
            require(
                _specific_reason(block.get("reason_fa")),
                f"{location}: not_visible needs a specific reason_fa",
            )
        else:
            require(_nonempty(block.get("fa")), f"{location}: empty Persian translation")
            phrase = block["fa"].strip().strip(".،؛:!… ")
            require(not PLACEHOLDER.fullmatch(phrase), f"{location}: placeholder translation")
        if "visible_en" in block:
            require(
                block["kind"] != "not_visible",
                f"{location}: not_visible cannot have visible_en",
            )
            require(
                _nonempty(block["visible_en"]),
                f"{location}: visible_en must be a nonempty string",
            )
            require(
                block.get("verified") is True,
                f"{location}: unverified visible_en override",
            )
            require(
                _specific_reason(block.get("reason_fa")),
                f"{location}: visible_en needs a specific reason_fa",
            )
        if "latex" in block:
            require(_nonempty(block["latex"]), f"{location}: empty LaTeX")
    require(
        len(covered) == len(set(covered)), f"{location}: duplicate source line across blocks"
    )
    require(
        sorted(covered) == list(range(len(source_page["lines"]))),
        f"{location}: incomplete source-line coverage",
    )
    image_text = translated_page.get("image_text")
    require(isinstance(image_text, list), f"{location}: image_text must be a list")
    for label in image_text:
        require(isinstance(label, dict), f"{location}: invalid image text")
        require(
            _nonempty(label.get("en")) and _nonempty(label.get("fa")),
            f"{location}: empty image text",
        )
        if "latex" in label:
            require(_nonempty(label["latex"]), f"{location}: empty image LaTeX")
        if "verified" in label:
            require(type(label["verified"]) is bool, f"{location}: invalid image verification")
        if require_reviewed:
            require(label.get("verified") is True, f"{location}: unverified image text")
    if "image_text_limits" in translated_page:
        _limits(translated_page["image_text_limits"], location)
    require(
        bool(blocks) or bool(image_text) or "image_text_limits" in translated_page,
        f"{location}: empty page placeholder",
    )
    result = {
        "number": source_page["number"],
        "source_text_sha256": source_page["source_text_sha256"],
        "lines": deepcopy(source_page["lines"]),
        "blocks": deepcopy(blocks),
        "image_text": deepcopy(image_text),
        "image_text_reviewed": image_reviewed,
        "text_reviewed": text_reviewed,
    }
    navigation_title = translated_page.get("navigation_title")
    if navigation_title is not None:
        require(isinstance(navigation_title, str) and 0 < len(navigation_title) <= 100, f"{location}: invalid navigation title")
        result["navigation_title"] = navigation_title
    tables = translated_page.get("tables", [])
    require(isinstance(tables, list), f"{location}: invalid tables")
    used_labels = set()
    used_lines = set()
    for table in tables:
        require(isinstance(table, dict) and table.get("verified") is True,
                f"{location}: table needs visual verification")
        from_lines = "source_lines" in table
        require(not (from_lines and "image_text_indices" in table), f"{location}: ambiguous table anchor")
        indices = table.get("source_lines" if from_lines else "image_text_indices")
        used = used_lines if from_lines else used_labels
        size = len(source_page["lines"]) if from_lines else len(image_text)
        require(isinstance(indices, list) and indices and all(type(i) is int
                and 0 <= i < size and i not in used for i in indices)
                and len(indices) == len(set(indices)), f"{location}: invalid table labels")
        used.update(indices)
        if from_lines:
            for block in blocks:
                overlap = set(block["source_lines"]) & set(indices)
                require(not overlap or (overlap == set(block["source_lines"])
                        and block["kind"] != "not_visible"), f"{location}: table splits source block")
        headers, rows = table.get("headers"), table.get("rows")
        columns = len(headers) if isinstance(headers, list) and headers else table.get("column_count")
        require(isinstance(headers, list) and type(columns) is int and columns >= 2
                and all(isinstance(h, str) for h in headers)
                and isinstance(rows, list) and rows,
                f"{location}: invalid table headers or rows")
        occupied = [0] * columns
        for row_number, cells in enumerate(rows):
            require(isinstance(cells, list) and cells, f"{location}: invalid table row")
            column = 0
            for cell in cells:
                while column < columns and occupied[column] > row_number:
                    column += 1
                if isinstance(cell, str):
                    colspan, rowspan = 1, 1
                else:
                    require(isinstance(cell, dict) and isinstance(cell.get("text"), str)
                            and type(cell.get("colspan", 1)) is int
                            and 1 <= cell.get("colspan", 1) <= columns
                            and type(cell.get("rowspan", 1)) is int
                            and 1 <= cell.get("rowspan", 1) <= len(rows) - row_number,
                            f"{location}: invalid table cell")
                    colspan, rowspan = cell.get("colspan", 1), cell.get("rowspan", 1)
                    if "image_rect" in cell:
                        rect = cell["image_rect"]
                        require(isinstance(rect, list) and len(rect) == 4
                                and all(type(v) in {int, float} and 0 <= v <= 1 for v in rect)
                                and rect[0] < rect[2] and rect[1] < rect[3]
                                and _nonempty(cell.get("image_alt")), f"{location}: invalid source image crop")
                require(column + colspan <= columns
                        and all(occupied[i] <= row_number for i in range(column, column + colspan)),
                        f"{location}: uneven table row")
                for i in range(column, column + colspan):
                    occupied[i] = row_number + rowspan
                column += colspan
            require(all(n > row_number for n in occupied), f"{location}: uneven table row")
        groups = table.get("groups", [])
        if groups:
            require(all(isinstance(g, dict) and _nonempty(g.get("text"))
                        and type(g.get("colspan")) is int and g["colspan"] > 0 for g in groups)
                    and sum(g["colspan"] for g in groups) == columns,
                    f"{location}: invalid table header groups")
    if tables:
        result["tables"] = deepcopy(tables)
    if "image_text_limits" in translated_page:
        result["image_text_limits"] = deepcopy(translated_page["image_text_limits"])
    return result


def apply_source_typography(root, term_id, session_id, catalog, pages):
    path = root / f"content/source-typography/{term_id}/{session_id}.json"
    if not path.exists():
        return
    data = _document(path)
    require(data.get("schema_version") == 1 and data.get("term_id") == term_id
            and data.get("session_id") == session_id
            and data.get("source_sha256") == catalog["sha256"], "Stale source typography identity")
    records = data.get("pages")
    require(isinstance(records, list) and len(records) == len(pages), "Incomplete source typography")
    for page, record in zip(pages, records):
        require(record.get("number") == page["number"]
                and record.get("source_text_sha256") == page["source_text_sha256"], "Stale typography page")
        entries = record.get("lines")
        require(isinstance(entries, list), "Invalid typography lines")
        styles = {}
        for entry in entries:
            index = entry.get("index")
            require(type(index) is int and 0 <= index < len(page["lines"])
                    and index not in styles, "Invalid typography line index")
            if "color" in entry:
                require(isinstance(entry["color"], str) and re.fullmatch(r"#[0-9a-fA-F]{6}", entry["color"]), "Invalid typography color")
            for flag in ("bold", "italic"):
                if flag in entry:
                    require(type(entry[flag]) is bool, "Invalid typography emphasis")
            accents = entry.get("accents", [])
            require(isinstance(accents, list), "Invalid typography accents")
            for accent in accents:
                require(isinstance(accent, dict) and _nonempty(accent.get("text"))
                        and isinstance(accent.get("color"), str)
                        and re.fullmatch(r"#[0-9a-fA-F]{6}", accent["color"]), "Invalid typography accent")
            styles[index] = entry
        for block in page["blocks"]:
            if block["kind"] == "not_visible":
                continue
            selected = [styles.get(index, {}) for index in block["source_lines"]]
            presentation = {}
            for key in ("color", "bold", "italic"):
                values = [style.get(key) for style in selected]
                if values and values[0] and all(value == values[0] for value in values):
                    presentation[key] = values[0]
            accents = [deepcopy(accent) for style in selected for accent in style.get("accents", [])]
            if accents:
                presentation["accents"] = accents
            if presentation:
                block["presentation"] = presentation


def validate_source_fragments(translation, geometry, page):
    """Bind manually aligned Persian chunks to exact native lines or glyph groups."""
    native = {line["index"]: line for line in geometry["lines"]}
    key = lambda text: "".join(unicodedata.normalize("NFKC", text).split())
    for block in translation["blocks"]:
        if "source_fragments" not in block:
            require("source_fragments_verified" not in block, "Source fragment review without fragments")
            continue
        fragments = block["source_fragments"]
        require(block.get("source_fragments_verified") is True
                and block["kind"] != "not_visible"
                and ("latex" not in block or block["kind"] == "math"),
                "Source fragments need verified visible text")
        require(isinstance(fragments, list) and bool(fragments), "Empty source fragments")
        seen = set()
        texts = []
        for fragment in fragments:
            require(isinstance(fragment, dict) and set(fragment) <= {"fa", "kind", "source_parts"}
                    and _nonempty(fragment.get("fa")) and fragment.get("kind", block["kind"]) in BLOCK_KINDS-{"not_visible"},
                    "Invalid source fragment")
            texts.append(fragment["fa"])
            refs = fragment.get("source_parts")
            require(isinstance(refs, list) and bool(refs), "Empty source fragment references")
            if "latex" in block:
                require(len(refs) == 1 and isinstance(refs[0], dict), "Invalid formula fragment")
                kind = fragment.get("kind", block["kind"])
                intact = kind == "literal" and key(fragment["fa"]) == key(refs[0].get("en", ""))
                connector = kind == "text" and key(refs[0].get("en", "")).upper() == "OR" and key(fragment["fa"]) == "یا"
                require(intact or connector, "Formula fragments must preserve native equations")
            for ref in refs:
                require(isinstance(ref, dict) and set(ref) <= {"line", "part", "en"}
                        and type(ref.get("line")) is int and ref["line"] in block["source_lines"]
                        and _nonempty(ref.get("en")), "Invalid source fragment reference")
                line = native.get(ref["line"])
                require(line is not None, "Source fragment geometry unavailable")
                part = ref.get("part", -1)
                require(type(part) is int and ("part" not in ref or 0 <= part < len(line.get("parts", []))),
                        "Invalid source glyph group")
                token = (ref["line"], part)
                require(token not in seen, "Duplicate source fragment reference")
                seen.add(token)
                expected = page["lines"][ref["line"]] if part == -1 else line["parts"][part]["text"]
                require(key(ref["en"]) == key(expected), "Source fragment text identity mismatch")
                if "visible_en" in block:
                    require(key(ref["en"]) in key(block["visible_en"]), "Source fragment includes occluded text")
        require("".join(texts) == block["fa"], "Source fragments must preserve the exact Persian text")
        for index in block["source_lines"]:
            selected = {part for line, part in seen if line == index}
            expected = set(range(len(native.get(index, {}).get("parts", []))))
            require(selected == {-1} or (bool(expected) and selected == expected),
                    "Incomplete source fragment partition")


def apply_source_layout(root, term_id, session_id, catalog, translations, pages):
    path = root / f"content/source-layout/{term_id}/{session_id}.json"
    if not path.exists():
        require(not any("source_fragments" in block or "source_fragments_verified" in block
                        for page in translations for block in page["blocks"]),
                "Source fragments require geometry metadata")
        return
    document = _document(path)
    _identity(document, session_id, "layout", term_id)
    require(document.get("source_sha256") == catalog["sha256"], "Stale layout source PDF")
    extractor = document.get("extractor")
    require(isinstance(extractor, dict) and extractor.get("name") in {"pdfplumber", "pdfplumber+pypdfium2"}
            and _nonempty(extractor.get("version")), "Missing source layout extractor provenance")
    source_pages = document.get("pages")
    require(isinstance(source_pages, list) and len(source_pages) == len(pages), "Layout page count mismatch")
    def rectangle(value):
        return isinstance(value, list) and len(value) == 4 and all(
            type(n) in {int, float} and 0 <= n <= 1 for n in value
        ) and value[0] < value[2] and value[1] < value[3]
    for geometry, translation, page in zip(source_pages, translations, pages):
        require(isinstance(geometry, dict) and geometry.get("number") == page["number"]
                and geometry.get("source_text_sha256") == page["source_text_sha256"], "Stale layout source page")
        content = {key: translation.get(key, []) for key in ("blocks", "image_text", "tables")}
        digest = hashlib.sha256(json.dumps(content, ensure_ascii=False, sort_keys=True,
                                           separators=(",", ":")).encode()).hexdigest()
        require(geometry.get("translation_sha256") == digest, "Stale layout translation blocks")
        require(all(type(geometry.get(key)) in {int, float} and 0 < geometry[key] <= 20000
                    for key in ("width", "height")), "Invalid source layout dimensions")
        lines = geometry.get("lines")
        require(isinstance(lines, list), "Invalid source layout lines")
        covered = set()
        for line in lines:
            index = line.get("index") if isinstance(line, dict) else None
            require(type(index) is int and 0 <= index < len(page["lines"]) and index not in covered
                    and rectangle(line.get("rect")), "Invalid source line geometry")
            covered.add(index)
            require(line.get("match") in {"exact-line", "exact-glyph-sequence", "canonical-character-sequence",
                                          "canonical-exact-line"}, "Unverified source geometry match")
            require(type(line.get("font_size")) in {int, float} and 0 < line["font_size"] <= 1000,
                    "Invalid source layout font size")
            require("color" not in line or re.fullmatch(r"#[0-9a-f]{6}", line["color"]),
                    "Invalid source layout color")
            for part in line.get("parts", []):
                require(isinstance(part, dict) and isinstance(part.get("text"), str)
                        and rectangle(part.get("rect"))
                        and ("color" not in part or re.fullmatch(r"#[0-9a-f]{6}", part["color"]))
                        and ("font_size" not in part or (type(part["font_size"]) in {int,float}
                             and 0 <= part["font_size"] <= 1000)), "Invalid source line part")
        unmatched = geometry.get("unmatched_lines")
        require(isinstance(unmatched, list) and all(type(i) is int for i in unmatched)
                and len(unmatched) == len(set(unmatched)) and not covered.intersection(unmatched)
                and covered.union(unmatched) == set(range(len(page["lines"]))),
                "Incomplete source layout line inventory")
        off_page = geometry.get("off_page_lines", [])
        require(isinstance(off_page, list) and len(off_page) == len(set(off_page))
                and set(off_page) <= set(unmatched), "Invalid off-page source inventory")
        coverage = geometry.get("coverage")
        if coverage is not None:
            needed = {i for block in translation["blocks"] if block["kind"] != "not_visible"
                      and re.search(r"[\u0620-\u063f\u0641-\u064a\u0671-\u06d3]", block["fa"])
                      for i in block["source_lines"]}
            expected = {"source_lines": len(page["lines"]), "matched_lines": len(covered),
                        "translated_native_lines": len(needed), "mapped_translated_native_lines": len(needed & covered),
                        "unpositioned_image_labels": len(translation.get("image_text", [])),
                        "semantic_tables": len(translation.get("tables", []))}
            require(coverage == expected, "Incorrect source layout coverage counts")
        for line in lines:
            for item in [line, *line.get("parts", [])]:
                accents = item.get("accents", [])
                require(isinstance(accents, list) and all(isinstance(accent, dict)
                        and _nonempty(accent.get("text")) and rectangle(accent.get("rect"))
                        and isinstance(accent.get("color"), str)
                        and re.fullmatch(r"#[0-9a-f]{6}", accent["color"])
                        for accent in accents), "Invalid source glyph colors")
        images = geometry.get("images")
        require(isinstance(images, list) and all(isinstance(image, dict) and rectangle(image.get("rect"))
                for image in images), "Invalid source image geometry")
        graphics = geometry.get("graphics", [])
        require(isinstance(graphics, list) and all(isinstance(item, dict) and rectangle(item.get("rect"))
                for item in graphics), "Invalid source vector bounds")
        frames = geometry.get("text_frames", [])
        require(isinstance(frames, list) and all(isinstance(frame, dict)
                and rectangle(frame.get("rect")) and rectangle(frame.get("inner_rect"))
                and frame["rect"][0] <= frame["inner_rect"][0] < frame["inner_rect"][2] <= frame["rect"][2]
                and frame["rect"][1] <= frame["inner_rect"][1] < frame["inner_rect"][3] <= frame["rect"][3]
                for frame in frames), "Invalid native text frame")
        require(type(geometry.get("visual_reviewed")) is bool, "Missing layout review state")
        validate_source_fragments(translation, geometry, page)
        page["source_layout"] = deepcopy(geometry)


def load_source_translation(session_id, root=ROOT, require_reviewed=True, term_id="spring-2022"):
    """Load one complete source/translation pair, rejecting stale or unreviewed data.

    ``root`` is the deep-learning directory, not the repository root. ``term_id``
    is explicit so identical session IDs from different years cannot be mixed. Passing
    ``require_reviewed=False`` permits explicit pending review flags for authoring;
    provenance, coverage, label content, and hidden-text safeguards still apply.
    """
    require(
        isinstance(session_id, str) and SESSION.fullmatch(session_id) is not None,
        "Invalid source-reader session ID",
    )
    require(type(require_reviewed) is bool, "require_reviewed must be boolean")
    term_id = _validated_term(term_id)
    root = Path(root)
    source = _document(root / f"content/source-slides/{term_id}/{session_id}.json")
    translated = _document(root / f"content/translations/{term_id}/{session_id}.json")
    _identity(source, session_id, "source", term_id)
    _identity(translated, session_id, "translation", term_id)
    catalog = source.get("source")
    require(isinstance(catalog, dict), f"{session_id}: missing source catalog record")
    require(
        isinstance(catalog.get("url"), str) and valid_url(catalog["url"]),
        f"{session_id}: invalid source URL",
    )
    require(
        isinstance(catalog.get("sha256"), str) and SHA256.fullmatch(catalog["sha256"]),
        f"{session_id}: invalid source SHA-256",
    )
    require(
        type(catalog.get("page_count")) is int and catalog["page_count"] > 0,
        f"{session_id}: invalid source page count",
    )
    require(
        translated.get("source_sha256") == catalog["sha256"],
        f"{session_id}: stale translation source SHA-256",
    )
    metadata = _document(root / f"data/metadata/{term_id}.json")
    term = metadata.get("term")
    require(isinstance(term, dict) and term.get("id") == term_id, "Invalid source metadata term")
    schedule = term.get("schedule")
    require(isinstance(schedule, list), "Invalid source metadata schedule")
    rows = [r for r in schedule if isinstance(r, dict) and r.get("id") == session_id]
    require(len(rows) == 1, f"{session_id}: missing or duplicate metadata session")
    slides = rows[0].get("slides")
    require(
        isinstance(slides, list) and len(slides) == 1 and isinstance(slides[0], dict),
        f"{session_id}: expected one original slide source",
    )
    recorded = slides[0]
    require(
        recorded.get("url") == catalog["url"] and recorded.get("sha256") == catalog["sha256"],
        f"{session_id}: source catalog differs from metadata identity",
    )
    require(
        type(recorded.get("page_count")) is int
        and recorded["page_count"] == catalog["page_count"],
        f"{session_id}: source page count differs from metadata",
    )
    # Each term has its own reviewed-original inventory; never infer authority
    # from another term or a cached local-slides helper.
    identity = _document(root / f"data/metadata/{term_id}-slide-identity.json")
    require(
        type(identity.get("schema_version")) is int
        and identity["schema_version"] == 1
        and identity.get("term_id") == term_id,
        f"{session_id}: invalid original-slide inventory identity",
    )
    records = identity.get("records")
    require(isinstance(records, list), "Invalid original-slide identity records")
    records = [r for r in records if isinstance(r, dict) and r.get("session_id") == session_id]
    relative = f"assets/danna/{term_id}/{session_id}.pdf"
    local_url = f"{BASE}/{relative}"
    require(
        catalog.get("local_url") == local_url,
        f"{session_id}: Invalid original-slide path",
    )
    require(
        len(records) == 1
        and records[0].get("local_file") == relative,
        f"{session_id}: Invalid original-slide path in identity inventory",
    )
    record = records[0]
    require(
        record.get("url") == catalog["url"]
        and record.get("sha256") == catalog["sha256"]
        and type(record.get("page_count")) is int
        and record["page_count"] == catalog["page_count"],
        f"{session_id}: source catalog differs from original-slide identity",
    )
    require(
        hashlib.sha256(_regular_bytes(root / relative)).hexdigest() == catalog["sha256"],
        f"{session_id}: original PDF bytes differ from reviewed source",
    )
    source_pages = source.get("pages")
    translated_pages = translated.get("pages")
    require(
        isinstance(source_pages, list) and len(source_pages) == catalog["page_count"],
        f"{session_id}: source page count mismatch",
    )
    require(
        isinstance(translated_pages, list) and len(translated_pages) == len(source_pages),
        f"{session_id}: translation page count mismatch",
    )
    combined = []
    for number, (page, translation) in enumerate(zip(source_pages, translated_pages), 1):
        require(isinstance(page, dict), f"{session_id}: invalid source page")
        require(
            type(page.get("number")) is int and page["number"] == number,
            f"{session_id}: source page order mismatch",
        )
        lines = page.get("lines")
        require(
            isinstance(lines, list) and all(isinstance(line, str) for line in lines),
            f"{session_id}/page {number}: invalid source lines",
        )
        digest = hashlib.sha256("\n".join(lines).encode("utf-8")).hexdigest()
        require(
            page.get("source_text_sha256") == digest,
            f"{session_id}/page {number}: stale source text hash",
        )
        combined.append(_translation_page(page, translation, session_id, require_reviewed))
    apply_source_typography(root, term_id, session_id, catalog, combined)
    apply_source_layout(root, term_id, session_id, catalog, translated["pages"], combined)
    notes_path = root / f'data/metadata/{term_id}-editorial-notes.json'
    if notes_path.exists():
        notes = _document(notes_path)
        require(type(notes.get('schema_version')) is int and notes['schema_version'] == 1
                and notes.get('term_id') == term_id and isinstance(notes.get('notes'), list),
                'Invalid editorial notes identity')
        for note in notes['notes']:
            require(isinstance(note, dict), 'Invalid editorial note')
            if note.get('session_id') != session_id:
                continue
            require(note.get('source_sha256') == catalog['sha256'], 'Stale editorial note source')
            number = note.get('page')
            require(type(number) is int and 1 <= number <= len(combined), 'Editorial note page outside source')
            require(note.get('verified') is True and note.get('kind') in {'arithmetic_correction', 'source_correction'}
                    and _specific_reason(note.get('fa')), 'Editorial note needs verified correction text')
            references = note.get('references', [])
            require(isinstance(references, list) and all(isinstance(ref, dict)
                    and _nonempty(ref.get('label_fa')) and isinstance(ref.get('url'), str)
                    and valid_url(ref['url']) for ref in references), 'Invalid editorial reference')
            combined[number-1].setdefault('editorial_notes', []).append(deepcopy(note))
    result = {
        "schema_version": 1,
        "term_id": term_id,
        "session_id": session_id,
        "source": deepcopy(catalog),
        "pages": combined,
    }
    link_path = root / f"data/metadata/{term_id}-links.json"
    result["reference_targets"] = {}
    if link_path.exists():
        checks = _document(link_path)
        require(checks.get("schema_version") == 1 and checks.get("term_id") == term_id,
                "Invalid reference check identity")
        for url, entry in checks.get("entries", {}).items():
            target = entry.get("target")
            if entry.get("status") not in {"reachable", "reviewed_migration"}:
                continue
            require(valid_url(url) and isinstance(target, str) and valid_url(target)
                    and _nonempty(entry.get("checked_at_utc")), "Invalid checked reference")
            if entry["status"] == "reviewed_migration":
                require(isinstance(entry.get("migration_evidence"), dict)
                        and entry["migration_evidence"].get("url") == target,
                        "Reference migration needs direct evidence")
            result["reference_targets"][url] = target
    return result


def source_reader_page(term, row, identity, payload, asset_revision=""):
    """Render the slide reader shell."""
    term_id = _validated_term(term.get("id"))
    session = row.get("id")
    require(
        isinstance(session, str) and SESSION.fullmatch(session)
        and payload.get("term_id") == term_id and payload.get("session_id") == session,
        "Source reader page identity mismatch",
    )
    require(
        identity.get("supervisor_fa") == "دکتر نگار مجمع",
        "Source reader local instructor identity mismatch",
    )
    source = payload.get("source", {})
    pdf = source.get("local_url", "")
    require(
        isinstance(pdf, str)
        and pdf == f"{BASE}/assets/danna/{term_id}/{session}.pdf",
        "Source reader original PDF path mismatch",
    )
    count = source.get("page_count")
    require(type(count) is int and count > 0, "Invalid reader page count")
    require(
        isinstance(payload.get("pages"), list) and len(payload["pages"]) == count,
        "Reader payload page count mismatch",
    )
    require(
        isinstance(source.get("url"), str) and valid_url(source["url"]),
        "Invalid reader source attribution URL",
    )
    require(
        isinstance(source.get("sha256"), str) and SHA256.fullmatch(source["sha256"]),
        "Invalid reader source SHA-256",
    )
    lesson = f"{BASE}/terms/{term_id}/{session}/"
    translation_version = hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]
    config = {
        "term": term_id,
        "session": session,
        "pdfUrl": pdf,
        "translationUrl": f"{BASE}/source-translations/{term_id}/{session}.json?v={translation_version}",
        "pageCount": count,
        "sourceSha256": source["sha256"],
        "practiceUrl": lesson + "practice/",
        "knowledgeUrl": BASE + "/knowledge/",
    }
    if row.get("workshop"):
        unit = row["workshop"]
        sequences = unit.get("slide_sequences", [])
        require(isinstance(sequences, list) and all(isinstance(sequence, list)
                and len(sequence) >= 2
                and all(type(n) is int and 1 <= n <= count for n in sequence)
                and sequence == sorted(set(sequence))
                for sequence in sequences), "Invalid slide sequence")
        if sequences:
            config["slideSequences"] = sequences
        pages = sorted({n for example in unit.get("source_examples", [])
                        for n in example["pages"] if type(n) is int and 1 <= n <= count})
        if term_id == "spring-2026" and ("activities" in unit or "source_examples" in unit):
            config["interactivePages"] = pages
            activity_pages = unit.get("activities", {}).get("pages", [])
            config["questionPages"] = sorted({
                entry["number"] for entry in activity_pages if entry.get("question_ids")
            }) if "activities" in unit else sorted({
                n for example in unit.get("source_examples", []) if example.get("questions")
                for n in example["pages"]})
        else:
            legacy_pages = sorted(set(pages) | {
                n for n in [unit.get("source_page"), *unit.get("example_pages", []),
                            *[q.get("source_page") for q in unit.get("questions", [])]]
                if type(n) is int and 1 <= n <= count})
            if legacy_pages:
                config["interactivePages"] = legacy_pages
    encoded = json.dumps(config, ensure_ascii=False).replace("<", "\\u003c")
    encoded = encoded.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    def e(value):
        return escape(str(value), quote=True)
    require(not asset_revision or re.fullmatch(r"[a-f0-9]{16}", asset_revision), "Invalid reader asset revision")
    asset_query = "?v=" + asset_revision if asset_revision else ""
    interactives_script = (
        f'<script type="module" src="{BASE}/assets/source-interactives.js{asset_query}"></script>'
        if (ROOT / "assets/source-interactives.js").exists() else ""
    )
    title = row.get("title_fa", row.get("title_en", session))
    session_number = str(int(session[1:])).translate(str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹'))
    license_label = source.get("license_notice", "").removesuffix("; version not printed on cover")
    options = "".join(
        f'<option value="{n}"{" selected" if n == 1 else ""}>{n}</option>'
        for n in range(1, count + 1)
    )
    workshop_link = (
        f'<a href="{lesson}practice/#code" role="button" data-reader-section="lab" data-session-workshop aria-pressed="false">آزمایشگاه</a><a href="{lesson}practice/#questions" role="button" data-reader-section="questions" aria-pressed="false">سؤال‌ها</a>'
        if row.get("workshop") else ""
    )
    return f'''<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)} · اسلاید و ترجمهٔ فارسی</title>
<meta name="description" content="اسلایدهای دانا گوراری با ترجمهٔ فارسی">
<link rel="stylesheet" href="{BASE}/assets/course.css">
<link rel="stylesheet" href="{BASE}/assets/source-reader.css{asset_query}">
<link rel="stylesheet" href="{BASE}/assets/vendor/katex/katex.min.css">
<link rel="stylesheet" href="{BASE}/assets/practice.css{asset_query}">
<script type="module" src="{BASE}/assets/source-reader.js{asset_query}"></script>{interactives_script}</head>
<body class="source-reader" data-course-term="{e(term['id'])}" data-course-session="{e(row['id'])}" data-mobile-view="source" data-reader-section="slides" data-loading="true">
<a class="skip" href="#reader">رفتن به اسلاید و ترجمه</a>
<header class="reader-header">
<div class="reader-heading"><a href="{BASE}/terms/{term_id}/" aria-label="بازگشت به فهرست اسلایدها" title="فهرست اسلایدها">فهرست اسلایدها</a>
<p>{e(term.get('title_fa', TERM_TITLES[term_id]))}</p><p class="reader-instructor">استاد: دکتر نگار مجمع</p><h1><bdi>{session_number}</bdi> - {e(title)}</h1></div>
<img class="deck-logo" src="{BASE}/assets/university-logo.png" alt="نشان مؤسسه آموزش عالی نقش جهان" width="100" height="104">
<nav class="reader-sections" aria-label="بخش‌های درس"><button type="button" data-reader-section="slides" aria-pressed="true">اسلاید</button>{workshop_link}<a href="{BASE}/knowledge/" role="button" data-reader-section="knowledge" aria-pressed="false">کتابخانهٔ دانش</a></nav>
</header>
<main id="reader">
<div class="reader-toolbar" aria-label="کنترل‌های مطالعه">
<button type="button" data-prev-page aria-label="صفحه قبل" title="صفحه قبل" disabled>قبلی</button>
<label>صفحه <select data-page-select aria-label="انتخاب صفحه">{options}<option value="sources">منابع</option></select></label>
<span data-page-total>از <bdi data-page-count>{count}</bdi></span>
<button type="button" data-next-page aria-label="صفحه بعد" title="صفحه بعد">بعدی</button>
<button type="button" data-zoom-out aria-label="کوچک‌نمایی" title="کوچک‌نمایی">−</button>
<button type="button" data-zoom-in aria-label="بزرگ‌نمایی" title="بزرگ‌نمایی">+</button>
<button type="button" data-fullscreen title="تمام‌صفحه">تمام‌صفحه</button>
<button type="button" data-print aria-label="چاپ" title="چاپ">چاپ</button>
<button type="button" data-source-only-toggle aria-label="نمای ارائه" title="نمای ارائه" aria-pressed="false">نمای ارائه</button>
<button type="button" data-page-experiment title="کاوش این اسلاید" hidden>کاوش این اسلاید</button>
<button type="button" data-play-slides aria-pressed="false" hidden>پخش مراحل</button>
<button type="button" data-retry-load hidden>تلاش دوباره</button>
<div class="reader-view-controls" role="group" aria-label="زبان نمایش اسلاید">
<button type="button" data-view-source aria-pressed="false" aria-controls="original-panel">English</button>
<button type="button" data-view-translation aria-pressed="false" aria-controls="translation-panel">فارسی</button>
<button type="button" data-view-both aria-pressed="true" aria-controls="original-panel translation-panel">هر دو</button>
</div></div>
<p role="status" aria-live="polite" data-reader-status>در حال بارگیری اسلاید و ترجمه…</p>
<progress data-pdf-progress max="100" value="0" aria-label="پیشرفت بارگیری اسلاید"></progress>
<nav class="reader-focus-controls" aria-label="کنترل اسلاید در تمام صفحه">
<button type="button" data-focus-prev aria-label="صفحه قبل"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>
<button type="button" data-focus-next aria-label="صفحه بعد"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button>
<button type="button" data-focus-exit aria-label="خروج از تمام صفحه"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h5V4m11 5h-5V4M4 15h5v5m11-5h-5v5"/></svg></button>
<button type="button" data-focus-experiment aria-label="کاوش این اسلاید" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6l-5 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3M8 15h8"/></svg></button>
<span data-focus-position aria-hidden="true"></span>
<div class="reader-focus-languages" role="group" aria-label="کنترل نمایش اسلاید"><button type="button" data-focus-zoom-out aria-label="کوچک نمایی اسلاید" title="کوچک نمایی"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button><button type="button" data-focus-zoom-in aria-label="بزرگ نمایی اسلاید" title="بزرگ نمایی"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg></button><button type="button" data-focus-zoom-fit aria-label="نمایش کامل اسلاید" title="نمایش کامل">۱۰۰٪</button><button type="button" data-focus-view="translation">فارسی</button><button type="button" data-focus-view="source">English</button><button type="button" data-focus-view="both">هر دو</button></div>
</nav>
<div class="reader-layout">
<section id="original-panel" class="reader-original" aria-label="اسلاید" aria-busy="true">
<div class="reader-placeholder" aria-hidden="true"><span></span><span></span><span></span></div>
<div class="source-page"><canvas id="source-canvas" width="960" height="540" role="img" aria-label="صفحهٔ اسلاید"></canvas>
<div id="source-links" aria-label="پیوندهای اسلاید"></div></div>
</section>
<section id="translation-panel" class="reader-translation" aria-label="ترجمهٔ فارسی" aria-busy="true">
<div class="reader-placeholder" aria-hidden="true"><span></span><span></span><span></span></div>
<div id="persian-page" dir="rtl"></div>
<details class="reader-source-text"><summary>متن انگلیسی</summary>
<div data-source-text lang="en" dir="ltr"></div></details>
</section><section class="reader-tools-panel" aria-label="ابزار کنار اسلاید" hidden><iframe title="ابزار انتخابی درس" data-reader-tools-frame></iframe></section></div>
<section id="reader-references" class="reader-references" aria-labelledby="references-heading" hidden>
<h2 id="references-heading">منابع</h2>
<p>دانا گوراری (<bdi lang="en" dir="ltr">Danna Gurari</bdi>) · دانشگاه کلرادو بولدر · {e(term.get('title_fa', TERM_TITLES[term_id]))}</p>
<p><a href="{e(source['url'])}" data-source-citation target="_blank" rel="noopener noreferrer">{e(title)}</a></p>
<p class="reader-reference-license">{e(license_label)}</p><p class="reader-reference-license">کد و تمرین‌ها: MIT</p>
</section>
<noscript><p>برای نمایش اسلایدها، جاوااسکریپت را فعال کن.</p></noscript>
</main>
<footer class="reader-presenter">ارایه دهنده: حسام شینی</footer>
<script id="source-reader-config" type="application/json">{encoded}</script>
</body></html>'''
