"""Checks for the original majority-table and mistake-driven examples."""
import contextlib
import io
import json
from pathlib import Path
import runpy
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from workshops import load_workshops
from source_reader import load_source_translation
from student_practice import practice_page


class SecondLectureQuestionTest(unittest.TestCase):
    def test_truth_table_and_exposed_page_questions(self):
        unit = load_workshops('spring-2026', ROOT, execute=True, session_ids=['s02'])['s02']
        example = next(item for item in unit['source_examples'] if item['id'] == 'majority-truth')
        self.assertEqual(example['pages'], [21, 22, 23])
        self.assertEqual(example['reference']['targets'], [-1, 1, 1, 1, -1, -1, 1, -1])
        questions = {item['id']: item for item in unit['activities']['questions']}
        for page in [21, 22, 23, 26, 29, 31]:
            item = unit['activities']['pages'][page - 1]
            self.assertTrue(item['question_ids'])
            for key in item['question_ids']:
                self.assertEqual(questions[key]['answer']['kind'], 'choice')
        markup = practice_page({'id': 'spring-2026'}, {'id': 's02', 'title_fa': 'پرسپترون', 'workshop': unit})
        tag = '<script type="application/json" id="practice-config">'
        start = markup.index(tag) + len(tag)
        config = json.loads(markup[start:markup.index('</script>', start)])
        self.assertTrue(any(item['pages'] == [21, 22, 23] for item in config['page_notebooks']))

    def test_sample_two_changes_weights_before_rows_two_to_four_match(self):
        with contextlib.redirect_stdout(io.StringIO()):
            trace = runpy.run_path(str(ROOT / 'workshops/spring-2026/s02_majority_epoch.py'))['result']['trace']
        self.assertNotEqual(trace[0]['weights'], trace[1]['weights'])
        self.assertEqual(trace[1]['weights'], trace[2]['weights'])
        self.assertEqual(trace[2]['weights'], trace[3]['weights'])
        self.assertEqual(trace[1]['error'], 2)
        self.assertEqual(trace[2]['error'], 0)
        self.assertEqual(trace[3]['error'], 0)
        page = load_source_translation('s02', root=ROOT, require_reviewed=False, term_id='spring-2026')['pages'][30]
        note = next(note for note in page['editorial_notes'] if note['kind'] == 'source_correction')
        self.assertIn('نمونه ۲', note['fa'])


if __name__ == '__main__':
    unittest.main()
