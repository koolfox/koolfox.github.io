"""Train a rank-one LoRA-style adapter on toy linear regression."""
import numpy as np

rng = np.random.default_rng(17)
x = rng.normal(size=(100, 6))
base = rng.normal(scale=0.2, size=(6, 4))
frozen = base.copy()
# A synthetic target task whose change from the base is rank one.
true_delta = rng.normal(scale=0.3, size=(6, 1)) @ rng.normal(size=(1, 4))
y = x @ (base + true_delta)
a = rng.normal(scale=0.1, size=(6, 1))
b = np.zeros((1, 4))  # Do not initialize BOTH factors to zero.
initial = np.mean((x @ (base + a @ b) - y) ** 2)
for _ in range(2000):
    error = x @ (base + a @ b) - y
    grad_delta = 2 * x.T @ error / error.size
    grad_a = grad_delta @ b.T
    grad_b = a.T @ grad_delta  # Both use factors before this update.
    a -= 0.1 * grad_a
    b -= 0.1 * grad_b
final = np.mean((x @ (base + a @ b) - y) ** 2)
assert np.array_equal(base, frozen)
assert a.size + b.size < base.size
assert final < initial * 1e-4
print("Frozen base parameters:", base.size)
print("Trainable adapter parameters:", a.size + b.size)
print("Training MSE before/after:", initial, final)
print("Adapter numerical rank:", np.linalg.matrix_rank(a @ b))
