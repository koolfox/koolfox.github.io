"""Train a 2-4-1 nonlinear network on the complete XOR truth table."""
import numpy as np

rng = np.random.default_rng(7)
x = np.array([[0., 0.], [0., 1.], [1., 0.], [1., 1.]])
y = np.array([[0.], [1.], [1.], [0.]])
w1 = rng.normal(0, 1, (2, 4))
b1 = np.zeros((1, 4))
w2 = rng.normal(0, 1, (4, 1))
b2 = np.zeros((1, 1))
for step in range(6000):
    hidden = np.tanh(x @ w1 + b1)
    logits = hidden @ w2 + b2
    probability = 1 / (1 + np.exp(-logits))
    # Mean binary cross-entropy derivative with respect to logits.
    d_logits = (probability - y) / len(x)
    d_w2 = hidden.T @ d_logits
    d_b2 = d_logits.sum(axis=0, keepdims=True)
    d_hidden = (d_logits @ w2.T) * (1 - hidden ** 2)
    d_w1 = x.T @ d_hidden
    d_b1 = d_hidden.sum(axis=0, keepdims=True)
    w1 -= 0.2 * d_w1
    b1 -= 0.2 * d_b1
    w2 -= 0.2 * d_w2
    b2 -= 0.2 * d_b2
hidden = np.tanh(x @ w1 + b1)
logits = hidden @ w2 + b2
probability = 1 / (1 + np.exp(-logits))
loss = np.mean(np.logaddexp(0, logits) - y * logits)
print("XOR probabilities:", probability.round(3).ravel().tolist())
print("Predictions:", (probability >= 0.5).astype(int).ravel().tolist())
print(f"Binary cross-entropy: {loss:.5f}")
assert np.array_equal(probability >= 0.5, y.astype(bool))
