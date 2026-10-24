"""Verify that each displayed code sample and output comes from its runnable file."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CourseLessonTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / 'assets/data/lessons.json').read_text())

    def test_complete_ordered_original_course(self):
        self.assertEqual([x['number'] for x in self.data['lessons']], list(range(1, 18)) + [20, 21, 23, 28])
        self.assertEqual(len({x['id'] for x in self.data['lessons']}), 21)
        for lesson in self.data['lessons']:
            self.assertTrue(lesson['goal'])
            self.assertTrue(lesson['explanation'])
            self.assertTrue(lesson['practice'])
            self.assertTrue(lesson['limitations'])
            self.assertEqual(lesson['source_url'], self.data['source_url'])

    def test_displayed_code_and_output_are_real(self):
        env = {**os.environ, 'PYTHONHASHSEED': '0', 'OPENBLAS_NUM_THREADS': '1', 'OMP_NUM_THREADS': '1'}
        for lesson in self.data['lessons']:
            with self.subTest(lesson=lesson['id']):
                expected_path = f"python/spring2026/lesson_{lesson['number']:02d}.py"
                self.assertEqual(lesson['source_path'], expected_path)
                path = ROOT / expected_path
                self.assertEqual(path.read_text(), lesson['code'])
                self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), lesson['code_sha256'])
                completed = subprocess.run([sys.executable, str(path)], text=True,
                                           capture_output=True, check=True, timeout=30,
                                           cwd=ROOT, env=env)
                self.assertEqual(completed.stdout.rstrip(), lesson['output'])

    def test_persian_without_vowel_diacritics(self):
        for lesson in self.data['lessons']:
            prose = '\n'.join([lesson['title'], lesson['goal'], *lesson['explanation'],
                               lesson['practice'], str(lesson['limitations'])])
            self.assertFalse(any('\u064b' <= c <= '\u065f' or c == '\u0670' for c in prose))


if __name__ == '__main__':
    unittest.main()
