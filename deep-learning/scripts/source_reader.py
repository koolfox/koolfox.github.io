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
    if "image_text_limits" in translated_page:
        result["image_text_limits"] = deepcopy(translated_page["image_text_limits"])
    return result


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
    return {
        "schema_version": 1,
        "term_id": term_id,
        "session_id": session_id,
        "source": deepcopy(catalog),
        "pages": combined,
    }


def source_reader_page(term, row, identity, payload, asset_revision=""):
    """Render a JS-enhanced reader shell; original PDF links work without JS."""
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
    config = {
        "term": term_id,
        "session": session,
        "pdfUrl": pdf,
        "translationUrl": f"{BASE}/source-translations/{term_id}/{session}.json",
        "pageCount": count,
        "sourceSha256": source["sha256"],
        "practiceUrl": lesson + "practice/",
        "knowledgeUrl": BASE + "/knowledge/",
    }
    encoded = json.dumps(config, ensure_ascii=False).replace("<", "\\u003c")
    encoded = encoded.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    def e(value):
        return escape(str(value), quote=True)
    require(not asset_revision or re.fullmatch(r"[a-f0-9]{16}", asset_revision), "Invalid reader asset revision")
    asset_query = "?v=" + asset_revision if asset_revision else ""
    title = row.get("title_fa", row.get("title_en", session))
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
<title>{e(title)} · اسلاید اصلی و ترجمهٔ فارسی</title>
<meta name="description" content="اصل اسلایدهای دانا گوراری در کنار ترجمهٔ صفحه‌به‌صفحهٔ فارسی">
<link rel="stylesheet" href="{BASE}/assets/course.css">
<link rel="stylesheet" href="{BASE}/assets/source-reader.css{asset_query}">
<link rel="stylesheet" href="{BASE}/assets/vendor/katex/katex.min.css">
<link rel="stylesheet" href="{BASE}/assets/practice.css{asset_query}">
<script type="module" src="{BASE}/assets/source-reader.js{asset_query}"></script></head>
<body class="source-reader" data-mobile-view="source" data-reader-section="slides">
<a class="skip" href="#reader">رفتن به اسلاید و ترجمه</a>
<header class="reader-header">
<div class="reader-heading"><a href="{BASE}/terms/{term_id}/">فهرست اسلایدها</a>
<p>{e(term.get('title_fa', TERM_TITLES[term_id]))}</p><h1>{e(title)}</h1>
<p class="reader-instructor">استاد: دکتر نگار مجمع</p></div>
<img class="deck-logo" src="{BASE}/assets/university-logo.png" alt="نشان مؤسسه آموزش عالی نقش جهان" width="100" height="104">
<nav class="reader-sections" aria-label="بخش‌های درس"><button type="button" data-reader-section="slides" aria-pressed="true">اسلاید</button>{workshop_link}<a href="{BASE}/knowledge/" role="button" data-reader-section="knowledge" aria-pressed="false">کتابخانهٔ دانش</a></nav>
</header>
<main id="reader">
<div class="reader-toolbar" aria-label="کنترل‌های مطالعه">
<button type="button" data-prev-page aria-label="صفحهٔ قبل" disabled>قبلی</button>
<label>صفحه <select data-page-select aria-label="انتخاب صفحه">{options}</select></label>
<span>از <bdi data-page-count>{count}</bdi></span>
<button type="button" data-next-page aria-label="صفحهٔ بعد">بعدی</button>
<button type="button" data-zoom-out aria-label="کوچک‌نمایی">−</button>
<button type="button" data-zoom-in aria-label="بزرگ‌نمایی">+</button>
<button type="button" data-fullscreen>تمام‌صفحه</button>
<button type="button" data-print>چاپ</button>
<button type="button" data-source-only-toggle aria-pressed="false">نمای ارائه</button>
<div class="reader-view-controls" role="group" aria-label="نمایش در صفحهٔ کوچک">
<button type="button" data-view-source aria-pressed="true" aria-controls="original-panel">اصل اسلاید</button>
<button type="button" data-view-translation aria-pressed="false" aria-controls="translation-panel">ترجمهٔ فارسی</button>
</div></div>
<p role="status" aria-live="polite" data-reader-status>در انتظار بارگیری PDF اصلی و ترجمهٔ همین صفحه.</p>
<progress data-pdf-progress max="100" value="0" aria-label="پیشرفت بارگیری PDF اصلی"></progress>
<div class="reader-layout">
<section id="original-panel" class="reader-original" aria-labelledby="original-heading">
<h2 id="original-heading">اسلاید اصلی <bdi lang="en" dir="ltr">Danna Gurari</bdi></h2>
<div class="source-page"><canvas id="source-canvas" width="960" height="540" role="img" aria-label="صفحهٔ اسلاید اصلی"></canvas>
<div id="source-links" aria-label="پیوندهای صفحهٔ اصلی"></div></div>
<p class="source-pdf-fallback"><a href="{pdf}" target="_blank" rel="noopener noreferrer">بازکردن اصل PDF</a></p>
</section>
<section id="translation-panel" class="reader-translation" aria-labelledby="translation-heading">
<h2 id="translation-heading">ترجمهٔ فارسی همین صفحه</h2><div id="persian-page" dir="rtl"></div>
<details class="reader-source-text"><summary>متن انگلیسی قابل مشاهده در این صفحه</summary>
<div data-source-text lang="en" dir="ltr"></div></details>
</section><section class="reader-tools-panel" aria-label="ابزار کنار اسلاید" hidden><iframe title="ابزار انتخابی درس" data-reader-tools-frame></iframe></section></div>
<noscript><p>برای نمایش هم‌زمان صفحات و ترجمه، جاوااسکریپت لازم است. <a href="{pdf}">اصل PDF را باز کنید</a>.</p></noscript>
</main>
<footer class="reader-attribution"><p>اسلایدهای اصلی: دانا گوراری (<bdi lang="en" dir="ltr">Danna Gurari</bdi>)، دانشگاه کلرادو بولدر.</p>
<p>{e(source.get('license_notice', ''))} · اعتبارها و ارجاع‌های اصلی در خود PDF حفظ شده‌اند.</p>
<a class="reader-download" href="{pdf}" download="{session}.pdf" data-original-download>دریافت PDF اصلی</a>
<a href="{e(source['url'])}" target="_blank" rel="noopener noreferrer">منبع رسمی PDF اصلی</a>
<span aria-hidden="true"> · </span><a href="{BASE}/sources/">منابع و وضعیت بررسی</a></footer>
<script id="source-reader-config" type="application/json">{encoded}</script>
</body></html>'''
