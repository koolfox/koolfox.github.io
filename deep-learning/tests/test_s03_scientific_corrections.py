"""Check corrections against the published source and exact arithmetic."""
import json
import unittest
from decimal import Decimal
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from source_reader import load_source_translation  # noqa: E402
from source_activities import load_activities  # noqa: E402


class SessionThreeCorrections(unittest.TestCase):
    def test_notes_are_attached_to_source_without_changing_it(self):
        source = json.loads((ROOT / 'content/source-slides/spring-2026/s03.json').read_text())
        translation = json.loads((ROOT / 'content/translations/spring-2026/s03.json').read_text())
        payload = load_source_translation('s03', root=ROOT, term_id='spring-2026')
        for number in (30, 34, 47, 57, 59, 66, 75, 78, 82, 107):
            with self.subTest(page=number):
                page = payload['pages'][number - 1]
                self.assertEqual(len(page.get('editorial_notes', [])), 1)
                self.assertEqual(page['lines'], source['pages'][number - 1]['lines'])
                self.assertEqual([b['fa'] for b in page['blocks']],
                                 [b['fa'] for b in translation['pages'][number - 1]['blocks']])

    def test_quadratic_and_computational_graph(self):
        x, h = Decimal(2), Decimal('0.0001')
        f = lambda n: 2 - 3*n + 4*n*n
        self.assertEqual(f(x+h), Decimal('12.00130004'))
        self.assertEqual((f(x+h)-f(x))/h, Decimal('13.0004'))
        b, c, d = 2, 3, 4
        self.assertEqual(d*(b+c), 20)
        self.assertEqual(d, 4)  # df/dc; the local derivative dz/dc is 1

    def test_gradient_scaling_and_bias_derivative(self):
        # E=(t-o)^2 and H=E/2 have gradients in a 2:1 ratio.
        output, target = 0.474, 1.0
        full = 2 * (output - target)
        half = output - target
        self.assertAlmostEqual(full, 2 * half)
        rate = 0.01
        self.assertAlmostEqual(output - rate * full, output - (2 * rate) * half)
        # z=o_i*w_i+o_j*w_j+b: dz/db=1 and dz/dw_i=o_i.
        oi, oj, wi, wj, bias = 0.332, 0.525, -0.3, -0.2, 0.1
        z = lambda w, b: oi*w + oj*wj + b
        h = 1e-6
        self.assertAlmostEqual((z(wi, bias+h)-z(wi, bias-h))/(2*h), 1, places=9)
        self.assertAlmostEqual((z(wi+h, bias)-z(wi-h, bias))/(2*h), oi, places=9)

    def test_affine_question_is_multiple_choice(self):
        document = load_activities(ROOT, 'spring-2026', 's03')
        question = next(q for q in document['questions'] if q['id'] == 'page-30-concept')
        answer = question['answer']
        self.assertEqual(answer['kind'], 'choice')
        self.assertEqual(answer['options_fa'][answer['correct_index']], 'یک تبدیل آفین')
        self.assertIn('بایاس', question['prompt_fa'])
        # Two maps x -> 2x+1 and x -> 3x+4 compose to 6x+7.
        self.assertEqual(3 * (2 * 0 + 1) + 4, 7)


if __name__ == '__main__':
    unittest.main()
