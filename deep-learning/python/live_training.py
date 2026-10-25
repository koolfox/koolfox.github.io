"""Incremental, reproducible Boolean training; no UI and no external packages."""

import math
import random

from logic_gates import GATES, INPUTS, Network, metrics


class TrainingRun:
    """Same numerical rules as the archived Python run, with bounded stepping."""

    def __init__(
        self,
        gate="XOR",
        model="mlp",
        hidden=4,
        learning_rate=1.0,
        seed=7,
        max_epochs=6000,
    ):
        if gate not in GATES or model not in {"perceptron", "linear", "mlp"}:
            raise ValueError("Unknown gate or model")
        if not isinstance(hidden, int) or not 1 <= hidden <= 32:
            raise ValueError("Hidden width must be between 1 and 32")
        if not math.isfinite(learning_rate) or not 0 < learning_rate <= 4:
            raise ValueError("Learning rate must be finite and in (0, 4]")
        if not isinstance(seed, int) or not 0 <= seed <= 2**32 - 1:
            raise ValueError("Seed must be a nonnegative 32-bit integer")
        if not isinstance(max_epochs, int) or not 1 <= max_epochs <= 10000:
            raise ValueError("Epoch budget must be between 1 and 10000")
        self.config = dict(
            gate=gate,
            model=model,
            hidden=hidden,
            learning_rate=learning_rate,
            seed=seed,
            max_epochs=max_epochs,
        )
        self.targets = GATES[gate][:]
        self.epoch = 0
        self.network = None
        if model == "perceptron":
            rng = random.Random(seed)
            self.weights = [rng.uniform(-0.5, 0.5) for _ in range(2)]
            self.bias = 0.0
        else:
            self.network = Network([2, hidden, 1] if model == "mlp" else [2, 1], seed)
        self.history = []
        self._record()

    def scores(self):
        if self.network:
            return metrics(self.network, self.targets)
        outputs = [
            int(sum(w * x for w, x in zip(self.weights, row)) + self.bias >= 0)
            for row in INPUTS
        ]
        accuracy = sum(y == p for y, p in zip(self.targets, outputs)) / 4
        return {
            "probabilities": outputs,
            "predictions": outputs,
            "accuracy": accuracy,
            "loss": 1 - accuracy,
        }

    def _record(self):
        scores = self.scores()
        self.history.append(
            {
                "epoch": self.epoch,
                "loss": scores["loss"],
                "accuracy": scores["accuracy"],
            }
        )
        if len(self.history) > 4096:
            self.history = self.history[::2] + self.history[-1:]

    def step(self, count=1):
        if not isinstance(count, int) or not 1 <= count <= 1000:
            raise ValueError("A chunk must contain 1 to 1000 epochs")
        count = min(count, self.config["max_epochs"] - self.epoch)
        lr = self.config["learning_rate"]
        for _ in range(count):
            if self.network:
                self.network.step(self.targets, lr)
            else:
                for row, target in zip(INPUTS, self.targets):
                    prediction = int(
                        sum(w * x for w, x in zip(self.weights, row)) + self.bias >= 0
                    )
                    error = target - prediction
                    for i, value in enumerate(row):
                        self.weights[i] += lr * error * value
                    self.bias += lr * error
            self.epoch += 1
        if count:
            self._record()
        return self.epoch

    def snapshot(self):
        state = (
            self.network.state()
            if self.network
            else {"weights": [[self.weights[:]]], "biases": [[self.bias]]}
        )
        return {
            "schema_version": 1,
            "execution": "live_python_training",
            "config": dict(self.config),
            "epoch": self.epoch,
            "activation": "sigmoid" if self.network else "hard_threshold",
            "loss_kind": "mean_binary_cross_entropy"
            if self.network
            else "misclassification_fraction",
            "output_kind": "probability" if self.network else "class_label",
            "inputs": [row[:] for row in INPUTS],
            "targets": self.targets[:],
            **state,
            **self.scores(),
            "history": [dict(row) for row in self.history],
            "evaluation": "All four Boolean inputs are training data; no held-out generalization claim.",
        }
