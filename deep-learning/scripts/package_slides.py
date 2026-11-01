"""Build an explicit, reproducible, self-contained Spring 2022 teaching bundle."""

import hashlib
import json
import posixpath
import re
import zipfile
from html import escape
from pathlib import PurePosixPath
from urllib.parse import urlsplit, urlunsplit

from local_slides import load_slides
from source_catalog import ROOT

ASSETS = (
    "course.css",
    "course.js",
    "workshops.js",
    "workshop-worker.mjs",
    "slides.css",
    "slides.js",
    "university-logo.png",
    "university-logo.source.json",
    "vendor/pyodide.mjs",
    "vendor/pyodide-LICENSE.json",
)
CORE = ("pyodide.asm.js", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json")
NOTICES = ("Arad-OFL.txt", "Python-LICENSE.txt", "sources.json")
PUBLIC = "https://koolfox.github.io"


def read_regular(path):
    """Reject symlinks at every boundary, including generated runtime parents."""
    if any(p.is_symlink() for p in (path, *path.parents)):
        raise ValueError(f"Symlink bundle input: {path}")
    return path.read_bytes()


def declared_vendor_files(root, vendor):
    """Validate the declared distribution; never sweep arbitrary vendor files."""
    if vendor not in {"pdfjs", "katex"}:
        raise ValueError("Unknown reader vendor")
    folder = root / "assets/vendor" / vendor
    manifest = json.loads(read_regular(folder / "files.json"))
    records = manifest.get("files")
    if not isinstance(records, list) or not records:
        raise ValueError(f"Missing {vendor} file manifest")
    names = ["files.json"]
    for record in records:
        name = record.get("path", "")
        path = PurePosixPath(name)
        if (not name or path.is_absolute() or ".." in path.parts
                or "\\" in name or str(path) != name or name in names
                or any(part.startswith(".") for part in path.parts)
                or (path.suffix not in {".bcmap", ".js", ".mjs", ".pfb", ".ttf", ".txt", ".wasm", ".css", ".woff2"}
                    and not path.name.startswith("LICENSE"))):
            raise ValueError(f"Unsafe or duplicate vendor path: {name}")
        data = read_regular(folder / name)
        if hashlib.sha256(data).hexdigest() != record.get("sha256"):
            raise ValueError(f"Vendor hash mismatch: {vendor}/{name}")
        names.append(name)
    return names


def _bundle_url(url, name, names):
    """Use relative links for included files and HTTPS for outside pages."""
    if not url.startswith("/") or url.startswith("//"):
        return url
    parts = urlsplit(url)
    target = parts.path.lstrip("/")
    candidate = target + "index.html" if target.endswith("/") else target
    if candidate not in names and target + "/index.html" in names:
        candidate = target + "/index.html"
    if candidate not in names:
        return PUBLIC + url
    relative = posixpath.relpath(candidate, posixpath.dirname(name) or ".")
    return urlunsplit(("", "", relative, parts.query, parts.fragment))


def _bundle_html(text, name, names):
    text = re.sub(
        r'((?:href|src|data-show-source)=["\'])(/[^"\']*)(["\'])',
        lambda m: m[1] + _bundle_url(m[2], name, names) + m[3], text,
    )
    def config(match):
        value = json.loads(match[2])
        for key in ("pdfUrl", "translationUrl", "practiceUrl", "knowledgeUrl", "reader", "source_url"):
            if key in value:
                value[key] = _bundle_url(value[key], name, names)
        for lab in value.get("related_labs", []):
            lab["url"] = _bundle_url(lab["url"], name, names)
        return match[1] + json.dumps(value, ensure_ascii=False).replace("<", "\\u003c") + match[3]
    return re.sub(
        r'(<script\b[^>]*\bid="(?:source-reader-config|practice-config)"[^>]*>)(.*?)(</script>)',
        config, text, flags=re.DOTALL,
    )


def package_source_readers(output, term_id, sessions, root=ROOT):
    """Package one registered source-reader term, preserving original PDF bytes.

    Only the explicit session registry and distribution manifests select files.
    Complete lessons and all currently authored workshops travel with the reader.
    The independent Spring 2022 bundle remains a separate, unchanged surface.
    """
    from source_reader import load_source_translation

    if not re.fullmatch(r"(?:spring|fall)-[0-9]{4}", term_id):
        raise ValueError("Invalid source bundle term")
    if not sessions:
        raise ValueError("Source bundle needs a registered session")
    metadata = json.loads(read_regular(root / f"data/metadata/{term_id}.json"))
    term = metadata["term"]
    rows = {r["id"]: r for r in term["schedule"] if r["slides"]}
    if term["id"] != term_id or any(session not in rows for session in sessions):
        raise ValueError("Unknown source bundle session")
    payloads = {
        session: load_source_translation(session, root=root, term_id=term_id)
        for session in sessions
    }
    files = {}

    def add(name, source, digest=None):
        path = PurePosixPath(name)
        if path.is_absolute() or ".." in path.parts or "\\" in name or name in files:
            raise ValueError(f"Unsafe or duplicate bundle path: {name}")
        data = read_regular(source)
        if digest and hashlib.sha256(data).hexdigest() != digest:
            raise ValueError(f"Bundle input hash mismatch: {name}")
        files[name] = data

    identity_path = root / f"data/metadata/{term_id}-slide-identity.json"
    records = json.loads(read_regular(identity_path))["records"]
    originals = {r["session_id"]: r for r in records}
    if len(originals) != len(records) or set(originals) != set(rows):
        raise ValueError("Original PDF inventory does not match teaching sessions")
    workshop_sessions = []
    for session, row in rows.items():
        record = originals[session]
        relative = f"assets/danna/{term_id}/{session}.pdf"
        source = row["slides"]
        if (len(source) != 1 or record.get("local_file") != relative
                or any(record.get(key) != source[0].get(key) for key in ("url", "sha256", "page_count"))):
            raise ValueError(f"Original PDF identity mismatch: {session}")
        add("deep-learning/" + relative, root / relative, record["sha256"])
        route = f"terms/{term_id}/{session}/index.html"
        add("deep-learning/" + route, output / route)
        code = output / f"workshops/{term_id}/{session}.py"
        if session in payloads and code.exists():
            add(f"deep-learning/workshops/{term_id}/{session}.py", code)
            workshop_sessions.append(session)
    links = []
    for session, payload in payloads.items():
        route = f"terms/{term_id}/{session}/slides/index.html"
        add("deep-learning/" + route, output / route)
        practice = f"terms/{term_id}/{session}/practice/index.html"
        if (output / practice).exists():
            add("deep-learning/" + practice, output / practice)
        translated = f"source-translations/{term_id}/{session}.json"
        add("deep-learning/" + translated, output / translated)
        if json.loads(files["deep-learning/" + translated]) != payload:
            raise ValueError(f"Stale generated source-reader payload: {session}")
        links.append(f'<li><a href="/deep-learning/{route}">{escape(rows[session]["title_fa"])}</a></li>')
    for name in ("course.css", "course.js", "workshops.js", "workshop-worker.mjs",
                 "source-reader.js", "source-reader.css", "university-logo.png",
                 "university-logo.source.json", "vendor/pyodide.mjs", "vendor/pyodide-LICENSE.json",
                 "notebook.js", "notebook.css", "notebook_kernel.py", "notebook-worker.mjs", "practice.js", "practice.css", "knowledge.js"):
        add("deep-learning/assets/" + name, output / "assets" / name)
    add("deep-learning/knowledge/index.html", output / "knowledge/index.html")
    for vendor in ("pdfjs", "katex"):
        for name in declared_vendor_files(root, vendor):
            add(f"deep-learning/assets/vendor/{vendor}/{name}", root / "assets/vendor" / vendor / name)
    for name in NOTICES:
        add("deep-learning/assets/vendor/notices/" + name, root / "assets/vendor/notices" / name)
    for name in ("LICENSE", "THIRD_PARTY_NOTICES.md"):
        add("deep-learning/" + name, root / name)
    add("assets/fonts/arad.woff2", root.parent / "assets/fonts/arad.woff2")
    for name in CORE:
        add("deep-learning/runtime/neuron-xor/shinylive/pyodide/" + name,
            root / "results/shinylive/neuron-xor/shinylive/pyodide" / name)
    add(f"deep-learning/data/metadata/{term_id}-slide-identity.json", identity_path)
    add("deep-learning/content/slide-reader-identity.json", root / "content/slide-reader-identity.json")
    for folder in ("workshops", "math"):
        path = root / f"content/{folder}/{term_id}.json"
        if path.exists():
            add(f"deep-learning/content/{folder}/{term_id}.json", path)
    for session in workshop_sessions:
        path = root / f"content/workshops/{term_id}/{session}.json"
        if path.exists():
            add(f"deep-learning/content/workshops/{term_id}/{session}.json", path)
    count = sum(len(p["pages"]) for p in payloads.values())
    files["index.html"] = (
        '<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>اصل اسلاید و ترجمهٔ فارسی</title><link rel="stylesheet" href="/deep-learning/assets/course.css">'
        f'<main class="standalone"><h1>{escape(term["title_fa"])} · اصل اسلاید و ترجمهٔ فارسی</h1>'
        f'<p>{count} صفحه در {len(payloads)} جلسهٔ ترجمه‌شده؛ {len(rows)} PDF اصلی بدون تغییر.</p>'
        '<p>پس از استخراج ZIP، این پوشه را با <code dir="ltr">python3 -m http.server 8871</code> باز کن و به localhost:8871 برو.</p>'
        + '<ol>' + ''.join(links) + '</ol></main></html>'
    ).encode()
    files["README.txt"] = (
        f"اصل اسلاید و ترجمهٔ فارسی — {term['title_fa']}\n\n"
        "ZIP را استخراج کن و در پوشهٔ index.html اجرا کن:\npython3 -m http.server 8871\n"
        "سپس http://localhost:8871 را باز کن؛ file:// مناسب نیست.\n"
        f"این بسته شامل {len(rows)} PDF اصلی، {count} صفحهٔ ترجمه در {len(payloads)} جلسه، "
        f"نمایشگر اسلاید، کتابخانهٔ دانش و {len(workshop_sessions)} کارگاه پایتون تألیف‌شده با سؤال‌های تستی است. "
        "نمایش اصل و ترجمه و اجرای مثال‌های کتابخانهٔ استاندارد پایتون به اینترنت نیاز ندارند.\n"
        "اصل اسلایدهای دانا گوراری و حقوق تصاویر و منابع شخص ثالث محفوظ‌اند. "
        "برای بهار ۲۰۲۶ نشان CC BY-NC-SA در منبع دیده می‌شود؛ نسخهٔ مجوز روی اسلاید چاپ نشده است. "
        "ترجمه اقتباس از منبع است؛ مجوز MIT کد تألیفی، PDFهای اصلی یا ترجمه را دوباره مجوزدهی نمی‌کند. "
        "اعتبارها در PDF و THIRD_PARTY_NOTICES.md حفظ شده‌اند.\n"
        "پوشش ترجمه و بررسی خوانایی، ادعای بررسی علمی مستقل همهٔ صفحات نیست.\n"
        "فهرست SHA-256 بایت‌های واقعی فایل‌ها در bundle-manifest.json است.\n"
    ).encode()
    names = set(files)
    for name, data in list(files.items()):
        if name.endswith(".html"):
            files[name] = _bundle_html(data.decode(), name, names).encode()
        elif name.endswith(".css"):
            files[name] = re.sub(r'url\((["\']?)(/[^)"\']+)\1\)',
                lambda m: "url(" + m[1] + _bundle_url(m[2], name, names) + m[1] + ")", data.decode()).encode()
    script = "deep-learning/assets/workshops.js"
    files[script] = files[script].replace(
        b"new Worker('/deep-learning/assets/workshop-worker.mjs',",
        b"new Worker(new URL('./workshop-worker.mjs', __bundleAssetBase),",
    )
    files[script] = b"const __bundleAssetBase = document.currentScript.src;\n" + files[script]
    worker = "deep-learning/assets/workshop-worker.mjs"
    files[worker] = files[worker].replace(
        b"new URL('/deep-learning/runtime/neuron-xor/shinylive/pyodide/', self.location)",
        b"new URL('../runtime/neuron-xor/shinylive/pyodide/', import.meta.url)",
    )
    manifest = {
        "schema_version": 1, "term": term_id, "pages": count, "slides": count,
        "sessions": list(payloads), "original_pdfs": len(rows),
        "original_pages": sum(r["page_count"] for r in originals.values()),
        "workshop_sessions": workshop_sessions,
        "files": [{"path": name, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}
                  for name, data in sorted(files.items())],
    }
    files["bundle-manifest.json"] = json.dumps(manifest, ensure_ascii=False, indent=2).encode()
    destination = output / f"slides/{term_id}.zip"
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    return destination


def package_slides(output, root=ROOT):
    identity, sessions = load_slides("spring-2022", root)
    files = {}

    def add(name, source):
        files[name] = read_regular(source)

    links = []
    for session in sessions:
        route = f"deep-learning/terms/spring-2022/{session}/"
        name = route + "slides/index.html"
        text = read_regular(output / name.removeprefix("deep-learning/")).decode()
        # The complete lessons and three full Shiny applications are website links;
        # the bundled slide editor uses only the included Python core and stdlib.
        text = text.replace(f'href="/{route}"', f'href="{PUBLIC}/{route}"')
        text = text.replace(
            'href="/deep-learning/slides/spring-2022.zip"',
            f'href="{PUBLIC}/deep-learning/slides/spring-2022.zip"',
        )
        files[name] = text.encode()
        links.append(
            f'<li><a href="/{name}">{escape(session)} · {escape(sessions[session]["intro_fa"])}</a></li>'
        )
        add(
            f"deep-learning/workshops/spring-2022/{session}.py",
            output / f"workshops/spring-2022/{session}.py",
        )
    for name in ASSETS:
        add("deep-learning/assets/" + name, output / "assets" / name)
    for name in NOTICES:
        source = root / "assets/vendor/notices" / name
        add("deep-learning/assets/vendor/notices/" + name, source)
        target = output / "assets/vendor/notices" / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.resolve() != source.resolve():
            target.write_bytes(files["deep-learning/assets/vendor/notices/" + name])
    for name in ("LICENSE", "THIRD_PARTY_NOTICES.md"):
        add("deep-learning/" + name, root / name)
    for folder in ("slides", "workshops"):
        add(
            f"deep-learning/content/{folder}/spring-2022.json",
            root / f"content/{folder}/spring-2022.json",
        )
    add("assets/fonts/arad.woff2", root.parent / "assets/fonts/arad.woff2")
    runtime = root / "results/shinylive/neuron-xor/shinylive/pyodide"
    for name in CORE:
        add(
            "deep-learning/runtime/neuron-xor/shinylive/pyodide/" + name, runtime / name
        )
    files["index.html"] = (
        """<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>اسلایدهای فارسی دیپ لرنینگ · بهار ۲۰۲۲</title><link rel="stylesheet" href="/deep-learning/assets/course.css"><main class="standalone"><h1>کارگاه آموزشی دیپ لرنینگ</h1><p>استاد: """
        + escape(identity["supervisor_fa"])
        + """</p><p>۲۳ ارائهٔ مستقل فارسی با کارگاه پایتون و پرسش‌وپاسخ. پس از بازکردن ZIP، در همین پوشه فرمان <code dir="ltr">python3 -m http.server 8871</code> را اجرا و <a href="http://localhost:8871">localhost:8871</a> را باز کن. اجرای کارگاه به اینترنت نیاز ندارد؛ پیوند منابع اصلی و درس کامل، اینترنتی است.</p><ol>"""
        + "".join(links)
        + """</ol><p><a href="/deep-learning/LICENSE">MIT برای محتوای تألیفی</a> · <a href="/deep-learning/THIRD_PARTY_NOTICES.md">مجوز اجزای دیگر</a></p></main></html>"""
    ).encode()
    files["README.txt"] = """کارگاه آموزشی دیپ لرنینگ — بهار ۲۰۲۲

ZIP را استخراج کن. در پوشه‌ای که index.html در آن است اجرا کن:
python3 -m http.server 8871
سپس http://localhost:8871 را باز کن؛ فایل را با file:// باز نکن.

۲۳ ارائهٔ فارسی مستقل، کد قابل‌ویرایش، پرسش‌وپاسخ و هستهٔ Python/Pyodide
در این بسته قرار دارند. مثال‌های اولیه فقط کتابخانهٔ استاندارد پایتون لازم دارند
و بدون اینترنت اجرا می‌شوند. نصب پکیج‌های اضافه تعهد این بسته نیست.
پیوند درس کامل و منابع اصلی اینترنتی است. اصل PDFهای استاد در این بسته نیست.
این ارائه‌ها ترجمهٔ کامل اسلایدهای دانا نیستند؛ تألیف آموزشی مستقل فارسی‌اند.
چاپ / ذخیرهٔ PDF از دکمهٔ بالای هر ارائه در دسترس است.

فهرست SHA-256 همهٔ فایل‌های بسته در bundle-manifest.json است.
مجوز محتوای تألیفی: deep-learning/LICENSE (MIT).
مجوز فونت و محیط اجرا: deep-learning/THIRD_PARTY_NOTICES.md.
""".encode()
    manifest = {
        "schema_version": 1,
        "term": "spring-2022",
        "slides": sum(
            6 + len(u["questions"])
            for u in json.loads(
                (root / "content/workshops/spring-2022.json").read_text()
            )["sessions"]
        ),
        "files": [
            {
                "path": name,
                "sha256": hashlib.sha256(data).hexdigest(),
                "bytes": len(data),
            }
            for name, data in sorted(files.items())
        ],
    }
    files["bundle-manifest.json"] = json.dumps(
        manifest, ensure_ascii=False, indent=2
    ).encode()
    destination = output / "slides/spring-2022.zip"
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(
        destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6
    ) as archive:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    return destination
