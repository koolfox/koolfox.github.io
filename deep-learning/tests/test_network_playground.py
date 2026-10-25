"""Derivatives, independent evaluation and reproducible optimizer invariants."""

import importlib
import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python"))
core = importlib.import_module("network_playground")


class NetworkPlaygroundTests(unittest.TestCase):
    def test_backprop_matches_central_differences_for_all_activations_and_penalties(
        self,
    ):
        rows = [{"x": [0.3, -0.7], "y": 1}, {"x": [-0.2, 0.4], "y": 0}]
        for activation in ("tanh", "sigmoid", "relu"):
            for penalty in ("none", "l1", "l2"):
                with self.subTest(activation=activation, penalty=penalty):
                    network = core.DenseNetwork([2, 3, 2, 1], activation, 29)
                    # Away from L1/ReLU kinks; check every weight and bias.
                    network.params = [p + 0.17 for p in network.params]
                    _, gradient = network.loss_gradient(
                        rows, ("x1", "x2"), penalty, 0.03
                    )
                    for i, actual in enumerate(gradient):
                        old = network.params[i]
                        network.params[i] = old + 1e-6
                        plus, _ = network.loss_gradient(
                            rows, ("x1", "x2"), penalty, 0.03
                        )
                        network.params[i] = old - 1e-6
                        minus, _ = network.loss_gradient(
                            rows, ("x1", "x2"), penalty, 0.03
                        )
                        network.params[i] = old
                        self.assertAlmostEqual(actual, (plus - minus) / 2e-6, places=7)

    def test_first_adam_update_is_bias_corrected(self):
        run = core.NetworkExperiment(hidden=(), learning_rate=0.02)
        old = run.network.params[:]
        gradient = [0.2, -0.4, 0.0]
        run._update(gradient)
        for before, after, g in zip(old, run.network.params, gradient):
            self.assertAlmostEqual(
                after, before - 0.02 * g / (abs(g) + 1e-8), places=12
            )

    def test_seed_and_partition_do_not_depend_on_model_architecture(self):
        first = core.NetworkExperiment(hidden=(2,), seed=19)
        second = core.NetworkExperiment(hidden=(8, 8), seed=19)
        self.assertEqual(first.splits, second.splits)
        groups = [set(row["id"] for row in rows) for rows in first.splits.values()]
        self.assertEqual([len(x) for x in groups], [120, 40, 40])
        self.assertFalse(
            groups[0] & groups[1] or groups[0] & groups[2] or groups[1] & groups[2]
        )
        self.assertEqual(len(set.union(*groups)), 200)

    def test_test_set_is_not_used_for_updates_or_unsealed_outputs(self):
        a, b = core.NetworkExperiment(size=60), core.NetworkExperiment(size=60)
        for row in b.splits["test"]:
            row["x"] = [999, -999]
            row["y"] = 1 - row["y"]
        a.step(3)
        b.step(3)
        self.assertEqual(a.network.params, b.network.params)
        self.assertEqual(a.history, b.history)
        self.assertEqual(a.snapshot(), b.snapshot())
        self.assertNotIn("test", {row["split"] for row in a.snapshot()["points"]})
        with self.assertRaises(ValueError):
            a.score("test")
        self.assertEqual(a.finalize()["count"], 12)
        with self.assertRaises(ValueError):
            a.step()

    def test_reproducible_chunks_and_download_are_independent(self):
        a, b = core.NetworkExperiment(size=60), core.NetworkExperiment(size=60)
        a.step(9)
        for n in (2, 1, 6):
            b.step(n)
        self.assertEqual(a.snapshot(), b.snapshot())
        download = a.snapshot()
        download["weights"][0][0][0] = 1234
        download["config"]["hidden"][0] = 8
        self.assertEqual(a.snapshot(), b.snapshot())

    def test_engine_learns_circles_with_engineered_features(self):
        run = core.NetworkExperiment(
            hidden=(),
            feature_names=("x1_squared", "x2_squared"),
            noise=0,
            learning_rate=0.1,
            seed=7,
        )
        initial = run.score("train")["loss"]
        run.step(100)
        self.assertLess(run.score("train")["loss"], initial / 3)
        self.assertGreaterEqual(run.score("validation")["accuracy"], 0.95)
        self.assertGreaterEqual(run.finalize()["accuracy"], 0.95)

    def test_bce_stays_finite_for_saturated_logits(self):
        network = core.DenseNetwork([2, 1])
        network.params[:] = [1000, 0, 0]
        loss, gradient = network.loss_gradient([{"x": [1, 0], "y": 0}], ("x1", "x2"))
        self.assertEqual(loss, 1000)
        self.assertEqual(gradient, [1, 0, 1])

    def test_rejects_unsupported_and_unbounded_settings(self):
        for kwargs in (
            {"size": True},
            {"size": 401},
            {"hidden": (9,)},
            {"hidden": (2, 2, 2, 2)},
            {"noise": math.nan},
            {"feature_names": ()},
            {"feature_names": ("x1", "x1")},
            {"learning_rate": 0},
            {"activation": "unknown"},
        ):
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                core.NetworkExperiment(**kwargs)


if __name__ == "__main__":
    unittest.main()
