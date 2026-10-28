"""Independent numerical identities and source/coverage boundaries for workshops."""

import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from workshops import load_workshops


class WorkshopTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.units = load_workshops("spring-2022", execute=True)

    def run_code(self, identity, replace=None):
        code = self.units[identity]["code"]
        for old, new in (replace or {}).items():
            self.assertIn(old, code)
            code = code.replace(old, new)
        scope = {}
        exec(compile(code, identity + ".py", "exec"), scope)  # noqa: S102 -- trusted teaching fixtures
        return scope["result"]

    def test_all_23_decks_have_three_question_types_and_executable_reference(self):
        self.assertEqual(len(self.units), 23)
        self.assertEqual(sum(len(u["questions"]) for u in self.units.values()), 69)
        self.assertEqual(
            sum(len(u["class_activity_pages"]) for u in self.units.values()), 11
        )

    def test_perceptron_correct_label_gives_zero_update(self):
        self.assertEqual(self.run_code("s02")["weights"], [-0.4, -0.8])
        self.assertEqual(
            self.run_code("s02", {"target = -1": "target = 1"})["weights"], [0, 0]
        )

    def test_xor_all_four_outputs_and_linear_counterexample(self):
        self.assertEqual(self.run_code("s04")["outputs"], [0, 1, 1, 0])
        self.assertEqual(
            self.run_code("s04", {"max(0.0, z)": "z"})["outputs"], [2, 1, 1, 0]
        )

    def test_bce_gradient_passes_central_difference_and_step_lowers_loss(self):
        result = self.run_code("s05")
        self.assertLess(result["max_difference"], 1e-9)
        self.assertLess(result["loss_after"], result["loss_before"])

    def test_validation_selection_is_not_last_epoch(self):
        r = self.run_code("s06")
        self.assertLess(r["selected_epoch"], 40)
        self.assertLess(r["selected_validation_loss"], r["last_validation_loss"])

    def test_filter_sum_box_overlap_and_mask_overlap(self):
        self.assertAlmostEqual(self.run_code("s07")["filtered"], 1)
        r = self.run_code("s12")
        self.assertAlmostEqual(r["box_iou"], 1 / 7)
        self.assertAlmostEqual(r["mask_iou"], 1 / 3)

    def test_recurrent_zero_weight_removes_initial_state_dependence(self):
        r = self.run_code("s13", {"recurrent_weight = 0.7": "recurrent_weight = 0.0"})
        self.assertEqual(r["sensitivity_to_initial_state"], [0] * 4)
        self.assertEqual(r["states"][1:], [0] * 3)

    def test_attention_has_no_future_leak_and_unmasking_changes_context(self):
        base = self.run_code("s16")
        self.assertEqual(base["attention"], [0.5, 0.5, 0])
        self.assertEqual(base["context"], [1, 2])
        self.assertEqual(self.run_code("s16", {"[9,9]": "[900,900]"}), base)
        self.assertNotEqual(
            self.run_code("s16", {"causal = True": "causal = False"})["context"],
            base["context"],
        )

    def test_vqa_uses_ten_subsets_not_full_set_approximation(self):
        for n, expected in [(0, 0), (1, 0.3), (2, 0.6), (3, 0.9), (4, 1)]:
            r = self.run_code(
                "s19", {"['red']*3 + ['blue']*7": f"['red']*{n} + ['blue']*{10 - n}"}
            )
            self.assertAlmostEqual(r["vqa_score"], expected)

    def test_distillation_temperature_softens_and_gradient_sums_to_zero(self):
        r = self.run_code("s26")
        self.assertAlmostEqual(sum(r["student_gradient"]), 0)
        hot = self.run_code("s26", {"temperature = 2.0": "temperature = 4.0"})
        self.assertGreater(hot["teacher_entropy"], r["teacher_entropy"])
        self.assertLess(hot["teacher_entropy"], math.log(3))

    def test_ctc_collapse_mass_and_wer_over_one(self):
        r = self.run_code("s28")
        self.assertAlmostEqual(r["ctc_probability_a"], 0.51)
        self.assertEqual(r["ctc_probability_aa"], 0)
        self.assertAlmostEqual(r["ctc_total_mass"], 1)
        r = self.run_code(
            "s28", {"['we','learn','today']": "['one','two','three','four','five']"}
        )
        self.assertGreater(r["word_error_rate"], 1)
