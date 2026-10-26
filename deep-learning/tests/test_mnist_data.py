"""IDX parsing and split invariants require neither torch nor network access."""

import gzip
import importlib
import struct
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "labs/cnn-mnist"))
data = importlib.import_module("mnist_data")


class MnistDataTests(unittest.TestCase):
    def test_idx_headers_payloads_and_labels_are_checked(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sample.gz"
            path.write_bytes(
                gzip.compress(struct.pack(">2I", 2049, 3) + bytes([1, 4, 8]))
            )
            self.assertEqual(data.read_idx(path, False), (3, bytes([1, 4, 8])))
            for raw in (
                b"short",
                struct.pack(">2I", 2049, 2) + bytes([1]),
                struct.pack(">2I", 2049, 1) + bytes([10]),
            ):
                path.write_bytes(gzip.compress(raw))
                with self.assertRaises(ValueError):
                    data.read_idx(path, False)
            image = bytes([0]) * 784
            path.write_bytes(gzip.compress(struct.pack(">4I", 2051, 1, 28, 28) + image))
            self.assertEqual(data.read_idx(path, True), (1, image))
            path.write_bytes(gzip.compress(struct.pack(">4I", 2051, 1, 14, 56) + image))
            with self.assertRaises(ValueError):
                data.read_idx(path, True)

    def test_split_is_disjoint_stratified_and_reproducible(self):
        labels = list(range(10)) * 100
        train, validation = data.stratified_split(labels, 42)
        self.assertEqual((len(train), len(validation)), (900, 100))
        self.assertFalse(set(train) & set(validation))
        self.assertEqual(set(train) | set(validation), set(range(1000)))
        self.assertEqual(
            [sum(labels[i] == c for i in validation) for c in range(10)], [10] * 10
        )
        self.assertEqual((train, validation), data.stratified_split(labels, 42))
        self.assertNotEqual(data.indices_digest(train), data.indices_digest(validation))

    def test_smoke_samples_remain_inside_the_same_full_partition(self):
        labels = list(range(10)) * 200
        full_train, full_validation = data.stratified_split(labels, 7)
        train, validation = data.stratified_split(labels, 7, smoke=True)
        self.assertEqual((len(train), len(validation)), (640, 160))
        self.assertTrue(set(train) <= set(full_train))
        self.assertTrue(set(validation) <= set(full_validation))
        self.assertEqual(len(data.selected_test_indices(labels, 8, smoke=True)), 320)

    def test_missing_or_corrupt_cache_does_not_trigger_an_implicit_download(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(FileNotFoundError):
                data.verify_data(directory)
            path = Path(directory) / next(iter(data.RESOURCES))
            path.write_bytes(b"corrupt evidence")
            with self.assertRaisesRegex(ValueError, "checksum mismatch"):
                data.verify_data(directory)
            self.assertEqual(path.read_bytes(), b"corrupt evidence")


if __name__ == "__main__":
    unittest.main()
