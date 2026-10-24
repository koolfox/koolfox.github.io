"""Actual symmetric int8 weight quantization and measured reconstruction error."""
import numpy as np

weights = np.array([[-0.8, 0.2, 0.05], [1.1, -0.3, 0.7]], dtype=np.float32)
scale = np.max(np.abs(weights)) / 127
quantized = np.clip(np.rint(weights / scale), -127, 127).astype(np.int8)
restored = quantized.astype(np.float32) * scale
error = np.max(np.abs(restored - weights))
x = np.array([1., -2., 0.5], dtype=np.float32)
original_output = weights @ x
restored_output = restored @ x
assert error <= scale / 2 + 1e-7
assert quantized.nbytes * 4 == weights.nbytes
print("Original weight bytes:", weights.nbytes)
print("Int8 weight bytes (scale storage extra):", quantized.nbytes)
print("Maximum weight error:", round(float(error), 6))
print("Original output:", original_output.round(4))
print("Dequantized output:", restored_output.round(4))
