"""A fixed convolution filter, ReLU, and max pooling: no training yet."""
import numpy as np

image = np.array([[0., 0., 1., 1.]] * 4)
kernel = np.array([[-1., 1.], [-1., 1.]])
# CNN libraries usually compute cross-correlation, without flipping the kernel.
feature = np.zeros((3, 3))
for row in range(3):
    for col in range(3):
        patch = image[row:row + 2, col:col + 2]
        feature[row, col] = np.sum(patch * kernel)
activated = np.maximum(feature, 0)
# A 2x2 window with stride 1 keeps this tiny example visible.
pooled = np.zeros((2, 2))
for row in range(2):
    for col in range(2):
        pooled[row, col] = activated[row:row + 2, col:col + 2].max()
print("Image:\n", image)
print("Edge feature:\n", feature)
print("ReLU + max pool:\n", pooled)
assert np.array_equal(feature, [[0, 2, 0]] * 3)
assert np.array_equal(pooled, np.full((2, 2), 2.))
