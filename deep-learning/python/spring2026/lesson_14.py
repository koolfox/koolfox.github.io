"""Train source features, freeze them, then fine-tune on a toy target task."""
import numpy as np

rng = np.random.default_rng(9)
x = rng.normal(size=(100, 2))
source_y = (x[:, 0] + x[:, 1] > 0).astype(float)[:, None]
target_y = (x[:, 0] + 0.5 * x[:, 1] > 0).astype(float)[:, None]
a = rng.normal(0, 0.3, (2, 4)); b = np.zeros((1, 4))
w = rng.normal(0, 0.3, (4, 1)); c = np.zeros((1, 1))

def train(labels, steps, tune_features):
    global a, b, w, c
    for step in range(steps):
        hidden = np.tanh(x @ a + b)
        probability = 1 / (1 + np.exp(-(hidden @ w + c)))
        error = (probability - labels) / len(x)
        hidden_error = (error @ w.T) * (1 - hidden ** 2)
        w -= 0.1 * hidden.T @ error
        c -= 0.1 * error.sum(axis=0, keepdims=True)
        if tune_features:
            a -= 0.1 * x.T @ hidden_error
            b -= 0.1 * hidden_error.sum(axis=0, keepdims=True)
    logits = np.tanh(x @ a + b) @ w + c
    return np.mean(np.logaddexp(0, logits) - labels * logits)

print(f"Source training BCE: {train(source_y, 1000, True):.4f}")
saved_features = a.copy()
w = rng.normal(0, 0.3, (4, 1)); c[:] = 0  # New target head.
frozen_loss = train(target_y, 300, False)
assert np.array_equal(a, saved_features)
fine_loss = train(target_y, 300, True)
print(f"Target BCE, frozen features: {frozen_loss:.4f}")
print(f"Target BCE, fine-tuned: {fine_loss:.4f}")
assert fine_loss < frozen_loss
# These features were actually trained above, but they are not a pretrained CNN.
