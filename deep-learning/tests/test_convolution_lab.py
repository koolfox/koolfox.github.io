"""Hand-computed convolution examples, channel sharing and shape invariants."""

import importlib
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python"))
lab = importlib.import_module("convolution_lab")


class ConvolutionLabTests(unittest.TestCase):
    def test_cross_correlation_and_mathematical_convolution_differ(self):
        image = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
        kernel = [[1, 2], [0, -1]]
        self.assertEqual(lab.correlate([image], [kernel])["output"], [[0, 2], [6, 8]])
        self.assertEqual(
            lab.correlate([image], [kernel], flip=True)["output"], [[12, 14], [18, 20]]
        )

    def test_channels_sum_and_bias_is_added_once(self):
        result = lab.correlate(
            [[[1, 2], [3, 4]], [[5, 6], [7, 8]]],
            [[[1, 0], [0, 1]], [[2, 0], [0, -1]]],
            bias=3,
        )
        self.assertEqual(result["output"], [[10]])
        self.assertEqual(result["parameter_count"], 9)
        self.assertEqual(result["multiplications"], 8)
        self.assertEqual(sum(t["product"] for t in result["terms"][0][0]) + 3, 10)

    def test_padding_stride_and_term_provenance(self):
        result = lab.correlate(
            [[[1, 2], [3, 4]]], [[[1, 1], [1, 1]]], stride=2, padding=1
        )
        self.assertEqual(result["output"], [[1, 2], [3, 4]])
        self.assertEqual(result["output_shape"], [1, 2, 2])
        self.assertEqual(sum(t["padded"] for t in result["terms"][0][0]), 3)
        self.assertEqual(result["multiplications"], 16)

    def test_pooling_uses_floor_shape_and_has_no_zero_padding(self):
        matrix = [[-1, -2, 100], [-3, -4, 100], [100, 100, 100]]
        self.assertEqual(lab.pool(matrix)["output"], [[-1]])
        self.assertEqual(lab.pool(matrix, mode="average")["output"], [[-2.5]])
        self.assertEqual(lab.pool(matrix, stride=1)["output"], [[-1, 100], [100, 100]])

    def test_shape_and_value_errors_are_explicit(self):
        for size, kernel, stride, pad in (
            (2, 3, 1, 0),
            (2, 1, 0, 0),
            (2, 1, 1, -1),
            (2, 1, 1.5, 0),
        ):
            with self.assertRaises(ValueError):
                lab.output_size(size, kernel, stride, pad)
        with self.assertRaises(ValueError):
            lab.correlate([[[1], [2, 3]]], [[[1]]])
        with self.assertRaises(ValueError):
            lab.correlate([[[float("nan")]]], [[[1]]])


if __name__ == "__main__":
    unittest.main()
