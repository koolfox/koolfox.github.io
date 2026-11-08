import sys
import tempfile
import unittest
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from inventory_spring_2026 import inventory


class InventoryTest(unittest.TestCase):
    def test_inventory_is_complete_deterministic_and_does_not_infer_rendering(self):
        first = inventory(ROOT)
        second = inventory(ROOT)
        self.assertEqual(first, second)
        self.assertEqual(len(first), 1303)
        self.assertEqual(len({row['session'] for row in first}), 21)
        self.assertEqual(Counter(row['page_pdf_policy'] for row in first), {'individual_pdf': 1275, 'full_pdf': 28})
        self.assertTrue(all(row['render_status'] == 'not_observed' and row['render_fallback_reason'] is None for row in first))
        self.assertTrue(all(row['artifact_page_pdf_status'] == 'not_checked' for row in first))
        self.assertEqual(len({(row['session'], row['page']) for row in first}), 1303)

    def test_missing_artifact_manifests_are_not_reported_as_present(self):
        with tempfile.TemporaryDirectory() as folder:
            rows = inventory(ROOT, Path(folder))
        self.assertTrue(all(row['artifact_page_pdf_status'] == 'manifest_missing' for row in rows))


if __name__ == '__main__':
    unittest.main()
