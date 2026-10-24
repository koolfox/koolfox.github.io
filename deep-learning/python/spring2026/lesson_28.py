"""End-to-end toy regression: train-only scaling, gradient descent, held-out test."""
import numpy as np

rng = np.random.default_rng(28)
x = rng.normal(size=(120, 2))
y = x @ np.array([2., -0.5]) + 0.3 + rng.normal(scale=0.1, size=120)
train_x, test_x = x[:90], x[90:]
train_y, test_y = y[:90], y[90:]
mean = train_x.mean(axis=0)
std = train_x.std(axis=0)
# The test set uses training statistics, never its own statistics.
train = np.column_stack([(train_x - mean) / std, np.ones(len(train_x))])
test = np.column_stack([(test_x - mean) / std, np.ones(len(test_x))])
w = np.zeros(3)
initial = np.mean((train @ w - train_y) ** 2)
for _ in range(500):
    error = train @ w - train_y
    w -= 0.1 * (2 * train.T @ error / len(train_y))
train_mse = np.mean((train @ w - train_y) ** 2)
# Evaluate only after training; do not select epochs using this test set.
test_mse = np.mean((test @ w - test_y) ** 2)
baseline_mse = np.mean((train_y.mean() - test_y) ** 2)
assert train_mse < initial
assert test_mse < baseline_mse
assert np.isfinite(test_mse)
print("Training samples / held-out samples:", len(train_y), len(test_y))
print("Train MSE:", round(train_mse, 4))
print("Held-out MSE:", round(test_mse, 4))
print("Constant baseline held-out MSE:", round(baseline_mse, 4))
