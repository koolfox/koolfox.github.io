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

    def test_progressive_truth_table_only_asks_the_still_hidden_source_rows(self):
        document = load_activities(ROOT, "spring-2026", "s02")
        for page, count in [(21,8),(22,7),(23,6)]:
            ids = [i for i in document["pages"][page-1]["question_ids"] if i.startswith("majority-table-row-")]
            self.assertEqual(len(ids), count)
        self.assertNotIn("majority-table-row-1", document["pages"][21]["question_ids"])
        self.assertNotIn("majority-table-row-2", document["pages"][22]["question_ids"])

    def test_shared_notebook_question_cannot_escape_its_actual_example(self):
        from workshops import load_workshops
        unit = json.loads((ROOT / "content/workshops/spring-2026/s02.json").read_text())
        example = next(e for e in unit["source_examples"] if e["id"] == "majority-table")
        example["questions"][0]["pages"] = [21, 50]
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for name in ["content/workshops/spring-2026", "workshops/spring-2026", "data/metadata"]:
                (root/name).mkdir(parents=True)
            (root / "content/workshops/spring-2026/s02.json").write_text(json.dumps(unit))
            (root / "data/metadata/spring-2026.json").write_bytes((ROOT / "data/metadata/spring-2026.json").read_bytes())
            for name in ["s02.py"] + [e["code_file"] for e in unit["source_examples"]]:
                (root / "workshops/spring-2026" / name).write_bytes((ROOT / "workshops/spring-2026" / name).read_bytes())
            with self.assertRaisesRegex(ValueError, "outside source example"):
                load_workshops("spring-2026", root, session_ids=["s02"])

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
