"""Fit a line: data, prediction, loss, and learning."""
import numpy as np

x = np.array([-2., -1., 0., 1., 2.])
y = 2 * x + 1
weight, bias = 0., 0.
initial_loss = np.mean((weight * x + bias - y) ** 2)
for step in range(200):
    prediction = weight * x + bias
    error = prediction - y
    weight -= 0.1 * np.mean(2 * error * x)
    bias -= 0.1 * np.mean(2 * error)
final_loss = np.mean((weight * x + bias - y) ** 2)
print(f"MSE: {initial_loss:.6f} -> {final_loss:.6f}")
print(f"Learned: y = {weight:.3f} * x + {bias:.3f}")
print(f"Prediction at x=3: {weight * 3 + bias:.3f}")
assert final_loss < 1e-10
