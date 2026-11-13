"""Coverage claims must remain bound to a source page and an authored choice question."""

import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from source_activities import load_activities


class SourceActivityTests(unittest.TestCase):
    def test_lesson_four_sequence_input_question_is_linked_to_source_page(self):
        document = load_activities(ROOT, "spring-2026", "s04")
        page = document["pages"][40]
        by_id = {question["id"]: question for question in document["questions"]}
        self.assertIn("bptt-sequence-input", page["question_ids"])
        question = by_id["bptt-sequence-input"]
        self.assertEqual(question["source_page"], 41)
        self.assertEqual(question["answer"]["kind"], "choice")
        self.assertIn("پارامترهای مشترک", question["answer"]["options_fa"][question["answer"]["correct_index"]])

    def test_every_source_page_has_an_explicit_hash_bound_review_state(self):
        total = 0
        for path in sorted((ROOT / "content/activities/spring-2026").glob("*.json")):
            document = load_activities(ROOT, "spring-2026", path.stem)
            total += len(document["pages"])
            by_id = {q["id"]: q for q in document["questions"]}
            for page in document["pages"]:
                if page["question_coverage"] in {"complete", "partial"}:
                    self.assertTrue(page["question_ids"])
                for identity in page["question_ids"]:
                    self.assertIn(page["number"], by_id[identity]["pages"])
                    self.assertEqual(by_id[identity]["answer"]["kind"], "choice")
        self.assertEqual(total, 1303)

    def test_forward_and_loss_frames_do_not_inherit_future_weight_update_questions(self):
        document = load_activities(ROOT, "spring-2026", "s03")
        by_id = {q["id"]:q for q in document["questions"]}
        self.assertFalse(document["pages"][67]["question_ids"])
        self.assertEqual(document["pages"][70]["question_ids"], ["forward-o5"])
        loss_ids = document["pages"][74]["question_ids"]
        self.assertTrue(loss_ids)
        self.assertTrue(all(by_id[i]["source_page"] in (74,75) for i in loss_ids))
        self.assertFalse(any("direction" in i or "update-symbolic" in i for i in loss_ids))

    def test_stale_source_text_or_unsupported_completion_is_rejected(self):
        source = json.loads((ROOT / "content/source-slides/spring-2026/s01.json").read_text())
        document = load_activities(ROOT, "spring-2026", "s01")
        for corrupt in ("hash", "claim"):
            with self.subTest(corrupt=corrupt), tempfile.TemporaryDirectory() as folder:
                root = Path(folder)
                target = root / "content/activities/spring-2026/s01.json"
                original = root / "content/source-slides/spring-2026/s01.json"
                target.parent.mkdir(parents=True)
                original.parent.mkdir(parents=True)
                altered = copy.deepcopy(document)
                if corrupt == "hash":
                    altered["pages"][0]["source_text_sha256"] = "0" * 64
                else:
                    altered["pages"][0].update(review_status="reviewed", question_coverage="complete", question_ids=[])
                target.write_text(json.dumps(altered))
                original.write_text(json.dumps(source))
                with self.assertRaises(ValueError):
                    load_activities(root, "spring-2026", "s01")
