"""Small, inspectable classifier training for the Persian network playground.

No UI or numerical dependencies. Loss is mean binary cross entropy plus a
weight-only penalty. Adam uses Kingma and Ba, Algorithm 1 (arXiv:1412.6980).
Synthetic data, stratified splits, initialization and shuffling have independent
seeded generators. Test observations are withheld from snapshots until final
evaluation, which seals the run against further training.
"""

import copy
import itertools
import math
import random

FEATURES = ("x1", "x2", "x1_squared", "x2_squared", "x1_x2", "sin_x1", "sin_x2")
DATASETS = ("linear", "xor", "circles", "spirals")


def sigmoid(value):
    if value >= 0:
        return 1 / (1 + math.exp(-value))
    exp = math.exp(value)
    return exp / (1 + exp)


def features(point, names):
    x, y = point
    values = (x, y, x * x, y * y, x * y, math.sin(math.pi * x), math.sin(math.pi * y))
    return [values[FEATURES.index(name)] for name in names]


def integer(value, low, high, name):
    if type(value) is not int or not low <= value <= high:
        raise ValueError(f"{name} must be an integer in [{low}, {high}]")


def finite(value, low, high, name):
    if isinstance(value, bool) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f"{name} must be finite and in [{low}, {high}]")


def make_data(dataset, size, noise, seed):
    """Balanced labels; Gaussian measurement noise affects inputs, never labels."""
    rng = random.Random(seed)
    rows = []
    for i in range(size):
        label = i % 2
        if dataset == "linear":
            x, y = rng.uniform(-1, 1), rng.uniform(-1, 1)
            if int(x + y > 0) != label:
                x, y = -x, -y
        elif dataset == "xor":
            x, y = rng.uniform(0.1, 1), rng.uniform(0.1, 1)
            x *= rng.choice((-1, 1))
            y *= (1 if x > 0 else -1) * (1 if label else -1)
        elif dataset == "circles":
            radius = rng.uniform(0.05, 0.4) if label == 0 else rng.uniform(0.65, 1)
            angle = rng.uniform(0, 2 * math.pi)
            x, y = radius * math.cos(angle), radius * math.sin(angle)
        else:
            radius = rng.uniform(0.08, 1)
            angle = 1.5 * math.pi * radius + label * math.pi
            x, y = radius * math.cos(angle), radius * math.sin(angle)
        rows.append(
            {
                "id": i,
                "x": [x + rng.gauss(0, noise), y + rng.gauss(0, noise)],
                "y": label,
            }
        )
    return rows


def split_data(rows, seed):
    rng = random.Random(seed)
    splits = {"train": [], "validation": [], "test": []}
    for label in (0, 1):
        group = [row for row in rows if row["y"] == label]
        rng.shuffle(group)
        a, b = int(0.6 * len(group)), int(0.8 * len(group))
        for name, part in zip(splits, (group[:a], group[a:b], group[b:])):
            splits[name].extend(part)
    for part in splits.values():
        rng.shuffle(part)
    return splits


class DenseNetwork:
    """Flat parameters make every derivative and optimizer update inspectable."""

    def __init__(self, sizes, activation="tanh", seed=7):
        self.sizes = list(sizes)
        self.activation = activation
        self.layers = []
        self.params = []
        self.weight_indices = set()
        rng = random.Random(seed)
        for layer, (fan_in, fan_out) in enumerate(itertools.pairwise(sizes)):
            indices = []
            # He uniform for hidden ReLU, Xavier uniform otherwise.
            bound = (
                math.sqrt(6 / fan_in)
                if activation == "relu" and layer < len(sizes) - 2
                else math.sqrt(6 / (fan_in + fan_out))
            )
            for _ in range(fan_out):
                weights = list(range(len(self.params), len(self.params) + fan_in))
                self.params.extend(rng.uniform(-bound, bound) for _ in weights)
                self.weight_indices.update(weights)
                bias = len(self.params)
                self.params.append(0.0)
                indices.append((weights, bias))
            self.layers.append(indices)

    def activate(self, z):
        if self.activation == "tanh":
            return math.tanh(z)
        if self.activation == "relu":
            return max(0.0, z)
        return sigmoid(z)

    def forward(self, values):
        activations, logits = [list(values)], []  # بازنمایی ورودی و مقدارهای پیش از فعال‌سازی را نگه می‌داریم
        for l, layer in enumerate(self.layers):  # وزن‌های هر لایه روی خروجی لایهٔ قبلی اعمال می‌شوند
            z = [
                sum(self.params[k] * x for k, x in zip(weights, activations[-1]))
                + self.params[bias]
                for weights, bias in layer
            ]
            logits.append(z)  # logit را برای زیان پایدار و مشتق ذخیره می‌کنیم
            activations.append(
                [
                    sigmoid(v) if l == len(self.layers) - 1 else self.activate(v)
                    for v in z
                ]
            )
        return activations, logits

    def loss_gradient(self, rows, names, regularization="none", rate=0.0):
        if not rows:
            raise ValueError("Cannot train or evaluate an empty partition")
        gradient = [0.0] * len(self.params)  # برای هر وزن و بایاس یک جای مشتق داریم
        loss = 0.0
        for row in rows:
            activations, logits = self.forward(features(row["x"], names))
            z, target = logits[-1][0], row["y"]  # مقدار خروجی پیش از سیگموید و برچسب درست همین نمونه
            # Stable BCE from logits; no probability clipping or altered gradient.
            loss += max(z, 0) - z * target + math.log1p(math.exp(-abs(z)))
            delta = [activations[-1][0] - target]  # مشتق BCE نسبت به logit خروجی: احتمال منهای هدف
            for l in range(len(self.layers) - 1, -1, -1):
                previous = [0.0] * len(activations[l])
                for j, (weights, bias) in enumerate(self.layers[l]):
                    gradient[bias] += delta[j] / len(rows)
                    for i, index in enumerate(weights):
                        gradient[index] += delta[j] * activations[l][i] / len(rows)
                        previous[i] += self.params[index] * delta[j]
                if l:
                    if self.activation == "tanh":
                        delta = [
                            d * (1 - a * a) for d, a in zip(previous, activations[l])
                        ]
                    elif self.activation == "relu":
                        delta = [
                            d if z > 0 else 0.0 for d, z in zip(previous, logits[l - 1])
                        ]
                    else:
                        delta = [
                            d * a * (1 - a) for d, a in zip(previous, activations[l])
                        ]
        loss /= len(rows)
        for i in self.weight_indices:
            p = self.params[i]
            if regularization == "l2":
                loss += 0.5 * rate * p * p
                gradient[i] += rate * p  # برای L2 مشتق جریمه برابر ضریب در وزن است
            elif regularization == "l1":
                loss += rate * abs(p)
                gradient[i] += rate * ((p > 0) - (p < 0))
        return loss, gradient

    def state(self):
        return {
            "weights": [
                [[self.params[k] for k in weights] for weights, _ in layer]
                for layer in self.layers
            ],
            "biases": [
                [self.params[bias] for _, bias in layer] for layer in self.layers
            ],
        }


class NetworkExperiment:
    def __init__(
        self,
        dataset="circles",
        size=200,
        noise=0.05,
        hidden=(4, 4),
        activation="tanh",
        feature_names=("x1", "x2"),
        optimizer="adam",
        learning_rate=0.03,
        batch_size=20,
        regularization="none",
        regularization_rate=0.001,
        seed=7,
        max_epochs=1000,
    ):
        integer(size, 40, 400, "size")
        integer(batch_size, 1, 400, "batch size")
        integer(seed, 0, 2**32 - 1, "seed")
        integer(max_epochs, 1, 3000, "epoch budget")
        finite(noise, 0, 0.5, "noise")
        finite(learning_rate, 0.00001, 1, "learning rate")
        finite(regularization_rate, 0, 1, "regularization rate")
        if (
            dataset not in DATASETS
            or activation not in ("tanh", "relu", "sigmoid")
            or optimizer not in ("sgd", "momentum", "adam")
            or regularization not in ("none", "l1", "l2")
        ):
            raise ValueError("Unknown experiment option")
        if len(hidden) > 3:
            raise ValueError("At most three hidden layers")
        for width in hidden:
            integer(width, 1, 8, "hidden width")
        if (
            not feature_names
            or len(set(feature_names)) != len(feature_names)
            or any(name not in FEATURES for name in feature_names)
        ):
            raise ValueError("Choose distinct supported input features")
        self.config = {
            "dataset": dataset,
            "size": size,
            "noise": noise,
            "hidden": list(hidden),
            "activation": activation,
            "feature_names": list(feature_names),
            "optimizer": optimizer,
            "learning_rate": learning_rate,
            "batch_size": batch_size,
            "regularization": regularization,
            "regularization_rate": regularization_rate,
            "seed": seed,
            "max_epochs": max_epochs,
        }
        self.splits = split_data(make_data(dataset, size, noise, seed), seed + 1)
        self.network = DenseNetwork(
            [len(feature_names), *hidden, 1], activation, seed + 2
        )
        self.shuffle = random.Random(seed + 3)
        self.first_moment = [0.0] * len(self.network.params)
        self.second_moment = [0.0] * len(self.network.params)
        self.epoch = self.updates = 0
        self.sealed = False
        self.test_result = None
        self.history = []
        self._record()

    def score(self, name):
        if name == "test" and not self.sealed:
            raise ValueError("Test evaluation is available only when the run is sealed")
        rows = self.splits[name]
        names = self.config["feature_names"]
        loss, _ = self.network.loss_gradient(rows, names)
        correct = sum(
            int(self.network.forward(features(row["x"], names))[0][-1][0] >= 0.5)
            == row["y"]
            for row in rows
        )
        return {"loss": loss, "accuracy": correct / len(rows), "count": len(rows)}

    def _record(self):
        train, validation = self.score("train"), self.score("validation")
        objective, _ = self.network.loss_gradient(
            self.splits["train"],
            self.config["feature_names"],
            self.config["regularization"],
            self.config["regularization_rate"],
        )
        self.history.append(
            {
                "epoch": self.epoch,
                "train_loss": train["loss"],
                "validation_loss": validation["loss"],
                "objective": objective,
                "train_accuracy": train["accuracy"],
                "validation_accuracy": validation["accuracy"],
            }
        )

    def _update(self, gradient):
        self.updates += 1  # شمار گام‌ها برای تصحیح اریب Adam؛ با شمار دوره‌ها یکی نیست
        kind, lr = self.config["optimizer"], self.config["learning_rate"]
        for i, g in enumerate(gradient):  # هر مؤلفهٔ گرادیان، یک پارامتر را تغییر می‌دهد
            if kind == "momentum":
                self.first_moment[i] = 0.9 * self.first_moment[i] + g  # مومنتوم، جهت گام قبلی را هم نگه می‌دارد
                step = self.first_moment[i]
            elif kind == "adam":
                self.first_moment[i] = 0.9 * self.first_moment[i] + 0.1 * g  # Adam: میانگین متحرک گرادیان با بتای ۰٫۹
                self.second_moment[i] = 0.999 * self.second_moment[i] + 0.001 * g * g  # میانگین مربع گرادیان، مقیاس گام را تنظیم می‌کند
                m = self.first_moment[i] / (1 - 0.9**self.updates)  # تصحیح اریب میانگین اول در گام‌های آغازین
                v = self.second_moment[i] / (1 - 0.999**self.updates)  # تصحیح اریب میانگین دوم
                step = m / (math.sqrt(v) + 1e-8)  # ε مانع تقسیم بر صفر می‌شود
            else:
                step = g  # SGD ساده از همان گرادیان استفاده می‌کند
            value = self.network.params[i] - lr * step  # علامت منفی یعنی حرکت در خلاف جهت افزایش زیان
            if not math.isfinite(value):
                raise ArithmeticError(
                    "Non-finite update; restart with a lower learning rate"
                )
            self.network.params[i] = value  # فقط مقدار معتبر و متناهی در مدل ثبت می‌شود

    def step(self, count=1):
        integer(count, 1, 100, "step count")
        if self.sealed:
            raise ValueError("Final test has sealed this experiment; start a new run")
        cfg = self.config
        for _ in range(min(count, cfg["max_epochs"] - self.epoch)):
            rows = self.splits["train"][:]
            self.shuffle.shuffle(rows)
            for start in range(0, len(rows), cfg["batch_size"]):
                _, gradient = self.network.loss_gradient(
                    rows[start : start + cfg["batch_size"]],
                    cfg["feature_names"],
                    cfg["regularization"],
                    cfg["regularization_rate"],
                )
                self._update(gradient)
            self.epoch += 1
            self._record()
        return self.epoch

    def finalize(self):
        self.sealed = True
        self.test_result = self.score("test")
        return dict(self.test_result)

    def snapshot(self):
        partitions = (
            ("train", "validation", "test") if self.sealed else ("train", "validation")
        )
        return copy.deepcopy(
            {
                "schema_version": 1,
                "execution": "live_python_training",
                "config": self.config,
                "epoch": self.epoch,
                "updates": self.updates,
                "sealed": self.sealed,
                "parameter_count": len(self.network.params),
                **self.network.state(),
                "history": self.history,
                "train": self.score("train"),
                "validation": self.score("validation"),
                "test": self.test_result,
                "split_counts": {name: len(rows) for name, rows in self.splits.items()},
                "points": [
                    {**row, "split": name}
                    for name in partitions
                    for row in self.splits[name]
                ],
                "loss_definition": "Mean BCE from logits; objective additionally includes lambda*sum(abs(weight)) for L1 or lambda*sum(weight^2)/2 for L2. Biases are not penalized.",
                "evaluation": "Stratified 60/20/20 synthetic train/validation/test split. Test metrics and points appear only after finalization, which prevents further training in this run. Reusing a seed after inspecting test results is not an independent evaluation.",
            }
        )
