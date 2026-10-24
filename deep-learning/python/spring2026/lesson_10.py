"""Distinguish pixel segmentation from an object's bounding box."""
import numpy as np

image = np.zeros((6, 7))
image[1:4, 2:5] = 0.9
image[2, 3] = 0.2  # One dark pixel inside the object.
truth = np.zeros_like(image, dtype=bool)
truth[1:4, 2:5] = True
mask = image > 0.5  # Explicit hand-written rule, not a trained model.
rows, cols = np.where(mask)
# Half-open bounds: top, left, bottom, right.
box = (int(rows.min()), int(cols.min()), int(rows.max() + 1), int(cols.max() + 1))
intersection = np.logical_and(mask, truth).sum()
union = np.logical_or(mask, truth).sum()
iou = intersection / union
print("Predicted pixel mask:\n", mask.astype(int))
print("Bounding box (top, left, bottom, right):", box)
print(f"Segmentation IoU: {intersection}/{union} = {iou:.3f}")
assert box == (1, 2, 4, 5)
assert np.isclose(iou, 8 / 9)
# One synthetic object; no class learning, detection network, or instance separation.
