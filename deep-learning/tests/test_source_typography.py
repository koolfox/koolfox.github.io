import hashlib
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from extract_source_typography import line_style, match_lines, validate_source


def chars(text, color=(1, 1, 1), font="Calibri"):
    return [
        {"text": value, "non_stroking_color": color, "fontname": font} for value in text
    ]


class SourceTypographyTests(unittest.TestCase):
    def test_exact_matches_reject_duplicates_and_nearby_text(self):
        extracted = [
            {"text": "A  title", "chars": chars("A title", font="Calibri-Bold")},
            {"text": "Repeated", "chars": chars("Repeated", font="Calibri-Bold")},
            {
                "text": "Other formula",
                "chars": chars("Other formula", font="Calibri-Bold"),
            },
        ]
        result, matched = match_lines(
            ["A title", "Repeated", "Repeated", "Other formulas"], extracted, {}
        )
        self.assertEqual(matched, 1)
        self.assertEqual(result, [{"index": 0, "bold": True}])

    def test_mixed_color_is_an_exact_accent_not_a_whole_line_color(self):
        text = "- least related?"
        raw = chars("- least", (1, 0.753, 0)) + chars(" related?")
        style = line_style(text, raw, {})
        self.assertNotIn("color", style)
        self.assertEqual(style["accents"], [{"text": "least", "color": "#ffc000"}])
        blue = line_style("abcdefghij", chars("abcdefgh", (0, 0, 1)) + chars("ij"), {})
        self.assertEqual(blue["color"], "#0000ff")

    def test_font_descriptor_proves_bold_without_guessing_light(self):
        self.assertEqual(
            line_style(
                "Normal", chars("Normal", font="Calibri-Light"), {"Calibri-Light": 300}
            ),
            {},
        )
        self.assertEqual(
            line_style("Strong", chars("Strong", font="Custom"), {"Custom": 700}),
            {"bold": True},
        )
        self.assertEqual(
            line_style("Italic", chars("Italic", font="Custom-Italic"), {}),
            {"italic": True},
        )

    def test_stale_pdf_or_line_hash_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "sample.pdf"
            path.write_bytes(b"immutable PDF fixture")
            page = {
                "number": 1,
                "lines": ["A title"],
                "source_text_sha256": hashlib.sha256(b"A title").hexdigest(),
            }
            source = {
                "source": {
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                    "page_count": 1,
                },
                "pages": [page],
            }
            validate_source(source, path)
            page["lines"] = ["Changed"]
            with self.assertRaisesRegex(ValueError, "line identity"):
                validate_source(source, path)
            path.write_bytes(b"changed PDF")
            with self.assertRaisesRegex(ValueError, "PDF hash"):
                validate_source(source, path)


if __name__ == "__main__":
    unittest.main()
