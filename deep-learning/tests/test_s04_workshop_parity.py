"""Check the lesson's parity experiment against independently counted bits."""

import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run_example(name, sequence, weight):
    path = ROOT / 'workshops/spring-2026' / name
    code = path.read_text().replace('sequence = [1, 0, 1, 1]', f'sequence = {sequence!r}')
    code = code.replace('u = 3.0', f'u = {weight!r}')
    scope = {}
    exec(compile(code, str(path), 'exec'), scope)
    return scope['result']


class LessonFourParityTests(unittest.TestCase):
    def test_actual_parity_is_visible_and_model_errors_are_not_hidden(self):
        for name in ('s04.py', 's04_parity.py'):
            with self.subTest(name=name):
                sequence = [1, 1, 0, 1]
                result = run_example(name, sequence, -3.0)
                actual = [sum(sequence[:n]) % 2 for n in range(1, len(sequence) + 1)]
                self.assertEqual(result['expected_odd'], actual)
                self.assertIn(False, result['correct'])
                self.assertEqual(result['correct'], [p == y for p, y in zip(result['predicted_odd'], actual)])

    def test_zero_state_is_undetermined_not_even(self):
        for name in ('s04.py', 's04_parity.py'):
            with self.subTest(name=name):
                result = run_example(name, [1, 0], 0.0)
                self.assertEqual(result['states'], [0.0, 0.0])
                self.assertEqual(result['predicted_odd'], [None, None])
                self.assertEqual(result['expected_odd'], [1, 1])
                self.assertEqual(result['correct'], [None, None])

    def test_nonfinite_weight_is_rejected(self):
        for name in ('s04.py', 's04_parity.py'):
            for weight in (float('nan'), float('inf')):
                with self.subTest(name=name, weight=weight), self.assertRaises(ValueError):
                    path = ROOT / 'workshops/spring-2026' / name
                    code = path.read_text().replace('u = 3.0', f'u = float({str(weight)!r})')
                    exec(compile(code, str(path), 'exec'), {})

    def test_lesson_questions_are_multiple_choice(self):
        unit = json.loads((ROOT / 'content/workshops/spring-2026/s04.json').read_text())
        self.assertTrue(unit['questions'])
        for question in unit['questions']:
            self.assertEqual(question['answer']['kind'], 'choice', question['id'])
        for example in unit['source_examples']:
            for question in example['questions']:
                self.assertEqual(question['answer']['kind'], 'choice', question['id'])


if __name__ == '__main__':
    unittest.main()
