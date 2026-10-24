"""One tiny transformer-style encoder block, not a trained language model."""
import numpy as np

rng = np.random.default_rng(14)
x = rng.normal(size=(3, 4))  # Three tokens with four features each.
x += np.arange(3)[:, None] * np.array([0.1, -0.1, 0.2, -0.2])


def layer_norm(a):
    return (a - a.mean(-1, keepdims=True)) / np.sqrt(
        a.var(-1, keepdims=True) + 1e-5)


wq, wk, wv = rng.normal(scale=0.2, size=(3, 4, 4))
q, k, v = x @ wq, x @ wk, x @ wv
scores = q @ k.T / np.sqrt(4)
e = np.exp(scores - scores.max(-1, keepdims=True))
attention = e / e.sum(-1, keepdims=True)
h = layer_norm(x + attention @ v)  # Attention plus residual.
w1 = rng.normal(scale=0.2, size=(4, 6))
w2 = rng.normal(scale=0.2, size=(6, 4))
ff = np.maximum(0, h @ w1) @ w2
out = layer_norm(h + ff)  # Feed-forward plus residual.
assert out.shape == x.shape
assert np.allclose(out.mean(-1), 0, atol=1e-12)
assert np.allclose(attention.sum(-1), 1)
print("Block output shape:", out.shape)
print(out.round(3))
