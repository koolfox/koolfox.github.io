"""Published measurements must retain their denominator and validation protocol."""

import copy
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import mnist_reference


class MnistReferenceTests(unittest.TestCase):
    def setUp(self):
        self.reference = json.loads(
            (ROOT / "data/processed/mnist-reference.json").read_text()
        )

    def test_curated_measurements_and_source_hashes_are_consistent(self):
        mnist_reference.check_reference(self.reference)

    def test_a_changed_accuracy_or_denominator_cannot_be_published(self):
        for key, value in (("accuracy", 1.0), ("count", 1000)):
            score = copy.deepcopy(self.reference["runs"][0]["test"])
            score[key] = value
            with self.assertRaises(ValueError):
                mnist_reference.check_score(score)

    def test_test_evaluation_and_validation_selection_are_required(self):
        for key, value in (("test_evaluations", 5), ("selected_epoch", 99)):
            record = copy.deepcopy(self.reference)
            record["runs"][0][key] = value
            with self.assertRaises(ValueError):
                mnist_reference.check_reference(record)

    def test_reference_cannot_silently_point_to_other_source_code(self):
        self.reference["runs"][0]["source_sha256"]["train.py"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "no longer matches"):
            mnist_reference.check_reference(self.reference)


if __name__ == "__main__":
    unittest.main()
