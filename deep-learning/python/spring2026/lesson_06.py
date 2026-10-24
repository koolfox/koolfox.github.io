"""Mini-batch learning with distinct training, validation, and test sets."""
import numpy as np

rng = np.random.default_rng(5)
x = rng.normal(size=(200, 2))
y = (x[:, 0] + x[:, 1] > 0).astype(float)
train_x, valid_x, test_x = x[:120], x[120:160], x[160:]
train_y, valid_y, test_y = y[:120], y[120:160], y[160:]
weight, bias = np.zeros(2), 0.
best_loss = np.inf
for epoch in range(150):
    order = rng.permutation(len(train_x))
    for start in range(0, len(order), 16):
        ids = order[start:start + 16]
        batch_x, batch_y = train_x[ids], train_y[ids]
        probability = 1 / (1 + np.exp(-(batch_x @ weight + bias)))
        error = probability - batch_y
        weight -= 0.2 * batch_x.T @ error / len(ids)
        bias -= 0.2 * error.mean()
    logits = valid_x @ weight + bias
    valid_loss = np.mean(np.logaddexp(0, logits) - valid_y * logits)
    if valid_loss < best_loss:
        best_loss = valid_loss
        best = (weight.copy(), bias, epoch + 1)
weight, bias, selected_epoch = best
print("Epoch selected by validation:", selected_epoch)
for name, features, targets in [("train", train_x, train_y),
                                ("validation", valid_x, valid_y),
                                ("test", test_x, test_y)]:
    logits = features @ weight + bias
    loss = np.mean(np.logaddexp(0, logits) - targets * logits)
    accuracy = np.mean((logits >= 0) == targets)
    print(f"{name}: BCE={loss:.4f}, accuracy={accuracy:.1%}, n={len(targets)}")
assert np.mean((test_x @ weight + bias >= 0) == test_y) > 0.9
# Test samples never select parameters or the saved epoch.
