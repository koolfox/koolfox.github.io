"""Build an explicit, reproducible, self-contained Spring 2022 teaching bundle."""

import hashlib
import json
import zipfile
from html import escape

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
