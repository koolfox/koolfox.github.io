"""Deck coverage and offline-package integrity, separate from source review state."""

import hashlib
import json
import shutil
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from local_slides import load_slides
from package_slides import (
    ASSETS, CORE, NOTICES, declared_vendor_files, package_slides,
    package_source_readers, read_regular,
)
from source_catalog import ROOT


class LocalSlidesTests(unittest.TestCase):
    def test_every_teaching_session_has_an_independent_narrative(self):
        identity, units = load_slides("spring-2022")
        self.assertEqual(len(units), 23)
        self.assertEqual(identity["supervisor_fa"], "دکتر نگار مجمع")
        self.assertEqual(identity["license"], "MIT")
        self.assertNotIn("s03", units)
        self.assertEqual(load_slides("spring-2026"), ({}, {}))
        self.assertEqual(len({u["formula"] for u in units.values()}), 23)

    def test_archive_is_deterministic_and_contains_only_declared_inputs(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory).resolve()
            root = base / "deep-learning"
            output = base / "public/deep-learning"
            output.mkdir(parents=True)
            for folder in ("content/slides", "content/workshops", "data/metadata"):
                target = root / folder
                target.mkdir(parents=True)
                shutil.copyfile(
                    ROOT / folder / "spring-2022.json", target / "spring-2022.json"
                )
            for name in (*ASSETS, *("vendor/notices/" + n for n in NOTICES)):
                source = root / "assets" / name
                source.parent.mkdir(parents=True, exist_ok=True)
                source.write_text("fixture")
                target = output / "assets" / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text("fixture")
            for name in ("LICENSE", "THIRD_PARTY_NOTICES.md"):
                (root / name).write_text("license fixture")
            font = base / "assets/fonts/arad.woff2"
            font.parent.mkdir(parents=True)
            font.write_bytes(b"font fixture")
            for name in CORE:
                target = root / "results/shinylive/neuron-xor/shinylive/pyodide" / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(b"runtime fixture")
            _, units = load_slides("spring-2022", root)
            for identity in units:
                route = f"terms/spring-2022/{identity}/slides/index.html"
                target = output / route
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(
                    f'<a href="/deep-learning/terms/spring-2022/{identity}/">lesson</a>'
                )
                code = output / f"workshops/spring-2022/{identity}.py"
                code.parent.mkdir(parents=True, exist_ok=True)
                code.write_text("result = {'value': 1}")
            (output / "private.pdf").write_text("must not enter archive")
            path = package_slides(output, root)
            before = path.read_bytes()
            self.assertEqual(package_slides(output, root).read_bytes(), before)
            with zipfile.ZipFile(path) as archive:
                names = archive.namelist()
                self.assertEqual(
                    sum(n.endswith("slides/index.html") for n in names), 23
                )
                self.assertFalse(
                    any(
                        n.endswith(".pdf") or "structural-bioinformatics" in n
                        for n in names
                    )
                )
                manifest = json.loads(archive.read("bundle-manifest.json"))
                self.assertEqual(manifest["slides"], 207)
                self.assertEqual(
                    set(names),
                    {f["path"] for f in manifest["files"]} | {"bundle-manifest.json"},
                )
                for record in manifest["files"]:
                    self.assertEqual(
                        hashlib.sha256(archive.read(record["path"])).hexdigest(),
                        record["sha256"],
                    )
                self.assertIn(
                    b"https://koolfox.github.io/deep-learning/",
                    archive.read(
                        "deep-learning/terms/spring-2022/s01/slides/index.html"
                    ),
                )

    def test_bundle_rejects_symlinked_inputs_and_parents(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory).resolve()
            (base / "real").mkdir()
            (base / "real/file").write_text("x")
            (base / "link").symlink_to(base / "real", target_is_directory=True)
            with self.assertRaisesRegex(ValueError, "Symlink bundle input"):
                read_regular(base / "link/file")


class RegisteredSourceReaderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name).resolve()
        self.root = self.base / "deep-learning"
        self.output = self.base / "public/deep-learning"
        self.term = "spring-2026"
        self.rows = [
            {"id": "s01", "title_fa": "مقدمه", "slides": []},
            {"id": "s02", "title_fa": "نورون", "slides": []},
        ]
        self.payloads = {}
        originals = []
        for number, row in enumerate(self.rows, 1):
            session = row["id"]
            pdf = f"assets/danna/{self.term}/{session}.pdf"
            data = b"%PDF-1.7\noriginal bytes " + session.encode()
            self.write(self.root / pdf, data)
            record = {"url": f"https://courses.example.edu/{session}.pdf",
                      "sha256": hashlib.sha256(data).hexdigest(), "page_count": number + 1}
            row["slides"] = [record]
            originals.append({**record, "session_id": session, "local_file": pdf})
            self.payloads[session] = {
                "schema_version": 1, "term_id": self.term, "session_id": session,
                "source": {**record, "local_url": "/deep-learning/" + pdf},
                "pages": [{"number": n, "text_reviewed": True, "image_text_reviewed": True,
                           "lines": ["Input"], "blocks": [{"kind": "text", "source_lines": [0], "fa": "ورودی (Input)"}], "image_text": []}
                          for n in range(1, number + 2)],
            }
            config = {"pdfUrl": "/deep-learning/" + pdf,
                      "translationUrl": f"/deep-learning/source-translations/{self.term}/{session}.json"}
            self.write(self.output / f"terms/{self.term}/{session}/slides/index.html",
                '<link rel="stylesheet" href="/deep-learning/assets/course.css">'
                f'<a href="/deep-learning/terms/{self.term}/{session}/#workshop">workshop</a>'
                '<a href="/deep-learning/sources/">outside bundle</a>'
                '<script id="source-reader-config" type="application/json">' + json.dumps(config) + '</script>')
            self.write(self.output / f"terms/{self.term}/{session}/index.html",
                f'<a href="/deep-learning/terms/{self.term}/{session}/slides/">reader</a>')
            self.write(self.output / f"workshops/{self.term}/{session}.py", "result = {'value': 1}\n")
            self.write(self.output / f"source-translations/{self.term}/{session}.json", self.payloads[session])
        self.course = {"terms": [{"id": self.term, "title_fa": "بهار ۲۰۲۶", "schedule": self.rows}]}
        self.write(self.root / f"data/metadata/{self.term}.json", {"term": self.course["terms"][0]})
        self.write(self.root / f"data/metadata/{self.term}-slide-identity.json", {"records": originals})
        self.write(self.root / "data/metadata/source-readers.json", {"schema_version": 1, "terms": {self.term: ["s01", "s02"]}})
        self.write(self.root / "content/slide-reader-identity.json", {"supervisor_fa": "دکتر نگار مجمع"})
        for name in ("course.css", "course.js", "workshops.js", "workshop-worker.mjs", "source-reader.js", "slide-content.js", "source-reader.css", "vazirmatn-slide.woff2", "vazirmatn-slide-LICENSE.txt",
                     "university-logo.png", "university-logo.source.json", "vendor/pyodide.mjs", "vendor/pyodide-LICENSE.json",
                     "notebook.js", "notebook.css", "notebook_kernel.py", "notebook-worker.mjs", "practice.js", "practice.css", "knowledge.js",
                     "python-tools.js", "python-tools-worker.mjs", "notebook_support.py", "notebook-results.js", "webgpu-attention.js"):
            self.write(self.output / "assets" / name, "fixture")
        self.write(self.output / "assets/course.css", "@font-face{src:url('/assets/fonts/arad.woff2')}")
        self.write(self.output / "assets/workshops.js", "new Worker('/deep-learning/assets/workshop-worker.mjs', {type:'module'});")
        self.write(self.output / "assets/workshop-worker.mjs", "new URL('/deep-learning/runtime/neuron-xor/shinylive/pyodide/', self.location);")
        for vendor, files in {"pdfjs": ("pdf.min.mjs", "pdf.worker.min.mjs", "standard_fonts/LICENSE_FOXIT"),
                              "katex": ("katex.mjs", "katex.min.css", "LICENSE.txt", "fonts/KaTeX_Main-Regular.woff2"),
                              "python-editor": ("editor.mjs", "LICENSE.txt"),
                              "python-tools": ("jedi.whl", "pyodide-lock.json", "LICENSE.txt")}.items():
            records = []
            for name in files:
                self.write(self.root / "assets/vendor" / vendor / name, name)
                records.append({"path": name, "sha256": hashlib.sha256(name.encode()).hexdigest()})
            self.write(self.root / "assets/vendor" / vendor / "files.json", {"files": records})
        for name in NOTICES:
            self.write(self.root / "assets/vendor/notices" / name, "notice")
        for name in ("LICENSE", "THIRD_PARTY_NOTICES.md"):
            self.write(self.root / name, "license")
        self.write(self.base / "assets/fonts/arad.woff2", b"font bytes")
        for name in CORE:
            self.write(self.root / "results/shinylive/neuron-xor/shinylive/pyodide" / name, b"runtime bytes")
        self.write(self.output / "knowledge/index.html", "<h1>Knowledge</h1>")
        self.write(self.output / "private.pdf", "untracked forbidden input")
        self.write(self.root / "assets/vendor/pdfjs/untracked.js", "untracked forbidden input")

    def tearDown(self):
        self.temp.cleanup()

    def write(self, path, data):
        path.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(data, (dict, list)):
            data = json.dumps(data, ensure_ascii=False)
        path.write_bytes(data.encode() if isinstance(data, str) else data)

    def package(self, sessions=None):
        with patch("source_reader.load_source_translation", side_effect=lambda session, **kw: self.payloads[session]) as validate:
            destination = package_source_readers(self.output, self.term, sessions or self.payloads, root=self.root)
            self.assertTrue(all(call.kwargs.get("term_id") == self.term and call.kwargs.get("require_reviewed", True)
                                for call in validate.call_args_list))
            return destination

    def test_registry_is_explicit_and_strict_with_an_opt_in_draft(self):
        from build_course import load_reader_registry
        with patch("build_course.load_source_translation", side_effect=lambda session, **kw: self.payloads[session]) as validate:
            with patch.dict("os.environ", {}, clear=True):
                self.assertEqual(set(load_reader_registry(self.course, self.root)[self.term]), {"s01", "s02"})
                self.assertTrue(all(c.kwargs["require_reviewed"] for c in validate.call_args_list))
            validate.reset_mock()
            with patch.dict("os.environ", {"DANNA_SOURCE_DRAFT": "1"}, clear=True):
                load_reader_registry(self.course, self.root)
                self.assertTrue(all(c.kwargs["require_reviewed"] is False for c in validate.call_args_list))
        for sessions in (["s01", "s01"], ["s99"], "s01"):
            self.write(self.root / "data/metadata/source-readers.json", {"schema_version": 1, "terms": {self.term: sessions}})
            with self.assertRaises(ValueError):
                load_reader_registry(self.course, self.root)
        self.write(self.root / "data/metadata/source-readers.json", {"schema_version": 1, "terms": {self.term: []}})
        with patch("build_course.load_source_translation") as validate:
            self.assertEqual(load_reader_registry(self.course, self.root), {})
            validate.assert_not_called()

    def test_source_bundle_has_exact_originals_payloads_workshops_and_portable_links(self):
        destination = self.package()
        before = destination.read_bytes()
        self.assertEqual(self.package().read_bytes(), before)
        with zipfile.ZipFile(destination) as archive:
            names = set(archive.namelist())
            manifest = json.loads(archive.read("bundle-manifest.json"))
            self.assertEqual((manifest["pages"], manifest["original_pages"], manifest["original_pdfs"]), (5, 5, 2))
            self.assertEqual(set(manifest["workshop_sessions"]), {"s01", "s02"})
            self.assertEqual(names, {r["path"] for r in manifest["files"]} | {"bundle-manifest.json"})
            self.assertFalse(any("private" in n or "untracked" in n or "spring-2022" in n for n in names))
            for record in manifest["files"]:
                data = archive.read(record["path"])
                self.assertEqual(len(data), record["bytes"])
                self.assertEqual(hashlib.sha256(data).hexdigest(), record["sha256"])
            for session in self.payloads:
                name = f"deep-learning/assets/danna/{self.term}/{session}.pdf"
                self.assertEqual(archive.read(name), (self.root / name.removeprefix("deep-learning/")).read_bytes())
                code = f"workshops/{self.term}/{session}.py"
                self.assertEqual(archive.read("deep-learning/" + code), (self.output / code).read_bytes())
            html = archive.read(f"deep-learning/terms/{self.term}/s01/slides/index.html").decode()
            self.assertIn('href="../index.html#workshop"', html)
            self.assertIn('href="https://koolfox.github.io/deep-learning/sources/"', html)
            self.assertIn('"pdfUrl": "../../../../assets/danna/spring-2026/s01.pdf"', html)
            self.assertIn('"translationUrl": "../../../../source-translations/spring-2026/s01.json"', html)
            self.assertIn(b"../../assets/fonts/arad.woff2", archive.read("deep-learning/assets/course.css"))
            self.assertEqual(archive.read("deep-learning/assets/vazirmatn-slide.woff2"), b"fixture")
            self.assertEqual(archive.read("deep-learning/assets/vazirmatn-slide-LICENSE.txt"), b"fixture")
            self.assertNotIn(b"'/deep-learning/", archive.read("deep-learning/assets/workshops.js"))
            self.assertIn(b"import.meta.url", archive.read("deep-learning/assets/workshop-worker.mjs"))

    def test_partial_registry_packages_only_complete_translations_and_all_originals(self):
        with zipfile.ZipFile(self.package(["s01"])) as archive:
            manifest = json.loads(archive.read("bundle-manifest.json"))
            self.assertEqual((manifest["pages"], manifest["original_pdfs"]), (2, 2))
            self.assertNotIn("deep-learning/source-translations/spring-2026/s02.json", archive.namelist())
            self.assertIn("deep-learning/terms/spring-2026/s02/index.html", archive.namelist())

    def test_source_bundle_rejects_changed_original_and_stale_payload(self):
        target = self.output / "source-translations/spring-2026/s01.json"
        self.write(target, {})
        with self.assertRaisesRegex(ValueError, "Stale generated"):
            self.package()
        self.write(target, self.payloads["s01"])
        self.write(self.root / "assets/danna/spring-2026/s02.pdf", b"changed bytes")
        with self.assertRaisesRegex(ValueError, "hash mismatch"):
            self.package()

    def test_vendor_manifest_rejects_changed_files_traversal_and_symlinks(self):
        self.write(self.root / "assets/vendor/pdfjs/pdf.min.mjs", "changed")
        with self.assertRaisesRegex(ValueError, "hash mismatch"):
            declared_vendor_files(self.root, "pdfjs")
        path = self.root / "assets/vendor/pdfjs/pdf.min.mjs"
        path.unlink()
        self.write(self.base / "outside.mjs", "pdf.min.mjs")
        path.symlink_to(self.base / "outside.mjs")
        with self.assertRaisesRegex(ValueError, "Symlink"):
            declared_vendor_files(self.root, "pdfjs")
        self.write(self.root / "assets/vendor/pdfjs/files.json", {"files": [{"path": "../private", "sha256": "0" * 64}]})
        with self.assertRaisesRegex(ValueError, "Unsafe"):
            declared_vendor_files(self.root, "pdfjs")


if __name__ == "__main__":
    unittest.main()
