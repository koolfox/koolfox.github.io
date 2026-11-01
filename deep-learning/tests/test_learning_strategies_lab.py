"""Independent analytic, finite-difference and enumeration checks."""

import importlib
import itertools
import json
import math
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python"))
lab = importlib.import_module("learning_strategies_lab")


class LearningStrategiesTests(unittest.TestCase):
    def test_all_presets_are_deterministic_finite_json_and_bounded_at_extremes(self):
        for name, spec in lab.PRESETS.items():
            with self.subTest(name=name):
                a = lab.run_experiment(name)
                self.assertEqual(a, lab.run_experiment(name))
                json.dumps(a, allow_nan=False)
                self.assertTrue(a["tables"])
                for extreme in ("min", "max"):
                    params = {k: b[extreme] for k, b in spec["bounds"].items()}
                    json.dumps(lab.run_experiment(name, **params), allow_nan=False)

    def test_autoencoder_zero_steps_forward_and_training(self):
        r = lab.run_experiment("autoencoder", steps=0)
        rows = r["tables"][0]["rows"]
        manual = (
            sum((row[0] - row[3]) ** 2 + (row[1] - row[4]) ** 2 for row in rows) / 8
        )
        self.assertAlmostEqual(r["metrics"]["final_mse"], manual)
        trained = lab.run_experiment("autoencoder")["metrics"]
        self.assertLess(trained["final_mse"], trained["initial_mse"] / 10)

    def test_gan_at_uniform_and_numerical_derivatives(self):
        a = lab.gan_objectives(0.0, 0.0)
        self.assertAlmostEqual(a["discriminator_loss"], math.log(2))
        self.assertAlmostEqual(a["generator_minimax"], -math.log(2) / 2)
        self.assertAlmostEqual(a["generator_nonsaturating"], math.log(2) / 2)
        self.assertAlmostEqual(a["minimax_logit_gradient"], -0.25)
        for z in (-8.0, -1.0, 2.0, 8.0):
            low, high = (
                lab.gan_objectives(0.8, z - 1e-5),
                lab.gan_objectives(0.8, z + 1e-5),
            )
            exact = lab.gan_objectives(0.8, z)
            for loss, gradient in (
                ("generator_minimax", "minimax_logit_gradient"),
                ("generator_nonsaturating", "nonsaturating_logit_gradient"),
                ("discriminator_loss", "discriminator_fake_gradient"),
            ):
                self.assertAlmostEqual(
                    (high[loss] - low[loss]) / 2e-5, exact[gradient], places=7
                )

    def test_contrastive_uniform_and_permutation(self):
        loss, rows, columns = lab.contrastive_loss([[0, 0], [0, 0]])
        self.assertAlmostEqual(loss, math.log(2))
        self.assertEqual(rows, columns)
        logits = [[2, 0, -1], [1, 3, 0], [-2, 1, 4]]
        perm = [2, 0, 1]
        other = [[logits[i][j] for j in perm] for i in perm]
        self.assertAlmostEqual(
            lab.contrastive_loss(logits)[0], lab.contrastive_loss(other)[0]
        )
        self.assertLess(
            lab.run_experiment("contrastive", rotation_degrees=0.0)["metrics"][
                "symmetric_loss"
            ],
            lab.run_experiment("contrastive", rotation_degrees=120.0)["metrics"][
                "symmetric_loss"
            ],
        )

    def test_multitask_has_closed_form_iterates(self):
        for w in (0.0, 0.25, 1.0):
            result = lab.run_experiment(
                "multitask",
                task_weight=w,
                initial_theta=2.0,
                steps=9,
                learning_rate=0.2,
            )
            optimum = 3 * w - 1
            expected = optimum + (2 - optimum) * 0.8**9
            self.assertAlmostEqual(result["metrics"]["final_theta"], expected)
        conflict = lab.run_experiment("multitask", initial_theta=0.0, steps=0)
        self.assertLess(conflict["metrics"]["final_gradient_product"], 0)

    def test_prototypes_use_only_support_and_normalize(self):
        a = lab.run_experiment("few-shot", shots=1)
        b = lab.run_experiment("few-shot", shots=1, query_x=-4.0, query_y=4.0)
        supports = a["tables"][0]["rows"]
        prototypes = a["tables"][1]["rows"]
        self.assertEqual(supports, b["tables"][0]["rows"])
        self.assertEqual([r[1:3] for r in supports], [r[1:3] for r in prototypes])
        self.assertAlmostEqual(sum(r[-1] for r in prototypes), 1)
        self.assertEqual(
            a["metrics"]["predicted_class"],
            min(range(3), key=lambda i: prototypes[i][-2]),
        )

    def test_distillation_gradient_includes_temperature_squared(self):
        student, teacher = [0.3, -0.7, 1.2], [2, 1, -2]
        for t, weight in ((0.5, 0.0), (1.0, 1.0), (5.0, 0.7)):
            loss, grad, _, _ = lab.distillation_objective(student, teacher, t, weight)
            self.assertTrue(math.isfinite(loss))
            self.assertAlmostEqual(sum(grad), 0.0)
            for i in range(3):
                low, high = student[:], student[:]
                low[i] -= 1e-5
                high[i] += 1e-5
                numeric = (
                    lab.distillation_objective(high, teacher, t, weight)[0]
                    - lab.distillation_objective(low, teacher, t, weight)[0]
                ) / 2e-5
                self.assertAlmostEqual(grad[i], numeric, places=7)
        result = lab.run_experiment("distillation")["metrics"]
        self.assertLess(result["final_loss"], result["initial_loss"])

    def test_quantization_error_bound_zero_vector_and_storage(self):
        weights = [-1.0, -0.2, 0.0, 0.5, 1.0]
        pruned, ints, decoded, scale = lab.quantize(weights, 4, 0)
        self.assertEqual(pruned, weights)
        self.assertTrue(
            all(abs(a - b) <= scale / 2 + 1e-12 for a, b in zip(weights, decoded))
        )
        self.assertEqual(lab.quantize(weights, 4, 2)[2], [0.0] * 5)
        result = lab.run_experiment("compression", threshold=2)["metrics"]
        self.assertEqual(result["remaining_nonzero"], 0)
        self.assertEqual(result["illustrative_sparse_bits"], 36)
        self.assertEqual(result["quantized_dense_bits"], 64)
        self.assertAlmostEqual(result["compressed_output"], 0)

    def test_active_selection_strategies_really_differ(self):
        entropy = lab.run_experiment("active-learning", strategy="entropy", budget=1)
        margin = lab.run_experiment("active-learning", strategy="margin", budget=1)
        self.assertEqual(entropy["tables"][1]["rows"][0][1], 2)
        self.assertEqual(margin["tables"][1]["rows"][0][1], 4)
        self.assertEqual(
            lab.run_experiment("active-learning", budget=8)["metrics"][
                "selected_count"
            ],
            8,
        )

    def test_bellman_terminal_and_discounted_policy_returns(self):
        self.assertEqual(lab.discounted_returns([1, 2, 3], 0.5), [2.75, 3.5, 3.0])
        for gamma in (0.0, 0.5, 0.99):
            m = lab.run_experiment("reinforcement", discount=gamma, iterations=3)[
                "metrics"
            ]
            self.assertAlmostEqual(m["value_state_0"], gamma)
            self.assertAlmostEqual(m["value_state_1"], 1.0)
            self.assertAlmostEqual(m["episode_return"], gamma)
        one = lab.run_experiment("reinforcement", discount=0.9, iterations=1)["metrics"]
        self.assertAlmostEqual(one["value_state_0"], 0.0)

    def test_ctc_collapse_repeated_labels_separated_by_blank(self):
        self.assertEqual(
            lab.ctc_collapse(["a", "a", "_", "a", "b", "b"]), ["a", "a", "b"]
        )
        self.assertEqual(lab.ctc_collapse(["_", "_"]), [])

    def test_ctc_dynamic_program_equals_exhaustive_paths(self):
        probs = [[0.2, 0.5, 0.3], [0.1, 0.6, 0.3], [0.4, 0.2, 0.4], [0.3, 0.3, 0.4]]
        symbols = ["_", "a", "b"]
        masses = {}
        for path in itertools.product(range(3), repeat=4):
            target = tuple(lab.ctc_collapse([symbols[i] for i in path]))
            mass = math.prod(probs[t][i] for t, i in enumerate(path))
            masses[target] = masses.get(target, 0) + mass
        self.assertAlmostEqual(sum(masses.values()), 1)
        for target, expected in masses.items():
            self.assertAlmostEqual(
                lab.ctc_probability(probs, target), expected, places=13
            )
        self.assertEqual(lab.ctc_probability(probs[:1], ["a", "a"]), 0)
        self.assertEqual(lab.ctc_probability([], []), 1)

    def test_dft_sinusoid_and_parseval(self):
        n, k = 32, 3
        x = [math.sin(2 * math.pi * k * i / n) for i in range(n)]
        power = lab.dft_power(x)
        self.assertAlmostEqual(power[k], 0.25)
        self.assertAlmostEqual(power[n - k], 0.25)
        self.assertAlmostEqual(sum(power), sum(v * v for v in x) / n)
        self.assertLess(
            sum(v for i, v in enumerate(power) if i not in (k, n - k)), 1e-25
        )
        self.assertEqual(
            lab.run_experiment("speech", frame_size=17)["tables"][0]["rows"],
            [[0, 0, 17], [1, 8, 25], [2, 16, 33]],
        )

    def test_wer_can_exceed_one(self):
        self.assertEqual(lab.word_error("a b c", "a x c"), (1, 1 / 3))
        self.assertEqual(lab.word_error("a", "b c d"), (3, 3.0))
        self.assertEqual(lab.word_error("a b", ""), (2, 1.0))
        with self.assertRaises(ValueError):
            lab.word_error("", "a")

    def test_transfer_frozen_parameter_really_stays_fixed(self):
        result = lab.run_experiment("transfer")
        rows = result["tables"][0]["rows"]
        self.assertEqual(rows[0][1], 0.5)
        self.assertNotEqual(rows[1][1], 0.5)
        zero = lab.run_experiment("transfer", steps=0)["metrics"]
        self.assertEqual(zero["frozen_mse"], zero["finetuned_mse"])

    def test_unknown_nonfinite_wrong_type_and_workload_rejected(self):
        invalid = [
            ("bad", {}),
            ("gan", {"real_logit": float("nan")}),
            ("gan", {"fake_logit": float("inf")}),
            ("autoencoder", {"seed": 1.0}),
            ("autoencoder", {"steps": True}),
            ("autoencoder", {"steps": 10000}),
            ("gan", {"wrong": 3}),
            ("contrastive", {"temperature": 0}),
            ("speech", {"reference": " "}),
            ("speech", {"reference": "x " * 81}),
            ("speech", {"hypothesis": []}),
            ("active-learning", {"strategy": []}),
            ("active-learning", {"strategy": "oracle"}),
        ]
        for name, params in invalid:
            with self.subTest(name=name, params=params):
                with self.assertRaises(ValueError):
                    lab.run_experiment(name, **params)


if __name__ == "__main__":
    unittest.main()
