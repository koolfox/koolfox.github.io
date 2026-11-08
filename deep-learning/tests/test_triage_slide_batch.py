import importlib.util
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location('triage_slide_batch', Path(__file__).resolve().parents[1] / 'scripts/triage_slide_batch.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class TriageTests(unittest.TestCase):
    def test_counts_pages_once_and_marks_stale(self):
        scan = {'build_commit': 'old', 'records': [
            ['s01', 1, 'mobile', 'fail', ['overflow']],
            ['s01', 1, 'desktop', 'fail', ['overflow']],
            ['s01', 2, 'mobile', 'measured', []],
        ]}
        candidate = {'session': 's01', 'page': 1, 'status': 'needs_review'}
        result = MODULE.build_queue(scan, [candidate], 'new')
        self.assertTrue(result['historical_scan'])
        self.assertEqual(result['finding_page_counts'], {'overflow': 1})
        self.assertEqual(result['pages'][0]['priority'], 'fail')
        self.assertEqual(result['pages'][0]['proposals'], [candidate])

    def test_rejects_orphan_or_duplicate(self):
        record = ['s01', 1, 'mobile', 'measured', []]
        with self.assertRaises(ValueError):
            MODULE.build_queue({'build_commit': 'x', 'records': [record, record]}, [], 'x')
        with self.assertRaises(ValueError):
            MODULE.build_queue({'build_commit': 'x', 'records': [record]}, [{'session': 's01', 'page': 2}], 'x')


if __name__ == '__main__':
    unittest.main()
