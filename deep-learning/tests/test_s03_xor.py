import json
import unittest
from pathlib import Path


class XorSlideTest(unittest.TestCase):
    def test_truth_table_matches_network_in_source(self):
        root = Path(__file__).resolve().parents[1]
        slides = json.loads((root / 'content/translations/spring-2026/s03.json').read_text())['pages']

        def threshold(value):
            return int(value >= 0)

        for slide in slides[7:12]:
            self.assertIn(slide['number'], range(8, 13))
            for a, b, expected in slide['tables'][0]['rows']:
                a, b, expected = int(a), int(b), int(expected)
                first = threshold(a + b - 0.5)
                second = threshold(a + b - 1.5)
                output = threshold(first - 2 * second - 0.5)
                self.assertEqual(output, expected, (slide['number'], a, b))


if __name__ == '__main__':
    unittest.main()
