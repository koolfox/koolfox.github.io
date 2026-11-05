"""Source activity for the class exercise in the first lecture."""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from source_activities import load_activities
from workshops import load_workshops
from student_practice import practice_page
import json


class LessonOneActivityTest(unittest.TestCase):
    def test_class_activity_has_three_linked_multiple_choice_questions(self):
        activities = load_activities(ROOT, 'spring-2026', 's01')
        page = activities['pages'][52]
        self.assertEqual(page['number'], 53)
        self.assertEqual(page['review_status'], 'reviewed')
        questions = {question['id']: question for question in activities['questions']}
        self.assertEqual(len(page['question_ids']), 3)
        for identity in page['question_ids']:
            self.assertEqual(questions[identity]['answer']['kind'], 'choice')
            self.assertEqual(questions[identity]['pages'], [53])

    def test_page_53_notebook_runs_and_preserves_illustrative_coefficients(self):
        unit = load_workshops('spring-2026', ROOT, execute=True, session_ids=['s01'])['s01']
        example = next(item for item in unit['source_examples'] if item['pages'] == [53])
        self.assertEqual(example['reference']['line'], [-2, -1, 0, 1, 2])
        self.assertEqual(example['reference']['parabola'], [4, 1, 0, 1, 4])
        self.assertIn('مختصات عددی نداده', example['limits_fa'])
        html = practice_page({'id': 'spring-2026'}, {'id': 's01', 'title_fa': 'مقدمه', 'workshop': unit})
        tag = '<script type="application/json" id="practice-config">'
        start = html.index(tag) + len(tag)
        config = json.loads(html[start:html.index('</script>', start)])
        self.assertTrue(any(item['pages'] == [53] for item in config['page_notebooks']))
        self.assertEqual(len(next(item for item in config['page_questions'] if item['pages'] == [53])['questions']), 3)


if __name__ == '__main__':
    unittest.main()
