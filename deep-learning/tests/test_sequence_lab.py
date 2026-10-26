"""Independent numerical checks for the bounded sequence teaching engine."""
import importlib.util
import json
import math
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location("sequence_lab", Path(__file__).resolve().parents[1] / "python" / "sequence_lab.py")
LAB = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(LAB)


class SequenceNumerics(unittest.TestCase):
    def test_bptt_matches_finite_differences_all_parameters(self):
        xs = [0.3, -0.8, 1.0, 0.4]
        params = {"weight": -0.7, "input_weight": 0.4, "bias": 0.1, "target": -0.2, "initial_state": 0.25}
        result = LAB.recurrent_forward_and_grad(xs, **params)
        epsilon = 1e-6
        for name in ["weight", "input_weight", "bias"]:
            plus, minus = dict(params), dict(params)
            plus[name] += epsilon
            minus[name] -= epsilon
            numeric = (LAB.recurrent_forward_and_grad(xs, **plus)["loss"] - LAB.recurrent_forward_and_grad(xs, **minus)["loss"]) / (2 * epsilon)
            self.assertAlmostEqual(result["gradients"][name], numeric, places=8)
        self.assertAlmostEqual(sum(result["weight_contributions"]), result["gradients"]["weight"], places=14)
        for index in range(len(xs)):
            plus, minus = list(xs), list(xs)
            plus[index] += epsilon
            minus[index] -= epsilon
            numeric = (LAB.recurrent_forward_and_grad(plus, **params)["loss"] - LAB.recurrent_forward_and_grad(minus, **params)["loss"]) / (2 * epsilon)
            self.assertAlmostEqual(result["input_gradients"][index], numeric, places=8)

    def test_no_recurrence_removes_earlier_input_influence(self):
        result = LAB.recurrent_forward_and_grad([1, 0, 0], 0, 1, 0, 0.5)
        self.assertEqual(result["states"], [0, math.tanh(1), 0, 0])
        self.assertEqual(result["input_gradients"][:2], [0, 0])

    def test_attention_hand_calculation(self):
        # d_k=1; scores [0, ln 3] -> [1/4, 3/4], weighted value 5.
        result = LAB.scaled_attention([[1]], [[0], [math.log(3)]], [[2], [6]])
        self.assertAlmostEqual(result["weights"][0][0], 0.25, places=14)
        self.assertAlmostEqual(result["output"][0][0], 5, places=14)
        # All zero queries produce a mean, regardless of keys.
        result = LAB.scaled_attention([[0, 0]], [[10, -4], [-2, 9]], [[2, 4], [8, -2]])
        self.assertEqual(result["output"], [[5, 1]])

    def test_attention_permutation_and_mask(self):
        q,k,v = [[1,2],[3,4]], [[1,0],[0,1]], [[2,4],[6,8]]
        original = LAB.scaled_attention(q,k,v)
        permuted = LAB.scaled_attention(q,k[::-1],v[::-1])
        for a,b in zip(original["output"],permuted["output"]):
            for x,y in zip(a,b):
                self.assertAlmostEqual(x,y,places=13)
        causal = LAB.scaled_attention(q,k,v,causal=True)
        self.assertEqual(causal["weights"][0], [1,0])
        self.assertEqual(causal["output"][0], v[0])
        self.assertIsNone(causal["scores"][0][1])
        for row in causal["weights"]:
            self.assertAlmostEqual(sum(row),1,places=14)

    def test_multihead_future_cannot_leak(self):
        for heads in [1,2,4]:
            masked = LAB.run_experiment("causal-multihead",model_dimension=4,heads=heads)
            self.assertEqual(masked["metrics"]["earlier_output_max_change_after_future_perturbation"],0)
            self.assertEqual(masked["metrics"]["projection_parameters_no_bias"],64)
            self.assertEqual(masked["metrics"]["output_width"],4)
        unmasked = LAB.run_experiment("causal-multihead",causal=False)
        self.assertGreater(unmasked["metrics"]["earlier_output_max_change_after_future_perturbation"],1e-6)

    def test_geometry_invariants_and_self_exclusion(self):
        result = LAB.run_experiment("embedding-geometry",query_index=2)
        self.assertLess(result["metrics"]["rotation_cosine_max_error"],1e-12)
        self.assertLess(result["metrics"]["positive_scaling_cosine_max_error"],1e-12)
        self.assertNotEqual(result["metrics"]["nearest_other_index"],2)

    def test_reproducible_json_and_real_training(self):
        for scenario in LAB.PRESETS:
            first = LAB.run_experiment(scenario)
            second = LAB.run_experiment(scenario)
            self.assertEqual(first,second)
            json.dumps(first,allow_nan=False)
        trained = LAB.run_experiment("recurrent-memory")
        self.assertLess(trained["metrics"]["final_loss"],trained["metrics"]["initial_loss"])
        self.assertLess(trained["metrics"]["gradient_absolute_error"],1e-8)
        untouched = LAB.run_experiment("recurrent-memory",epochs=0)
        self.assertEqual(untouched["metrics"]["final_loss"],untouched["metrics"]["initial_loss"])

    def test_bad_inputs_rejected(self):
        cases = [("recurrent-memory",{"weight":float("nan")}), ("recurrent-memory",{"length":True}), ("recurrent-memory",{"epochs":101}), ("embedding-geometry",{"seed":-1}), ("embedding-geometry",{"count":2,"query_index":2}), ("scaled-attention",{"temperature":0}), ("scaled-attention",{"causal":"yes"}), ("causal-multihead",{"model_dimension":5,"heads":2}), ("causal-multihead",{"surprise":1})]
        for name,params in cases:
            with self.subTest(name=name,params=params), self.assertRaises(ValueError):
                LAB.run_experiment(name,**params)
        with self.assertRaises(ValueError):
            LAB.scaled_attention([[1]],[[1,2]],[[3]])
        with self.assertRaises(ValueError):
            LAB.scaled_attention([[1]],[[1],[2]],[[3],[4]],causal=True)
        with self.assertRaises(ValueError):
            LAB.recurrent_forward_and_grad([],1,1,0,0)


if __name__ == "__main__":
    unittest.main()
