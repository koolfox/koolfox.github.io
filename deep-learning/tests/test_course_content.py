"""A source audit must never silently become a finished Persian lesson."""

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import course_content
import review_ledger
from build_course import prose
from source_catalog import TERMS


class CourseContentTests(unittest.TestCase):
    def test_vector_notation_stays_one_ltr_run_and_html_is_escaped(self):
        rendered = prose("اگر x=(3, −1), w=(0.5, 2) و بایاس صفر باشد")
        self.assertIn('<bdi dir="ltr">x=(3, −1), w=(0.5, 2)</bdi>', rendered)
        self.assertNotIn('<script>', prose('اگر <script> باشد'))

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        (self.root / "data/metadata").mkdir(parents=True)
        for term in TERMS:
            document = {
                "term": {
                    "id": term,
                    "schedule": [
                        {
                            "id": "s01",
                            "slides": [
                                {
                                    "url": "https://example.org/slides.pdf",
                                    "sha256": "a" * 64,
                                    "download_status": "ok",
                                    "page_count": 2,
                                }
                            ],
                        }
                    ],
                }
            }
            (self.root / f"data/metadata/{term}.json").write_text(json.dumps(document))
        review_ledger.initialize(self.root)
        self.path = self.root / f"data/reviews/{TERMS[0]}/s01.json"
        self.record = json.loads(self.path.read_text())

    def save(self):
        self.path.write_text(json.dumps(self.record))

    def test_initialize_preserves_review_and_leaves_pages_pending(self):
        self.record["method"] = "human note"
        self.save()
        self.assertEqual(review_ledger.initialize(self.root), 0)
        self.assertEqual(json.loads(self.path.read_text())["method"], "human note")
        self.assertEqual(review_ledger.audit(self.root)["totals"]["fully_reviewed"], 0)

    def test_duplicate_or_missing_pages_rejected(self):
        self.record["pages"][1] = copy.deepcopy(self.record["pages"][0])
        self.save()
        with self.assertRaisesRegex(ValueError, "missing, duplicate"):
            review_ledger.audit(self.root)

    def test_visual_claim_requires_actual_evidence_reference(self):
        self.record.update(reviewer="reviewer", reviewed_at_utc="2026-10-25T00:00:00Z")
        self.record["pages"][0].update(visual_reviewed=True, note_fa="بررسی شد")
        self.save()
        with self.assertRaisesRegex(ValueError, "visual claim lacks evidence"):
            review_ledger.audit(self.root)

    def test_text_only_or_unresolved_science_is_not_reviewed(self):
        page = self.record["pages"][0]
        page.update(text_reviewed=True, scientific_status="checked")
        self.assertFalse(course_content.reviewed(self.record))
        for page in self.record["pages"]:
            page.update(
                text_reviewed=True,
                visual_reviewed=True,
                scientific_status="needs_verification",
            )
        self.assertFalse(course_content.reviewed(self.record))

    def test_without_mapping_and_concept_no_companion_can_be_ready(self):
        result = course_content.load_course(self.root)
        self.assertTrue(
            all(
                not r["companion_ready"] for t in result["terms"] for r in t["schedule"]
            )
        )

    def test_bad_exercise_values_and_choice_indices_rejected(self):
        exercise = {
            "id": "example",
            "source_kind": "original",
            "prompt_fa": "سؤال",
            "solution_fa": "پاسخ",
            "answer": {"kind": "number", "value": float("nan")},
        }
        with self.assertRaisesRegex(ValueError, "finite"):
            course_content.check_exercise(exercise)
        exercise["answer"] = {
            "kind": "choice",
            "options_fa": ["الف", "ب"],
            "correct_index": 2,
        }
        with self.assertRaisesRegex(ValueError, "Invalid choice"):
            course_content.check_exercise(exercise)


if __name__ == "__main__":
    unittest.main()
