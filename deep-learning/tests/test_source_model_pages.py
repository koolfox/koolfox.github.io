import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "source_models", ROOT / "scripts/source_models.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ModelPageTests(unittest.TestCase):
    def test_pages_only_written_to_output(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder)
            pages = module.build_model_pages(ROOT, output, "test-revision")
            self.assertEqual(
                len(pages),
                len(
                    json.loads((ROOT / "models/source-models.json").read_text())[
                        "models"
                    ]
                ),
            )
            for page in pages:
                self.assertTrue(page.is_relative_to(output))
                text = page.read_text()
                self.assertIn("data-model-id=", text)
                self.assertIn("source-model-app.js?v=test-revision", text)
                self.assertNotIn(".onnx", text)

    def test_invalid_model_id_cannot_escape_output(self):
        with tempfile.TemporaryDirectory() as folder:
            root, output = Path(folder) / "source", Path(folder) / "output"
            (root / "models").mkdir(parents=True)
            (root / "models/source-models.json").write_text(
                json.dumps({"models": [{"id": "../escape"}]})
            )
            with self.assertRaises(ValueError):
                module.build_model_pages(root, output)


if __name__ == "__main__":
    unittest.main()
