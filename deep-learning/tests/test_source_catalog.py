"""Evidence boundaries for official-course ingestion, independent of the network."""

import copy
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "source_catalog", ROOT / "scripts/source_catalog.py"
)
catalog = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(catalog)


class SourceCatalogTests(unittest.TestCase):
    def setUp(self):
        self.document = {
            "schema_version": 1,
            "term": {
                "id": "spring-2026",
                "title_fa": "بهار ۲۰۲۶",
                "course_url": "https://dannagurari.colorado.edu/courses/",
                "retrieved_at_utc": "2026-10-25T00:00:00Z",
                "schedule": [
                    {
                        "id": "s01",
                        "order": 1,
                        "title_en": "Example",
                        "title_fa": "مثال",
                        "slides": [
                            {
                                "url": "https://home.cs.colorado.edu/example.pdf",
                                "download_status": "ok",
                                "sha256": "a" * 64,
                                "page_count": 10,
                                "review_status": "text_extracted",
                                "visual_pages_reviewed": [],
                            }
                        ],
                    }
                ],
            },
        }

    def test_extraction_does_not_imply_teaching_release(self):
        result = catalog.inspect_term(self.document, "spring-2026")
        self.assertEqual(result["teaching_release_status"], "planned")
        self.assertEqual(result["review_counts"], {"text_extracted": 1})

    def test_shared_deck_is_not_double_counted(self):
        row = copy.deepcopy(self.document["term"]["schedule"][0])
        row.update(id="s02", order=2)
        self.document["term"]["schedule"].append(row)
        result = catalog.inspect_term(self.document, "spring-2026")
        self.assertEqual(result["sessions_with_slides"], 2)
        self.assertEqual(result["downloaded_deck_urls"], 1)
        self.assertEqual(result["pages_per_distinct_url"], 10)

    def test_unavailable_source_cannot_claim_review(self):
        self.document["term"]["schedule"][0]["slides"][0]["download_status"] = (
            "unavailable"
        )
        with self.assertRaisesRegex(ValueError, "unavailable source claims review"):
            catalog.inspect_term(self.document, "spring-2026")

    def test_visual_pages_must_exist(self):
        self.document["term"]["schedule"][0]["slides"][0]["visual_pages_reviewed"] = [
            11
        ]
        with self.assertRaisesRegex(ValueError, "outside PDF"):
            catalog.inspect_term(self.document, "spring-2026")

    def test_semester_identity_is_not_interchangeable(self):
        with self.assertRaisesRegex(ValueError, "identity mismatch"):
            catalog.inspect_term(self.document, "fall-2022")

    def test_recorded_five_terms_are_valid(self):
        index = catalog.build_index(ROOT / "data/metadata")
        self.assertEqual(len(index["terms"]), 5)
        self.assertTrue(
            all(term["downloaded_deck_urls"] > 0 for term in index["terms"])
        )


if __name__ == "__main__":
    unittest.main()
