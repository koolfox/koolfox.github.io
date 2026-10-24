"""Our proposed reproducibility exercise, not code from the course slides."""
import numpy as np


def evaluate(seed):
    rng = np.random.default_rng(seed)
    x = rng.normal(size=(100, 2))
    y = x @ np.array([2., -1.]) + rng.normal(scale=0.2, size=100)
    # Split before fitting: the last 30 samples never enter model training.
    design = np.column_stack([x, np.ones(len(x))])
    train_x, test_x = design[:70], design[70:]
    train_y, test_y = y[:70], y[70:]
    weights = np.linalg.lstsq(train_x, train_y, rcond=None)[0]
    predictions = test_x @ weights
    mse = np.mean((predictions - test_y) ** 2)
    baseline = np.mean((train_y.mean() - test_y) ** 2)
    return mse, baseline


seeds = [23, 24, 25, 26, 27]
results = np.array([evaluate(seed) for seed in seeds])
repeat = np.array([evaluate(seed) for seed in seeds])
assert np.array_equal(results, repeat)
assert np.all(results[:, 0] < results[:, 1])
print("NumPy version:", np.__version__)
print("Seeds:", seeds)
print("Test MSE per run:", results[:, 0].round(4))
print(f"Mean and descriptive standard deviation: {results[:, 0].mean():.6f} {results[:, 0].std():.6f}")
print(f"Baseline mean test MSE: {results[:, 1].mean():.6f}")
