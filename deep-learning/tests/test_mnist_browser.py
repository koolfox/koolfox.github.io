import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MnistBrowserTests(unittest.TestCase):
    def test_authentic_subset_partition_and_integrity(self):
        folder = ROOT / "data/processed/mnist-browser"
        manifest = json.loads((folder / "manifest.json").read_text())
        self.assertFalse(manifest["official_test_used"])
        train = manifest["selection"]["train_indices"]
        validation = manifest["selection"]["validation_indices"]
        self.assertEqual(len(set(train)), 2000)
        self.assertEqual(len(set(validation)), 500)
        self.assertFalse(set(train) & set(validation))
        self.assertTrue(
            all(type(i) is int and 0 <= i < 60000 for i in train + validation)
        )
        labels = (folder / "labels.bin").read_bytes()
        for digit in range(10):
            self.assertEqual(labels[:2000].count(digit), 200)
            self.assertEqual(labels[2000:].count(digit), 50)
        for name, artifact in manifest["artifacts"].items():
            payload = (folder / name).read_bytes()
            self.assertEqual(len(payload), artifact["bytes"])
            self.assertEqual(hashlib.sha256(payload).hexdigest(), artifact["sha256"])
        self.assertEqual(len((folder / "pixels.bin").read_bytes()), 2500 * 784)
        self.assertEqual(
            set(manifest["source_artifacts"]),
            {"train-images-idx3-ubyte.gz", "train-labels-idx1-ubyte.gz"},
        )

    def test_training_builder_is_output_only_and_lazy(self):
        spec = importlib.util.spec_from_file_location(
            "mnist_training", ROOT / "scripts/mnist_training.py"
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder)
            page = module.build_mnist_training(ROOT, output, "test-v1")
            self.assertTrue(page.is_relative_to(output))
            text = page.read_text()
            self.assertIn("mnist-training.js?v=test-v1", text)
            self.assertNotIn(
                '<script src="/deep-learning/assets/vendor/mnist-runtime/', text
            )
            self.assertIn("data-step disabled", text)
