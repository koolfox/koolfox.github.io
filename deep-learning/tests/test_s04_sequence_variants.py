import contextlib
import io
import unittest
from pathlib import Path


CODE = (Path(__file__).resolve().parents[1] / "workshops/spring-2026/s04_sequence_variants.py").read_text()


class SequenceVariantTest(unittest.TestCase):
    def run_variant(self, name):
        namespace = {}
        code = CODE.replace('variant = "many-to-many-delayed"', f'variant = "{name}"', 1)
        with contextlib.redirect_stdout(io.StringIO()) as output:
            exec(code, namespace)
        self.assertIn("مدلی آموزش داده یا اجرا نشده", output.getvalue())
        return namespace["result"]

    def test_five_diagrams_follow_source_figure(self):
        expected = {
            "one-to-one": ([1], [1]),
            "one-to-many": ([1, 0, 0], [1, 1, 1]),
            "many-to-one": ([1, 1, 1], [0, 0, 1]),
            "many-to-many-delayed": ([1, 1, 1, 0, 0], [0, 0, 1, 1, 1]),
            "many-to-many-aligned": ([1, 1, 1], [1, 1, 1]),
        }
        for name, (inputs, outputs) in expected.items():
            with self.subTest(name=name):
                result = self.run_variant(name)
                self.assertEqual((result["input_positions"], result["output_positions"]), (inputs, outputs))
                self.assertEqual((result["input_steps"], result["output_steps"]), (sum(inputs), sum(outputs)))

    def test_unknown_variant_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "آرایش"):
            self.run_variant("unknown")


if __name__ == "__main__":
    unittest.main()
