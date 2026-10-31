"""Source/translation provenance, coverage and reader-shell contract checks."""

import hashlib
import json
import sys
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from source_reader import load_source_translation, source_reader_page


def digest(value):
    return hashlib.sha256(value).hexdigest()


class ReaderParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.elements = []
        self.config = ""
        self.in_config = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.elements.append((tag, attrs))
        if tag == "script" and attrs.get("id") == "source-reader-config":
            self.in_config = True

    def handle_endtag(self, tag):
        if tag == "script":
            self.in_config = False

    def handle_data(self, data):
        if self.in_config:
            self.config += data

    def attr(self, key):
        return [(tag, attrs) for tag, attrs in self.elements if key in attrs]


class SourceReaderTests(unittest.TestCase):
    term_id = "spring-2022"
    license_notice = "CC BY; version not printed on cover"

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name).resolve() / "deep-learning"
        self.root.mkdir()
        self.pdf = self.root / f"assets/danna/{self.term_id}/s01.pdf"
        self.pdf.parent.mkdir(parents=True)
        self.pdf.write_bytes(b"%PDF-1.7\nimmutable original fixture\n")
        sha = digest(self.pdf.read_bytes())
        url = f"https://courses.example.edu/{self.term_id}/Lectures/01-Introduction.pdf"
        record = {
            "url": url,
            "sha256": sha,
            "page_count": 2,
        }
        self.metadata = {
            "schema_version": 1,
            "term": {"id": self.term_id, "schedule": [{"id": "s01", "slides": [record]}]},
        }
        self.identity = {
            "schema_version": 1,
            "term_id": self.term_id,
            "records": [{**record, "session_id": "s01", "local_file": f"assets/danna/{self.term_id}/s01.pdf"}]
        }
        lines = ["VISIBLE ORIGINAL", "HIDDEN EXTRACTION MUST NOT BE RENDERED"]
        self.source = {
            "schema_version": 1,
            "term_id": self.term_id,
            "session_id": "s01",
            "source": {
                **record,
                "local_url": f"/deep-learning/assets/danna/{self.term_id}/s01.pdf",
                "license_notice": self.license_notice,
            },
            "pages": [
                {"number": 1, "source_text_sha256": digest("\n".join(lines).encode()), "lines": lines},
                {"number": 2, "source_text_sha256": digest(b""), "lines": []},
            ],
        }
        self.translation = {
            "schema_version": 1,
            "term_id": self.term_id,
            "session_id": "s01",
            "source_sha256": sha,
            "pages": [
                {
                    "number": 1,
                    "source_text_sha256": self.source["pages"][0]["source_text_sha256"],
                    "text_reviewed": True,
                    "image_text_reviewed": True,
                    "blocks": [
                        {"source_lines": [0], "kind": "heading", "fa": "متن نمایان صفحهٔ اصلی"},
                        {
                            "source_lines": [1],
                            "kind": "not_visible",
                            "fa": "",
                            "verified": True,
                            "reason_fa": "این سطر زیر نوار آبی روی صفحهٔ اصلی پوشیده شده است.",
                        },
                    ],
                    "image_text": [{"en": "Input", "fa": "ورودی (Input)", "verified": True}],
                },
                {
                    "number": 2,
                    "source_text_sha256": self.source["pages"][1]["source_text_sha256"],
                    "text_reviewed": True,
                    "image_text_reviewed": True,
                    "blocks": [],
                    "image_text": [{"en": "The End", "fa": "پایان", "verified": True}],
                },
            ],
        }
        self.flush()

    def tearDown(self):
        self.temp.cleanup()

    def flush(self):
        for name, data in (
            (f"data/metadata/{self.term_id}.json", self.metadata),
            (f"data/metadata/{self.term_id}-slide-identity.json", self.identity),
            (f"content/source-slides/{self.term_id}/s01.json", self.source),
            (f"content/translations/{self.term_id}/s01.json", self.translation),
        ):
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    def load(self, **kwargs):
        kwargs.setdefault("term_id", self.term_id)
        return load_source_translation("s01", self.root, **kwargs)

    def invalid(self, pattern, **kwargs):
        self.flush()
        with self.assertRaisesRegex(ValueError, pattern):
            self.load(**kwargs)

    def test_combined_payload_preserves_provenance_and_image_only_page(self):
        payload = self.load()
        self.assertEqual(payload["schema_version"], 1)
        self.assertEqual(payload["session_id"], "s01")
        self.assertEqual(payload["source"], self.source["source"])
        self.assertEqual(payload["pages"][0]["lines"], self.source["pages"][0]["lines"])
        self.assertEqual(payload["pages"][0]["blocks"], self.translation["pages"][0]["blocks"])
        self.assertEqual(payload["pages"][1]["blocks"], [])
        payload["pages"][0]["blocks"][0]["fa"] = "تغییر آزمایشی"
        self.assertNotEqual(self.load()["pages"][0]["blocks"][0]["fa"], "تغییر آزمایشی")

    def test_verified_editorial_note_is_separate_from_original_and_translation(self):
        note = {'session_id':'s01', 'page':1, 'source_sha256':self.source['source']['sha256'],
                'kind':'arithmetic_correction', 'verified':True,
                'fa':'یادداشت مستقل: حساب عددی چاپ‌شده با نتیجهٔ تقسیم سازگار نیست.'}
        path = self.root/f'data/metadata/{self.term_id}-editorial-notes.json'
        document = {'schema_version':1, 'term_id':self.term_id, 'notes':[note]}
        path.write_text(json.dumps(document))
        payload = self.load()
        self.assertEqual(payload['pages'][0]['editorial_notes'], [note])
        self.assertEqual(payload['pages'][0]['blocks'], self.translation['pages'][0]['blocks'])
        self.assertEqual(payload['pages'][0]['lines'], self.source['pages'][0]['lines'])
        note['verified'] = False
        path.write_text(json.dumps(document))
        with self.assertRaisesRegex(ValueError, 'verified correction'):
            self.load(require_reviewed=False)
        note['verified'] = True
        note['source_sha256'] = '0'*64
        path.write_text(json.dumps(document))
        with self.assertRaisesRegex(ValueError, 'Stale editorial'):
            self.load()

    def test_schema_and_session_identity_are_strict(self):
        for document, field, value, message in (
            (self.translation, "schema_version", True, "schema"),
            (self.translation, "schema_version", 2, "schema"),
            (self.translation, "session_id", "s02", "identity"),
            (self.translation, "term_id", "spring-2025", "identity"),
            (self.source, "schema_version", "1", "schema"),
        ):
            previous = document[field]
            document[field] = value
            self.invalid(message)
            document[field] = previous
        for value in ("../s01", "s1", "s01/../../other", True, None):
            with self.assertRaisesRegex(ValueError, "session ID"):
                load_source_translation(value, self.root)

    def test_rejects_corrupt_source_catalog_and_missing_page_fields(self):
        for name, value, error in (
            ("url", 7, "invalid source URL"),
            ("sha256", "wrong", "invalid source SHA-256"),
            ("page_count", True, "invalid source page count"),
        ):
            before = self.source["source"][name]
            self.source["source"][name] = value
            self.invalid(error)
            self.source["source"][name] = before
        for name, value, error in (
            ("blocks", {}, "blocks must be a list"),
            ("image_text", {}, "image_text must be a list"),
            ("number", True, "translation page order"),
        ):
            page = self.translation["pages"][0]
            before = page[name]
            page[name] = value
            self.invalid(error)
            page[name] = before

    def test_rejects_invalid_json_and_non_object_documents(self):
        path = self.root / f"content/translations/{self.term_id}/s01.json"
        for contents, message in (("{broken", "Invalid source-reader JSON"), ("[]", "JSON object")):
            path.write_text(contents)
            with self.assertRaisesRegex(ValueError, message):
                self.load()

    def test_rejects_stale_translation_and_source_text_hashes(self):
        self.translation["source_sha256"] = "0" * 64
        self.invalid("stale translation source")
        self.translation["source_sha256"] = self.source["source"]["sha256"]
        self.translation["pages"][0]["source_text_sha256"] = "0" * 64
        self.invalid("stale translation page hash")
        self.translation["pages"][0]["source_text_sha256"] = self.source["pages"][0]["source_text_sha256"]
        self.source["pages"][0]["lines"][0] = "Changed English extraction"
        self.invalid("stale source text hash")

    def test_rejects_missing_duplicate_and_non_integer_line_indices(self):
        blocks = self.translation["pages"][0]["blocks"]
        original = json.loads(json.dumps(blocks))
        mutations = (
            ([original[0]], "incomplete source-line coverage"),
            ([{**original[0], "source_lines": [0, 0]}, original[1]], "duplicate source line"),
            ([original[0], {**original[1], "source_lines": [0]}], "duplicate source line"),
            ([{**original[0], "source_lines": [True]}, original[1]], "integer indices"),
            ([{**original[0], "source_lines": [0.0]}, original[1]], "integer indices"),
            ([{**original[0], "source_lines": [-1]}, original[1]], "integer indices"),
            ([{**original[0], "source_lines": [2]}, original[1]], "integer indices"),
            ([{**original[0], "source_lines": []}, original[1]], "missing source_lines"),
        )
        for value, error in mutations:
            with self.subTest(value=value):
                self.translation["pages"][0]["blocks"] = value
                self.invalid(error)
        self.translation["pages"][0]["blocks"] = original

    def test_rejects_page_count_and_order_corruption(self):
        original = self.translation["pages"][:]
        self.translation["pages"] = original[::-1]
        self.invalid("translation page order")
        self.translation["pages"] = original[:1]
        self.invalid("translation page count")
        self.translation["pages"] = original
        self.source["pages"] = self.source["pages"][::-1]
        self.invalid("source page order")
        self.source["pages"].reverse()
        self.source["source"]["page_count"] = 3
        self.invalid("page count differs from metadata")

    def test_source_page_counts_must_match_both_inventories(self):
        self.identity["records"][0]["page_count"] = 3
        self.invalid("differs from original-slide identity")
        self.identity["records"][0]["page_count"] = 2
        self.metadata["term"]["schedule"][0]["slides"][0]["page_count"] = True
        self.invalid("page count differs from metadata")

    def test_visible_english_override_is_verified_preserved_and_never_embedded_as_html(self):
        block = self.translation["pages"][0]["blocks"][0]
        override = "Visible part only: x < 1; <script>alert('text')</script>"
        block.update(
            visible_en=override,
            verified=True,
            reason_fa="در این سطر، نیمهٔ سمت راست زیر نمودار اصلی پوشیده شده است.",
        )
        self.flush()
        payload = self.load()
        result = payload["pages"][0]["blocks"][0]
        self.assertEqual(result["visible_en"], override)
        self.assertEqual(result["source_lines"], [0])
        self.assertEqual(payload["pages"][0]["lines"], self.source["pages"][0]["lines"])
        self.assertEqual(payload["pages"][0]["source_text_sha256"], self.source["pages"][0]["source_text_sha256"])
        result["visible_en"] = "changed return value"
        self.assertEqual(self.load()["pages"][0]["blocks"][0]["visible_en"], override)
        html = source_reader_page(
            {"id": self.term_id}, {"id": "s01"},
            {"supervisor_fa": "دکتر نگار مجمع"}, self.load(),
        )
        self.assertNotIn(override, html)
        self.assertNotIn("<script>alert('text')</script>", html)

    def test_visible_english_override_cannot_bypass_review_or_source_coverage(self):
        block = self.translation["pages"][0]["blocks"][0]
        block.update(
            visible_en="Visible English fragment",
            verified=True,
            reason_fa="قسمت پایانی این سطر با مستطیل شکل در منبع پوشیده شده است.",
        )
        for field, value, message in (
            ("visible_en", "", "visible_en must be a nonempty string"),
            ("visible_en", " ", "visible_en must be a nonempty string"),
            ("visible_en", None, "visible_en must be a nonempty string"),
            ("visible_en", [], "visible_en must be a nonempty string"),
            ("verified", False, "unverified visible_en"),
            ("verified", 1, "unverified visible_en"),
            ("reason_fa", "partial", "specific reason_fa"),
        ):
            previous = block[field]
            block[field] = value
            self.invalid(message, require_reviewed=False)
            block[field] = previous
        self.translation["pages"][0]["blocks"][1]["visible_en"] = "Must not resurface hidden text"
        self.invalid("not_visible cannot have visible_en")
        del self.translation["pages"][0]["blocks"][1]["visible_en"]
        block["source_lines"] = [0, 1]
        self.invalid("duplicate source line")

    def test_not_visible_is_verified_reasoned_and_empty(self):
        block = self.translation["pages"][0]["blocks"][1]
        for field, value, message in (
            ("verified", False, "unverified not_visible"),
            ("verified", 1, "unverified not_visible"),
            ("reason_fa", "hidden", "specific reason_fa"),
            ("reason_fa", "", "specific reason_fa"),
            ("fa", "متن پنهان را نباید نشان داد", "must have empty fa"),
        ):
            previous = block[field]
            block[field] = value
            self.invalid(message, require_reviewed=False)
            block[field] = previous

    def test_review_flags_and_image_verification_must_be_actual_booleans(self):
        page = self.translation["pages"][0]
        for name in ("text_reviewed", "image_text_reviewed"):
            page[name] = False
            self.invalid(f"{name} is pending")
            self.flush()
            self.assertFalse(self.load(require_reviewed=False)["pages"][0][name])
            page[name] = 1
            self.invalid(f"{name} must be boolean", require_reviewed=False)
            page[name] = True
        page["image_text"][0]["verified"] = False
        self.invalid("unverified image text")
        self.flush()
        self.assertFalse(self.load(require_reviewed=False)["pages"][0]["image_text"][0]["verified"])
        page["image_text"][0]["verified"] = 1
        self.invalid("invalid image verification", require_reviewed=False)

    def test_rejects_empty_blocks_unknown_kinds_and_placeholder_pages(self):
        block = self.translation["pages"][0]["blocks"][0]
        for field, value, message in (
            ("fa", "  ", "empty Persian"),
            ("fa", "ترجمه در حال آماده‌سازی است", "placeholder translation"),
            ("fa", "TODO", "placeholder translation"),
            ("kind", "unknown", "invalid block kind"),
            ("kind", [], "invalid block kind"),
            ("latex", " ", "empty LaTeX"),
        ):
            before = block.get(field)
            block[field] = value
            self.invalid(message)
            if before is None:
                del block[field]
            else:
                block[field] = before
        self.translation["pages"][1]["image_text"] = []
        self.invalid("empty page placeholder")

    def test_image_latex_is_preserved_and_invalid_values_are_rejected(self):
        label = self.translation["pages"][0]["image_text"][0]
        original_fa = label["fa"]
        label["latex"] = r"\frac{1}{1+e^{-z}}"
        self.flush()
        loaded = self.load()["pages"][0]["image_text"][0]
        self.assertEqual(loaded["latex"], label["latex"])
        self.assertEqual(loaded["fa"], original_fa)
        for value in ("", "  ", False, [], None):
            label["latex"] = value
            self.invalid("empty image LaTeX")

    def test_legibility_limits_are_explicit_and_do_not_relax_coverage(self):
        page = self.translation["pages"][1]
        page["image_text"] = []
        page["image_text_limits"] = {"reason_fa": "نوشته‌های کوچک در عکس منبع به علت وضوح پایین خوانا نیستند.", "verified": True}
        self.flush()
        self.assertIn("image_text_limits", self.load()["pages"][1])
        for bad in ("", "unreadable", {}, [], {"reason_fa": "نامشخص"}):
            page["image_text_limits"] = bad
            self.invalid("image.*(?:reason|limits)")
        page["image_text_limits"] = "نوشته‌های ریز عکس اصلی پس از بزرگ‌نمایی نیز خوانا نیستند."
        self.translation["pages"][0]["blocks"].pop()
        self.invalid("incomplete source-line coverage")

    def test_original_bytes_are_rechecked_on_every_load(self):
        self.load()
        self.pdf.write_bytes(self.pdf.read_bytes() + b"changed")
        with self.assertRaisesRegex(ValueError, "original PDF bytes differ"):
            self.load()

    def test_source_paths_and_symlinked_pdf_inputs_are_rejected(self):
        self.load()
        moved = self.pdf.with_suffix(".real")
        self.pdf.rename(moved)
        self.pdf.symlink_to(moved)
        with self.assertRaisesRegex(ValueError, "Symlink source-reader input"):
            self.load()
        self.pdf.unlink()
        moved.rename(self.pdf)
        folder = self.pdf.parent
        moved_folder = folder.with_name("real-originals")
        folder.rename(moved_folder)
        folder.symlink_to(moved_folder, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "Symlink source-reader input"):
            self.load()

    def test_catalog_cannot_substitute_another_pdf_or_escape_allowed_directory(self):
        self.source["source"]["local_url"] = "/deep-learning/../private.pdf"
        self.invalid("Invalid original-slide path")
        self.source["source"]["local_url"] = f"/deep-learning/assets/danna/{self.term_id}/s01.pdf"
        self.identity["records"][0]["local_file"] = "../private.pdf"
        self.invalid("Invalid original-slide path")

    def test_html_contract_identity_safe_links_and_escaping(self):
        payload = self.load()
        title = 'عنوان </script><script>alert("x")</script> & متن'
        html = source_reader_page(
            {"id": self.term_id, "title_fa": "عنوان ترم"},
            {"id": "s01", "title_fa": title, "workshop": {"session_id": "s01"}},
            {"supervisor_fa": "دکتر نگار مجمع"},
            payload,
        )
        parser = ReaderParser()
        parser.feed(html)
        config = json.loads(parser.config)
        self.assertEqual(
            config,
            {
                "term": self.term_id,
                "session": "s01",
                "pdfUrl": payload["source"]["local_url"],
                "translationUrl": f"/deep-learning/source-translations/{self.term_id}/s01.json",
                "pageCount": 2,
                "sourceSha256": payload["source"]["sha256"],
            },
        )
        self.assertNotIn("<", parser.config)
        self.assertNotIn('<script>alert("x")</script>', html)
        self.assertIn("&lt;/script&gt;&lt;script&gt;", html)
        self.assertIn("استاد: دکتر نگار مجمع", html)
        self.assertIn("Danna Gurari", html)
        self.assertIn('src="/deep-learning/assets/university-logo.png"', html)
        self.assertNotIn("HIDDEN EXTRACTION MUST NOT BE RENDERED", html)
        self.assertNotIn("VISIBLE ORIGINAL", html)
        for attr in (
            "data-original-download", "data-session-workshop", "data-source-text",
            "data-reader-status", "data-pdf-progress", "data-prev-page", "data-next-page",
            "data-page-select", "data-page-count", "data-view-source", "data-view-translation",
            "data-fullscreen", "data-print", "data-zoom-in", "data-zoom-out",
        ):
            self.assertEqual(len(parser.attr(attr)), 1, attr)
        self.assertEqual(parser.attr("data-view-source")[0][1]["aria-pressed"], "true")
        self.assertEqual(parser.attr("data-view-translation")[0][1]["aria-pressed"], "false")
        self.assertEqual(parser.attr("data-original-download")[0][1]["href"], payload["source"]["local_url"])
        self.assertEqual(parser.attr("data-session-workshop")[0][1]["href"], f"/deep-learning/terms/{self.term_id}/s01/#workshop")
        classes = {c for _, attrs in parser.elements for c in attrs.get("class", "").split()}
        self.assertTrue({"source-reader", "reader-header", "reader-layout", "reader-original", "reader-translation", "source-page"} <= classes)
        ids = {attrs.get("id") for _, attrs in parser.elements}
        self.assertTrue({"source-canvas", "source-links", "persian-page"} <= ids)
        self.assertIn("<noscript>", html)
        for path in ("course.css", "source-reader.css", "vendor/katex/katex.min.css", "source-reader.js"):
            self.assertIn(f"/deep-learning/assets/{path}", html)

    def test_html_refuses_wrong_local_or_source_identity(self):
        payload = self.load()
        term = {"id": self.term_id}
        row = {"id": "s01"}
        identity = {"supervisor_fa": "دکتر نگار مجمع"}
        with self.assertRaisesRegex(ValueError, "local instructor"):
            source_reader_page(term, row, {"supervisor_fa": "Danna Gurari"}, payload)
        with self.assertRaisesRegex(ValueError, "page identity"):
            source_reader_page(term, {"id": "s02"}, identity, payload)
        payload["source"]["local_url"] = "javascript:alert(1)"
        with self.assertRaisesRegex(ValueError, "PDF path mismatch"):
            source_reader_page(term, row, identity, payload)


    def test_term_boundary_and_identity_inventory_are_enforced(self):
        for value in ("spring-2025", "../spring-2026", None, True, []):
            with self.assertRaisesRegex(ValueError, "Unsupported source-reader term"):
                self.load(term_id=value)
        other = "spring-2026" if self.term_id == "spring-2022" else "spring-2022"
        self.identity["term_id"] = other
        self.invalid("invalid original-slide inventory identity")
        self.identity["term_id"] = self.term_id
        self.identity["records"][0]["local_file"] = f"assets/danna/{other}/s01.pdf"
        self.invalid("Invalid original-slide path")

    def test_default_is_2022_and_does_not_guess_an_available_term(self):
        if self.term_id == "spring-2022":
            self.assertEqual(load_source_translation("s01", self.root)["term_id"], self.term_id)
        else:
            with self.assertRaisesRegex(ValueError, "Unreadable source-reader input"):
                load_source_translation("s01", self.root)
        self.assertEqual(self.load()["source"]["license_notice"], self.license_notice)

    def test_html_preserves_source_license_and_omits_absent_workshop(self):
        html = source_reader_page(
            {"id": self.term_id}, {"id": "s01"},
            {"supervisor_fa": "دکتر نگار مجمع"}, self.load(),
        )
        parser = ReaderParser(); parser.feed(html)
        self.assertFalse(parser.attr("data-session-workshop"))
        self.assertNotIn("#workshop", html)
        self.assertTrue(parser.attr("data-original-download"))
        self.assertIn(self.license_notice, html)
        self.assertEqual(json.loads(parser.config)["term"], self.term_id)
        self.assertIn(f"/deep-learning/terms/{self.term_id}/s01/", html)


class Spring2026SourceReaderTests(SourceReaderTests):
    term_id = "spring-2026"
    license_notice = "CC BY-NC-SA; version not printed on cover"


if __name__ == "__main__":
    unittest.main()
