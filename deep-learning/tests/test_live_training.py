"""Real incremental training must match the archived numerical implementation."""

import importlib
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python"))
TrainingRun = importlib.import_module("live_training").TrainingRun
logic = importlib.import_module("logic_gates")
train, train_perceptron = logic.train, logic.train_perceptron


class LiveTrainingTests(unittest.TestCase):
    def test_chunks_match_single_run(self):
        for model in ("perceptron", "linear", "mlp"):
            with self.subTest(model=model):
                run = TrainingRun("XOR", model, max_epochs=137)
                for count in (1, 25, 80, 31):
                    run.step(count)
                reference = (
                    train_perceptron("XOR", epochs=137, learning_rate=1, grid_size=2)
                    if model == "perceptron"
                    else train("XOR", model=model, epochs=137, grid_size=2)
                )
                self.assertEqual(
                    run.snapshot()["weights"], reference["final"]["weights"]
                )
                self.assertEqual(run.snapshot()["biases"], reference["final"]["biases"])
                self.assertEqual(run.scores()["loss"], reference["final"]["loss"])

    def test_epoch_cap_and_reset_reproduce(self):
        a = TrainingRun(seed=13, max_epochs=23)
        b = TrainingRun(seed=13, max_epochs=23)
        self.assertEqual(a.snapshot(), b.snapshot())
        self.assertEqual(a.step(100), 23)
        before = a.snapshot()
        a.step(1)
        self.assertEqual(a.snapshot(), before)

    def test_snapshot_does_not_mutate_run(self):
        run = TrainingRun()
        saved = run.snapshot()
        saved["weights"][0][0][0] = 10000
        saved["config"]["seed"] = 42
        self.assertNotEqual(run.snapshot()["weights"][0][0][0], 10000)
        self.assertEqual(run.config["seed"], 7)

    def test_default_xor_training_actually_learns(self):
        run = TrainingRun()
        for _ in range(60):
            run.step(100)
        self.assertEqual(run.scores()["predictions"], run.targets)
        self.assertLess(run.scores()["loss"], 0.02)

    def test_rejects_unbounded_controls(self):
        for kwargs in (
            {"hidden": 33},
            {"learning_rate": float("nan")},
            {"max_epochs": 10001},
            {"seed": -1},
            {"gate": "unknown"},
        ):
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                TrainingRun(**kwargs)


if __name__ == "__main__":
    unittest.main()
