"""Independent source arithmetic and mathematical invariants for the 2026 workshops."""

import contextlib
import io
import itertools
import math
import unittest
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def execute(session, changes=None):
    code = (ROOT / f"workshops/spring-2026/{session}.py").read_text()
    for old, new in (changes or {}).items():
        if old not in code:
            raise AssertionError(f"Teaching parameter not found: {old}")
        code = code.replace(old, new, 1)
    scope = {}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(compile(code, f"{session}.py", "exec"), scope)
    return scope


class WorkshopNumericalTests(unittest.TestCase):
    def test_source_backprop_passes_all_eleven_central_differences(self):
        scope = execute("s03")
        parameters = scope["source_parameters"]
        forward = scope["source_forward"]
        network = scope["result"]["source_network"]
        self.assertAlmostEqual(network["forward"]["z4"], -0.7)
        self.assertAlmostEqual(network["forward"]["z5"], 0.1)
        self.assertAlmostEqual(network["forward"]["o4"], 1 / (1 + math.exp(0.7)))
        for name, analytic in network["squared_error_gradients"].items():
            with self.subTest(parameter=name):
                plus, minus = dict(parameters), dict(parameters)
                plus[name] += 1e-5
                minus[name] -= 1e-5
                numerical = (forward(plus)["squared_error"] - forward(minus)["squared_error"]) / 2e-5
                self.assertAlmostEqual(analytic, numerical, delta=2e-10)
                self.assertAlmostEqual(analytic, 2 * network["source_scaled_gradients"][name])
        # Input 2 is zero; its outgoing weights must not influence this example.
        self.assertEqual(network["squared_error_gradients"]["w24"], 0)
        self.assertEqual(network["squared_error_gradients"]["w25"], 0)
        # Source p75 drops factor 2: halving full-square LR gives the identical step.
        half_step = {k: v - 0.1 * network["source_scaled_gradients"][k] for k, v in parameters.items()}
        full_step = {k: v - 0.05 * network["squared_error_gradients"][k] for k, v in parameters.items()}
        self.assertEqual(half_step, full_step)
        self.assertLess(forward(full_step)["squared_error"], network["forward"]["squared_error"])

    def test_standalone_source_backprop_has_only_the_network_and_correct_derivatives(self):
        scope = execute("s03_backprop")
        self.assertNotIn("before", scope["result"])
        network = scope["result"]
        parameters = scope["source_parameters"]
        for name, gradient in network["squared_error_gradients"].items():
            plus, minus = dict(parameters), dict(parameters)
            plus[name] += 1e-5
            minus[name] -= 1e-5
            numerical = (scope["source_forward"](plus)["squared_error"] - scope["source_forward"](minus)["squared_error"]) / 2e-5
            self.assertAlmostEqual(gradient, numerical, delta=2e-10)
        self.assertAlmostEqual(network["forward"]["o6"], 0.47388889882398544)

    def test_standalone_source_stencil_has_source_grid_and_linear_response(self):
        scope = execute("s05_source_convolution")
        self.assertEqual(scope["result"]["feature_map"], [[4, 3, 4], [2, 4, 3], [2, 3, 4]])
        self.assertEqual(scope["result"]["bottom_right"], 4)
        doubled = [[2 * value for value in row] for row in scope["source_image"]]
        responses = scope["correlate"](doubled, scope["source_kernel"], 1)
        self.assertEqual(responses, [[2 * value for value in row] for row in scope["result"]["feature_map"]])

    def test_source_convolution_grid_and_shared_weight_count(self):
        scope = execute("s05")
        self.assertEqual(scope["result"]["source_feature_map"], [[4, 3, 4], [2, 4, 3], [2, 3, 4]])
        self.assertEqual(scope["result"]["source_weight_count"], 9)
        # A rectangular all-one filter sums each horizontal pair, with no flip.
        self.assertEqual(scope["correlate"]([[1, 2, 3], [4, 5, 6]], [[1, 1]], 1), [[3, 5], [9, 11]])
        for values, kernel, stride in [([], [[1]], 1), ([[1, 2], [3]], [[1]], 1), ([[1]], [[1, 2]], 1), ([[1]], [[1]], 0)]:
            with self.subTest(values=values, stride=stride), self.assertRaises(ValueError):
                scope["correlate"](values, kernel, stride)

    def test_transposed_convolution_is_the_adjoint_of_cross_correlation(self):
        correlate = execute("s05")["correlate"]
        transpose = execute("s10")["transposed_convolution"]
        kernel = [[1, -2, 3], [4, 0, -1]]
        for stride in (1, 2):
            probe = [[2, -1], [0, 3]]
            transposed = transpose(probe, kernel, stride)
            image = [[(r + 2) * (c - 1) for c in range(len(transposed[0]))] for r in range(len(transposed))]
            correlated = correlate(image, kernel, stride)
            left = sum(x * y for row, other in zip(correlated, probe) for x, y in zip(row, other))
            right = sum(x * y for row, other in zip(image, transposed) for x, y in zip(row, other))
            self.assertEqual(left, right)
            self.assertEqual(sum(map(sum, transposed)), sum(map(sum, probe)) * sum(map(sum, kernel)))

    def test_transpose_source_arrays_and_shape_errors(self):
        scope = execute("s10")
        self.assertEqual(scope["result"]["stride_1"], [[0, 0, 1], [0, 4, 6], [4, 12, 9]])
        self.assertEqual(scope["result"]["stride_2"], [[0, 0, 0, 1], [0, 0, 2, 3], [0, 2, 0, 3], [4, 6, 6, 9]])
        for values, kernel, stride in [([], [[1]], 1), ([[1]], [], 1), ([[1], [2, 3]], [[1]], 1), ([[1]], [[1]], True)]:
            with self.subTest(values=values, stride=stride), self.assertRaises(ValueError):
                scope["transposed_convolution"](values, kernel, stride)

    def test_quantization_error_by_exact_decimal_arithmetic(self):
        r = execute("s09")["result"]
        # Distances from original source decimals to their nearest codebook entry.
        squared_errors = [Fraction(2, 10)**2, Fraction(1, 10)**2, Fraction(1, 10)**2,
                          Fraction(1, 10)**2, 0, Fraction(7, 100)**2, Fraction(1, 10)**2, 0, 0]
        self.assertAlmostEqual(r["mean_squared_error"], float(sum(squared_errors) / 9))
        self.assertEqual(r["indices"], [1, 3, 2, 1, 0, 1, 3, 2, 1])
        self.assertEqual(r["total_quantized_bits"], 9 * 2 + 4 * 32)
        self.assertAlmostEqual(r["compression_ratio"], 288 / 146)

    def test_attention_source_logits_exact_softmax_and_convex_hull(self):
        for session, expected_scores in [("s12", [2, 0, 3, 3]), ("s13", [2, 4, 4])]:
            scope = execute(session)
            r = scope["result"]
            self.assertEqual(r["scores"], expected_scores)
            self.assertAlmostEqual(sum(r["weights"]), 1)
            for score, weight in zip(expected_scores, r["weights"]):
                self.assertAlmostEqual(weight, math.exp(score) / sum(map(math.exp, expected_scores)))
            values = scope["inputs"] if session == "s12" else scope["values"]
            output = r["context"] if session == "s12" else r["output"]
            for column, number in enumerate(output):
                self.assertGreaterEqual(number, min(row[column] for row in values))
                self.assertLessEqual(number, max(row[column] for row in values))
        # Source approximation 0,.5,.5 is explicitly separate; the exact first weight is positive.
        r = execute("s13")["result"]
        self.assertGreater(r["weights"][0], 0.06)
        self.assertEqual(r["slide_approximation_output"], [2.0, 7.0, 1.5])
        self.assertNotEqual(r["output"], r["slide_approximation_output"])
        changed = execute("s13", {"query = [1, 0, 2]": "query = [2, 0, 2]"})["result"]
        self.assertIsNone(changed["slide_approximation_output"])
        # A consistent fourth key/value is valid exact attention, with no fabricated slide approximation.
        expanded = execute("s13", {
            "keys = [[0, 1, 1], [4, 4, 0], [2, 3, 1]]": "keys = [[0, 1, 1], [4, 4, 0], [2, 3, 1], [1, 0, 0]]",
            "values = [[1, 2, 3], [2, 8, 0], [2, 6, 3]]": "values = [[1, 2, 3], [2, 8, 0], [2, 6, 3], [0, 0, 0]]",
        })["result"]
        self.assertEqual(len(expanded["weights"]), 4)
        self.assertIsNone(expanded["slide_approximation_output"])

    def test_attention_does_not_truncate_mismatched_dimensions(self):
        scope = execute("s12")
        with self.assertRaises(ValueError):
            scope["dot"]([1, 2], [3])
        for scores in ([], [float("inf")], [float("nan")]):
            with self.assertRaises(ValueError):
                scope["softmax"](scores)
        self.assertEqual(scope["softmax"]([10000, 10000]), [0.5, 0.5])
        for old, new in [("query = [1, 0, 2]", "query = [1]"), ("values = [[1, 2, 3], [2, 8, 0], [2, 6, 3]]", "values = [[1, 2, 3]]")]:
            with self.assertRaises(ValueError):
                execute("s13", {old: new})

    def test_standardization_uses_training_statistics_and_population_variance(self):
        scope = execute("s06")
        r = scope["result"]
        for column in zip(*r["standardized_training"]):
            self.assertAlmostEqual(sum(column) / len(column), 0)
            self.assertAlmostEqual(sum(x*x for x in column) / len(column), 1)
        changed = execute("s06", {"test = [7.0, 40.0]": "test = [70.0, 400.0]"})["result"]
        self.assertEqual(r["means"], changed["means"])
        self.assertEqual(r["scales"], changed["scales"])
        with self.assertRaises(ValueError):
            execute("s06", {"training = [[1.0, 10.0], [3.0, 20.0], [5.0, 30.0]]": "training = [[1.0, 5.0], [2.0, 5.0]]"})
        with self.assertRaises(ValueError):
            scope["transform"]([1])

    def test_majority_matches_exhaustive_bernoulli_outcomes(self):
        scope = execute("s07", {"classifiers = 11": "classifiers = 3"})
        exact = sum(Fraction(1, 4)**sum(bits) * Fraction(3, 4)**(3-sum(bits))
                    for bits in itertools.product((0, 1), repeat=3) if sum(bits) >= 2)
        self.assertEqual(scope["result"]["ensemble_error"], float(exact))
        for change in ({"classifiers = 11": "classifiers = 4"}, {"individual_error = 0.25": "individual_error = 1.1"}):
            with self.assertRaises(ValueError):
                execute("s07", change)

    def test_vqa_leave_one_out_matches_source_answer_counts(self):
        r = execute("s11")["result"]
        self.assertEqual(r["scores"]["right"], 1)
        for answer in ("left", "right side", "center"):
            self.assertAlmostEqual(r["scores"][answer], 0.3)
        self.assertEqual(r["scores"]["bottom"], 0)
        with self.assertRaises(ValueError):
            execute("s11")["held_out_score"]("right", ["right"])

    def test_lora_merge_recovers_base_when_adapter_is_zero(self):
        scope = execute("s18")
        self.assertEqual(scope["result"]["base_output"], [-1, 2])
        self.assertEqual(scope["result"]["merged_output"], [3, 0])
        result = execute("s18", {"B = [[2.0], [-1.0]]": "B = [[0.0], [0.0]]"})["result"]
        self.assertEqual(result["base_output"], result["merged_output"])
        with self.assertRaises(ValueError):
            execute("s18", {"A = [[0.5, -1.0, 0.0]]": "A = [[0.5, -1.0]]"})
        with self.assertRaises(ValueError):
            scope["matvec"]([[1, 2]], [1])

    def test_moe_all_experts_equal_dense_and_temperature_preserves_ranking(self):
        base = execute("s23")["result"]
        dense = execute("s23", {"top_k = 2": "top_k = 3"})["result"]
        warm = execute("s23", {"temperature = 1.0": "temperature = 2.0"})["result"]
        self.assertEqual(dense["sparse_output"], dense["dense_output"])
        self.assertEqual(base["selected_experts"], warm["selected_experts"])
        self.assertLess(warm["probabilities"][0], base["probabilities"][0])
        self.assertLess(base["selected_probability_mass"], 1)
        self.assertAlmostEqual(base["sparse_output"] - base["dense_output"], 4 * base["probabilities"][2])
        with self.assertRaises(ValueError):
            execute("s23", {"top_k = 2": "top_k = 1.5"})

    def test_patch_pair_count_uses_all_ordered_pairs_including_self(self):
        r = execute("s14")["result"]
        self.assertEqual(r["patch_tokens"], 100)
        self.assertEqual(r["with_cls_pairs"], 10201)
        self.assertEqual(r["full_hd_pixel_pairs"], 4299816960000)
        for new in ("patch_side = 0", "patch_side = 3"):
            with self.assertRaises(ValueError):
                execute("s14", {"patch_side = 16": new})

    def test_power_law_half_loss_factors_satisfy_original_equation(self):
        scope = execute("s16")
        for name, factor in scope["result"]["factors_for_half_loss"].items():
            self.assertAlmostEqual(factor ** (-scope["exponents"][name]), 0.5)
        with self.assertRaises(ValueError):
            execute("s16", {"target_ratio = 0.5": "target_ratio = 0"})

    def test_sampling_ties_and_budget_bounds_are_explicit(self):
        tied = execute("s17", {"n_paths = 5": "n_paths = 7"})["result"]
        self.assertEqual(tied["winners"], [18, 26])
        self.assertIsNone(tied["selected_answer"])
        for new in ("n_paths = -1", "n_paths = 8"):
            with self.assertRaises(ValueError):
                execute("s17", {"n_paths = 5": new})
        radii = [execute("s26", {"budget = 2": f"budget = {n}"})["result"]["coverage_radius"] for n in (1, 2, 3)]
        self.assertEqual(radii, sorted(radii, reverse=True))
        self.assertAlmostEqual(radii[-1], 0.2)
        with self.assertRaises(ValueError):
            execute("s26", {"budget = 2": "budget = 0"})

    def test_training_and_test_error_remain_distinct(self):
        initial = execute("s01")["result"]
        changed = execute("s01", {"threshold = 0.5": "threshold = 0.7"})["result"]
        self.assertEqual(initial["training_accuracy"], 1)
        self.assertEqual(initial["test_accuracy"], 0)
        self.assertEqual(changed["training_accuracy"], 1)
        self.assertEqual(changed["test_accuracy"], 0.5)

    def test_residual_weight_follows_quadratic_gradient_descent(self):
        scope = execute("s08")
        history = scope["result"]["history"]
        factor = 1 - 2 * scope["learning_rate"] * scope["x"] ** 2
        for previous, current in zip(history, history[1:]):
            self.assertAlmostEqual(current["weight"], previous["weight"] * factor)
            self.assertAlmostEqual(current["loss"], previous["loss"] * factor ** 2)

    def test_pareto_dominance_keeps_ties_and_rejects_inferior_model(self):
        scope = execute("s31")
        b = {"name": "B", "accuracy": 0.89, "joules": 50}
        same = {"name": "copy", "accuracy": 0.89, "joules": 50}
        inferior = {"name": "D", "accuracy": 0.88, "joules": 60}
        self.assertFalse(scope["dominates"](b, same))
        self.assertTrue(scope["dominates"](b, inferior))
        self.assertEqual(scope["result"]["eligible"], ["B"])

    def test_fairness_gaps_do_not_follow_selection_parity(self):
        r = execute("s24")["result"]
        self.assertEqual(r["absolute_gaps"]["selection_rate"], 0)
        self.assertEqual(r["absolute_gaps"]["true_positive_rate"], 0.5)
        self.assertAlmostEqual(r["absolute_gaps"]["false_positive_rate"], 1/3)

    def test_parity_and_perceptron_contracts(self):
        scope = execute("s02")
        with self.assertRaises(ValueError):
            scope["predict"]([1, 2], [1], 0)
        for bits in itertools.product((0, 1), repeat=4):
            r = execute("s04", {"sequence = [1, 0, 1, 1]": f"sequence = {list(bits)}"})["result"]
            self.assertEqual(r["predicted_odd"], [sum(bits[:n]) % 2 for n in range(1, 5)])
        with self.assertRaises(ValueError):
            execute("s04", {"sequence = [1, 0, 1, 1]": "sequence = [2]"})


if __name__ == "__main__":
    unittest.main()
