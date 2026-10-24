"""Calculate two fairness diagnostics; these do not certify a model as fair."""
import numpy as np

# Synthetic groups, labels and predictions; no real people represented.
groups = np.array(["A"] * 4 + ["B"] * 4)
y = np.array([1, 1, 0, 0, 1, 1, 0, 0])
pred = np.array([1, 1, 1, 0, 1, 0, 0, 0])
selection, tpr = {}, {}
for group in ("A", "B"):
    mask = groups == group
    positive = mask & (y == 1)
    selection[group] = pred[mask].mean()
    tpr[group] = pred[positive].mean() if positive.any() else np.nan
    print(group, "selection rate:", selection[group], "true-positive rate:", tpr[group])
demographic_gap = abs(selection["A"] - selection["B"])
equal_opportunity_gap = abs(tpr["A"] - tpr["B"])
assert demographic_gap == 0.5
assert equal_opportunity_gap == 0.5
assert np.mean(pred == y) == 0.75
print("Overall accuracy:", np.mean(pred == y))
print("Demographic parity gap:", demographic_gap)
print("Equal opportunity gap:", equal_opportunity_gap)
