"""Keep labels aligned, split data, and verify a vectorized computation."""
import numpy as np

rng = np.random.default_rng(9)
x = rng.normal(size=(24, 4))
y = (x.sum(axis=1) > 0).astype(int)
sample_ids = rng.permutation(len(x))
train_ids, test_ids = sample_ids[:18], sample_ids[18:]
train_x, train_y = x[train_ids], y[train_ids]
test_x, test_y = x[test_ids], y[test_ids]
assert set(train_ids).isdisjoint(test_ids)
assert len(set(train_ids) | set(test_ids)) == len(x)
assert np.array_equal(train_y, (train_x.sum(axis=1) > 0).astype(int))
assert np.array_equal(test_y, (test_x.sum(axis=1) > 0).astype(int))
# The same fixed dense-layer computation, not model training.
weight = rng.normal(size=(4, 3))
bias = np.array([0.1, 0.2, 0.3])
loop_output = np.zeros((len(train_x), 3))
for sample in range(len(train_x)):
    for output in range(3):
        total = bias[output]
        for feature in range(4):
            total += train_x[sample, feature] * weight[feature, output]
        loop_output[sample, output] = total
vector_output = train_x @ weight + bias
assert np.allclose(loop_output, vector_output)
print("Train / test samples:", len(train_y), "/", len(test_y))
print("Training labels aligned:", np.array_equal(train_y, y[train_ids]))
print("Loop and matrix outputs match:", np.allclose(loop_output, vector_output))
print("First output row:", vector_output[0].round(4).tolist())
# Vectorization exposes matrix operations; this is not a GPU speed benchmark.
