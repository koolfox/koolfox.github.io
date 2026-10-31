"""Plots and probes must use the actual editable Python forward function."""

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python"))
sys.path.insert(0, str(ROOT / "playgrounds/shared"))
from live_training import TrainingRun  # noqa: E402
from network_playground import NetworkExperiment  # noqa: E402
from native_views import visual_state  # noqa: E402


class NativeViewTests(unittest.TestCase):
    def test_edited_forward_drives_every_probe_and_surface_cell(self):
        run = NetworkExperiment()
        original = run.network.forward

        def changed(point):
            activations, logits = original(point)
            activations[-1][0] = 0.123456
            return activations, logits

        run.network.forward = changed
        state = visual_state(run, "network-playground", steps=4)
        self.assertTrue(
            all(v == 0.123456 for row in state["surface_grid"]["values"] for v in row)
        )
        self.assertTrue(
            all(t["activations"][-1][0] == 0.123456 for t in state["probe_traces"])
        )
        self.assertFalse(any(p["split"] == "test" for p in state["points"]))

    def test_perceptron_forward_has_no_hidden_layer_and_matches_predictions(self):
        run = TrainingRun(model="perceptron")
        run.step(3)
        state = visual_state(run, "neuron-xor", steps=4)
        self.assertEqual(
            [t["activations"][-1][0] for t in state["probe_traces"]],
            state["predictions"],
        )
        self.assertTrue(all(len(t["activations"]) == 2 for t in state["probe_traces"]))

    def test_nonfinite_custom_output_is_rejected(self):
        run = TrainingRun()
        run.forward = lambda p: ([p, [float("nan")]], [[0]])
        with self.assertRaisesRegex(ArithmeticError, "Non-finite output"):
            visual_state(run, "neuron-xor", steps=2)
