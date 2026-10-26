"""Offline numerical tests. Run: python3 -m unittest discover -s deep-learning/tests -v"""
import importlib.util
import math
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("logic_gates", ROOT / "python/logic_gates.py")
logic = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(logic)


class NetworkTests(unittest.TestCase):
    def test_truth_tables(self):
        operations = {
            "AND": lambda a, b: a and b, "OR": lambda a, b: a or b,
            "NAND": lambda a, b: not (a and b), "NOR": lambda a, b: not (a or b),
            "XOR": lambda a, b: a != b, "XNOR": lambda a, b: a == b,
        }
        for gate, operation in operations.items():
            self.assertEqual(logic.GATES[gate], [int(operation(a, b)) for a, b in logic.INPUTS])

    def test_stable_sigmoid_and_bce(self):
        self.assertEqual(logic.sigmoid(-1000), 0)
        self.assertEqual(logic.sigmoid(1000), 1)
        net = logic.Network([2, 1])
        net.weights = [[[1000.0, 1000.0]]]
        self.assertTrue(math.isfinite(net.loss(logic.GATES["XOR"])))

    def test_finite_difference_gradients(self):
        for architecture in ([2, 1], [2, 3, 1], [2, 3, 2, 1]):
            net = logic.Network(architecture, seed=11)
            dw, db = net.gradients(logic.GATES["XOR"])
            epsilon = 1e-6
            for layer, rows in enumerate(net.weights):
                for j, row in enumerate(rows):
                    for k, original in enumerate(row):
                        row[k] = original + epsilon
                        plus = net.loss(logic.GATES["XOR"])
                        row[k] = original - epsilon
                        minus = net.loss(logic.GATES["XOR"])
                        row[k] = original
                        self.assertAlmostEqual(dw[layer][j][k], (plus - minus) / (2 * epsilon), places=7)
                for j, original in enumerate(net.biases[layer]):
                    net.biases[layer][j] = original + epsilon
                    plus = net.loss(logic.GATES["XOR"])
                    net.biases[layer][j] = original - epsilon
                    minus = net.loss(logic.GATES["XOR"])
                    net.biases[layer][j] = original
                    self.assertAlmostEqual(db[layer][j], (plus - minus) / (2 * epsilon), places=7)

    def test_reproducibility(self):
        first = logic.train(epochs=51, grid_size=3)
        self.assertEqual(first, logic.train(epochs=51, grid_size=3))
        self.assertNotEqual(first["final"]["weights"], logic.train(epochs=51, seed=8, grid_size=3)["final"]["weights"])

    def test_all_mlp_gates_learn(self):
        for gate, targets in logic.GATES.items():
            with self.subTest(gate=gate):
                run = logic.train(gate, epochs=6000, grid_size=3)
                self.assertEqual(run["final"]["predictions"], targets)
                self.assertLess(run["final"]["loss"], 0.01)
                self.assertLess(run["final"]["loss"], run["history"][0]["loss"])

    def test_perceptron_separability(self):
        for gate in logic.GATES:
            run = logic.train_perceptron(gate, epochs=100, grid_size=3)
            if gate in ("XOR", "XNOR"):
                self.assertLess(run["final"]["accuracy"], 1)
            else:
                self.assertEqual(run["final"]["predictions"], logic.GATES[gate])

    def test_perceptron_first_epoch_rule(self):
        # Replicate the explicitly sample-wise equation, including bias update.
        import random
        rng = random.Random(7)
        weights, bias = [rng.uniform(-0.5, 0.5) for _ in range(2)], 0.0
        for row, target in zip(logic.INPUTS, logic.GATES["AND"]):
            prediction = int(sum(w*x for w, x in zip(weights, row)) + bias >= 0)
            error = target - prediction
            weights = [w + 0.1 * error * x for w, x in zip(weights, row)]
            bias += 0.1 * error
        result = logic.train_perceptron("AND", epochs=1, grid_size=3)["final"]
        self.assertEqual(result["weights"], [[weights]])
        self.assertEqual(result["biases"], [[bias]])

    def test_majority(self):
        result = logic.train_majority()
        self.assertEqual(result["predictions"], result["targets"])

    def test_linear_xor_cannot_fit(self):
        run = logic.train("XOR", "linear", epochs=1500, grid_size=3)
        self.assertLess(run["final"]["accuracy"], 1)
        self.assertAlmostEqual(run["final"]["loss"], math.log(2), places=6)

    def test_zero_epochs_and_checkpoint_copy(self):
        run = logic.train(epochs=0, grid_size=2)
        self.assertEqual(len(run["checkpoints"]), 1)
        self.assertEqual(run["final"]["weights"], run["checkpoints"][0]["weights"])
        run = logic.train(epochs=10, grid_size=2)
        self.assertNotEqual(run["checkpoints"][0]["weights"], run["checkpoints"][-1]["weights"])
        self.assertEqual(run["history"][-1]["epoch"], 10)

    def test_invalid_parameters(self):
        for kwargs in ({"epochs": -1}, {"learning_rate": 0}, {"learning_rate": float("inf")},
                       {"hidden": 0}, {"grid_size": 1}, {"gate": "invalid"}):
            with self.assertRaises(ValueError):
                logic.train(**kwargs)


if __name__ == "__main__":
    unittest.main()
