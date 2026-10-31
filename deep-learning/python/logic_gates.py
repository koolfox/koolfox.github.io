#!/usr/bin/env python3
"""Train Boolean gates with a real, dependency-free neural network.

Run: python3 logic_gates.py --gate XOR --output /tmp/xor.json
A linear sigmoid neuron cannot represent XOR/XNOR; the hidden-layer MLP can.
Chapter 2 perceptrons use sample-wise updates and misclassification loss.
The sigmoid/MLP extension uses full-batch gradient descent and stable mean
binary cross-entropy (chapter 3 network structure; chapter 4 backpropagation). No held-out test set is claimed: the
four truth-table rows are the entire Boolean domain and training set.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import math
from pathlib import Path
import platform
import random

INPUTS = [[0.0, 0.0], [0.0, 1.0], [1.0, 0.0], [1.0, 1.0]]
GATES = {
    "AND": [0, 0, 0, 1], "OR": [0, 1, 1, 1],
    "NAND": [1, 1, 1, 0], "NOR": [1, 0, 0, 0],
    "XOR": [0, 1, 1, 0], "XNOR": [1, 0, 0, 1],
}


def sigmoid(value: float) -> float:
    """Stable sigmoid, including very large positive/negative arguments."""
    if value >= 0:
        return 1.0 / (1.0 + math.exp(-value))
    exp_value = math.exp(value)
    return exp_value / (1.0 + exp_value)


class Network:
    """Dense sigmoid network. Weight layout: [layer][output][input]."""

    def __init__(self, architecture=(2, 4, 1), seed=7):
        if len(architecture) < 2 or architecture[0] != 2 or architecture[-1] != 1:
            raise ValueError("Architecture must start with 2 and end with 1.")
        if any(not isinstance(n, int) or n < 1 for n in architecture):
            raise ValueError("Layer sizes must be positive integers.")
        self.architecture = list(architecture)
        rng = random.Random(seed)
        self.weights, self.biases = [], []
        for n_in, n_out in zip(architecture[:-1], architecture[1:]):
            bound = math.sqrt(6.0 / (n_in + n_out))
            self.weights.append([
                [rng.uniform(-bound, bound) for _ in range(n_in)]
                for _ in range(n_out)
            ])
            self.biases.append([0.0] * n_out)

    def forward(self, inputs):
        if len(inputs) != 2 or not all(math.isfinite(x) for x in inputs):
            raise ValueError("Expected two finite inputs.")
        activations, logits = [list(inputs)], []  # ورودی و مقدار پیش از سیگموید را برای پس‌انتشار نگه می‌داریم
        for weights, biases in zip(self.weights, self.biases):
            z = [sum(w * x for w, x in zip(row, activations[-1])) + b
                 for row, b in zip(weights, biases)]
            logits.append(z)
            activations.append([sigmoid(v) for v in z])  # این تابع خروجی نورون‌هاست؛ با تغییرش مشتق را هم سازگار کن
        return activations, logits

    def predict(self, inputs):
        return self.forward(inputs)[0][-1][0]

    def loss(self, targets):
        total = 0.0
        for inputs, target in zip(INPUTS, targets):
            z = self.forward(inputs)[1][-1][0]
            total += max(z, 0.0) - z * target + math.log1p(math.exp(-abs(z)))
        return total / len(INPUTS)

    def gradients(self, targets):
        """BCE + sigmoid output gives delta = predicted probability - target."""
        dw = [[[0.0 for _ in row] for row in layer] for layer in self.weights]
        db = [[0.0 for _ in layer] for layer in self.biases]
        for inputs, target in zip(INPUTS, targets):
            activations, _ = self.forward(inputs)
            delta = [activations[-1][0] - target]  # برای BCE و خروجی سیگموید: پیش‌بینی منهای برچسب
            for layer in reversed(range(len(self.weights))):
                for j, error in enumerate(delta):
                    db[layer][j] += error / len(INPUTS)
                    for k, value in enumerate(activations[layer]):
                        dw[layer][j][k] += error * value / len(INPUTS)
                if layer:
                    delta = [
                        sum(self.weights[layer][j][k] * delta[j]
                            for j in range(len(delta))) * value * (1.0 - value)
                        for k, value in enumerate(activations[layer])
                    ]
        return dw, db

    def step(self, targets, learning_rate):
        dw, db = self.gradients(targets)
        for layer in range(len(self.weights)):
            for j in range(len(self.weights[layer])):
                self.biases[layer][j] -= learning_rate * db[layer][j]  # بایاس در خلاف مشتق جابه‌جا می‌شود
                for k in range(len(self.weights[layer][j])):
                    self.weights[layer][j][k] -= learning_rate * dw[layer][j][k]  # همین خط وزن واقعی را با نرخ یادگیری تغییر می‌دهد

    def state(self):
        return {"weights": copy.deepcopy(self.weights),
                "biases": copy.deepcopy(self.biases)}


def metrics(network, targets):
    probabilities = [network.predict(x) for x in INPUTS]
    predictions = [int(p >= 0.5) for p in probabilities]
    return {"loss": network.loss(targets),
            "accuracy": sum(a == b for a, b in zip(predictions, targets)) / 4,
            "probabilities": probabilities, "predictions": predictions}


def train(gate="XOR", model="mlp", epochs=6000, learning_rate=1.0,
          seed=7, hidden=4, grid_size=25):
    if gate not in GATES or model not in ("linear", "mlp"):
        raise ValueError("Unknown gate or model.")
    if not isinstance(epochs, int) or epochs < 0:
        raise ValueError("Epochs must be a nonnegative integer.")
    if not math.isfinite(learning_rate) or learning_rate <= 0:
        raise ValueError("Learning rate must be finite and positive.")
    if not isinstance(grid_size, int) or grid_size < 2:
        raise ValueError("Grid size must be an integer >= 2.")
    architecture = [2, 1] if model == "linear" else [2, hidden, 1]
    network = Network(architecture, seed)
    targets = GATES[gate]
    history, checkpoints = [], []
    history_every = max(1, epochs // 200)
    checkpoint_epochs = {round(epochs * i / 20) for i in range(21)}
    for epoch in range(epochs + 1):
        if epoch % history_every == 0 or epoch == epochs or epoch in checkpoint_epochs:
            scores = metrics(network, targets)
            history.append({"epoch": epoch, "loss": scores["loss"],
                            "accuracy": scores["accuracy"]})
            if epoch in checkpoint_epochs:
                checkpoints.append({"epoch": epoch, **network.state(),
                                    "probabilities": scores["probabilities"]})
        if epoch < epochs:
            network.step(targets, learning_rate)
    axis = [i / (grid_size - 1) for i in range(grid_size)]
    final = {**metrics(network, targets), **network.state(),
             "decision_surface": {
                 "x": axis, "y": axis,
                 "probabilities": [[network.predict([x, y]) for x in axis] for y in axis]
             }}
    return {"architecture": architecture,
            "config": {"epochs": epochs, "learning_rate": learning_rate,
                       "seed": seed, "optimizer": "full_batch_gradient_descent",
                       "activation": "sigmoid", "loss": "mean_binary_cross_entropy",
                       "chapters": [3, 4], "output_kind": "probability"},
            "history": history, "checkpoints": checkpoints, "final": final}


def train_perceptron(gate="AND", epochs=100, learning_rate=0.1, seed=7,
                     hidden=4, grid_size=25):
    """Chapter 2: sample-wise error update, hard threshold at zero.

    Each epoch visits rows in truth-table order. No early stopping: XOR/XNOR
    keep cycling, illustrating the representational limit, not a training bug.
    `probabilities` exists only for schema compatibility and contains 0/1
    class outputs, not calibrated probabilities. `loss` is misclassification
    fraction, not BCE. Hidden is ignored, retained for shared CLI options.
    """
    if gate not in GATES or epochs < 0 or grid_size < 2:
        raise ValueError("Invalid gate, epochs, or grid size.")
    if not math.isfinite(learning_rate) or learning_rate <= 0:
        raise ValueError("Learning rate must be finite and positive.")
    rng = random.Random(seed)
    weights = [rng.uniform(-0.5, 0.5) for _ in range(2)]
    bias = 0.0
    targets = GATES[gate]
    def predict(row):
        return int(sum(w * x for w, x in zip(weights, row)) + bias >= 0)
    def state():
        return {"weights": [[weights[:]]], "biases": [[bias]]}
    def scores():
        predictions = [predict(row) for row in INPUTS]
        accuracy = sum(a == b for a, b in zip(predictions, targets)) / 4
        return {"loss": 1 - accuracy, "accuracy": accuracy,
                "probabilities": predictions, "predictions": predictions}
    history, checkpoints = [], []
    checkpoint_epochs = {round(epochs * i / 20) for i in range(21)}
    for epoch in range(epochs + 1):
        if epoch % max(1, epochs // 200) == 0 or epoch in checkpoint_epochs:
            current = scores()
            history.append({"epoch": epoch, "loss": current["loss"],
                            "accuracy": current["accuracy"]})
            if epoch in checkpoint_epochs:
                checkpoints.append({"epoch": epoch, **state(),
                                    "probabilities": current["probabilities"]})
        if epoch < epochs:
            for row, target in zip(INPUTS, targets):
                error = target - predict(row)
                for i, x in enumerate(row):
                    weights[i] += learning_rate * error * x
                bias += learning_rate * error
    axis = [i / (grid_size - 1) for i in range(grid_size)]
    return {"architecture": [2, 1],
            "config": {"epochs": epochs, "learning_rate": learning_rate, "seed": seed,
                       "optimizer": "sample_wise_perceptron_update",
                       "activation": "hard_threshold", "loss": "misclassification_fraction",
                       "output_kind": "class_label_not_probability", "chapter": 2},
            "history": history, "checkpoints": checkpoints,
            "final": {**scores(), **state(), "decision_surface": {
                "x": axis, "y": axis,
                "probabilities": [[predict([x, y]) for x in axis] for y in axis]}}}


def train_majority(epochs=100, learning_rate=0.1):
    """Three-input majority example using the chapter-2 perceptron rule."""
    inputs = [[float((n >> bit) & 1) for bit in (2, 1, 0)] for n in range(8)]
    targets = [int(sum(row) >= 2) for row in inputs]
    weights, bias = [0.0, 0.0, 0.0], 0.0
    def predict(row):
        return int(sum(w * x for w, x in zip(weights, row)) + bias >= 0)
    for _ in range(epochs):
        for row, target in zip(inputs, targets):
            error = target - predict(row)
            weights = [w + learning_rate * error * x for w, x in zip(weights, row)]
            bias += learning_rate * error
    return {"inputs": inputs, "targets": targets, "weights": weights, "bias": bias,
            "predictions": [predict(row) for row in inputs]}


def export(gates=None, **kwargs):
    gates = list(GATES) if gates is None else gates
    return {
        "schema_version": 1,
        "provenance": {
            "implementation": "logic_gates.py",
            "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            "python_version": platform.python_version(),
            "execution": "actual Python training; standard library only",
            "dataset": "Complete two-input Boolean truth tables; four training rows per gate",
            "evaluation": "Training-domain accuracy, not held-out generalization",
            "surface_note": "Non-Boolean inputs visualize learned interpolation, not gate labels",
        },
        "truth_table_inputs": INPUTS,
        "gates": {gate: {"targets": GATES[gate],
                          "models": {"perceptron": train_perceptron(gate, **kwargs),
                                     **{model: train(gate, model, **kwargs)
                                        for model in ("linear", "mlp")}}}
                  for gate in gates},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gate", choices=["all", *GATES], default="all")
    parser.add_argument("--epochs", type=int, default=6000)
    parser.add_argument("--lr", type=float, default=1.0)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--hidden", type=int, default=4)
    parser.add_argument("--grid-size", type=int, default=25)
    parser.add_argument("--output", type=Path, default=Path("gates.json"))
    args = parser.parse_args()
    data = export(None if args.gate == "all" else [args.gate], epochs=args.epochs,
                  learning_rate=args.lr, seed=args.seed, hidden=args.hidden,
                  grid_size=args.grid_size)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":"),
                                      allow_nan=False) + "\n", encoding="utf-8")
    for gate, result in data["gates"].items():
        for model, run in result["models"].items():
            final = run["final"]
            print(f"{gate:4s} {model:6s} loss={final['loss']:.6f} "
                  f"accuracy={final['accuracy']:.0%} probabilities="
                  f"{[round(p, 4) for p in final['probabilities']]}")
    print(f"Saved {args.output}")


if __name__ == "__main__":
    main()
