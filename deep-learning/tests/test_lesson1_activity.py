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

    def test_original_prompts_are_linked_and_prediction_is_not_truth(self):
        activities = load_activities(ROOT, 'spring-2026', 's01')
        questions = {item['id']: item for item in activities['questions']}
        for number in (32, 35, 36, 37, 39, 40, 41, 42, 43, 49, 53, 56, 57, 58, 59, 60, 65, 83, 84):
            page = activities['pages'][number - 1]
            self.assertTrue(page['question_ids'], f'missing questions on page {number}')
            for identity in page['question_ids']:
                self.assertEqual(questions[identity]['answer']['kind'], 'choice')
        question = questions['test-prediction']
        self.assertEqual(question['answer']['options_fa'][question['answer']['correct_index']], 'بدون مو')
        self.assertIn('نادرست', questions['test-error']['solution_fa'])
        self.assertIn('خاکستری', questions['page-57-detail']['prompt_fa'])

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
        training = next(item for item in config['page_notebooks'] if item['pages'] == [39, 40, 41, 42, 43])
        self.assertEqual(training['reference']['test_accuracy'], 0.0)
        self.assertIn('ساختگی', training['starter'])
        self.assertEqual(len(next(item for item in config['page_questions'] if item['pages'] == [53])['questions']), 3)
        for item in config['page_questions']:
            for question in item['questions']:
                self.assertGreaterEqual(len(question['options']), 2)
                self.assertIn(question['correct'], range(len(question['options'])))
        questions_42 = next(item for item in config['page_questions'] if item['pages'] == [42])['questions']
        self.assertTrue(any(question['options'][question['correct']] == 'بدون مو' for question in questions_42))


if __name__ == '__main__':
    unittest.main()
