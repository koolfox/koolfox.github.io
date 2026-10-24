"""Scaled dot-product attention on three toy tokens; no training."""
import numpy as np


def softmax(x):
    e = np.exp(x - x.max(axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)


q = np.array([[1., 0.]])
k = np.array([[1., 0.], [0., 1.], [-1., 0.]])
v = np.array([[10., 0.], [0., 10.], [2., 2.]])
scores = q @ k.T / np.sqrt(k.shape[1])
weights = softmax(scores)
context = weights @ v
assert np.allclose(weights.sum(axis=-1), 1)
assert weights[0, 0] > weights[0, 1] > weights[0, 2]
assert context.shape == (1, 2)
print("Attention weights:", weights.round(3))
print("Weighted context:", context.round(3))
