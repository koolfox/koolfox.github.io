import contextlib
import io
import math
import unittest
from pathlib import Path

CODE = (Path(__file__).resolve().parents[1] / 'workshops/spring-2026/s04_vanishing_gradient.py').read_text()


class DerivativeCurvesTest(unittest.TestCase):
    def test_reference_and_derivative_curves(self):
        scope = {}
        with contextlib.redirect_stdout(io.StringIO()) as output:
            exec(CODE, scope)
        result = scope['result']
        self.assertEqual(result['final'], 0.25 ** 4)
        self.assertEqual(result['rounded_source'], 0.004)
        self.assertIn('تنها بخشی از زنجیره', output.getvalue())
        self.assertIn('آموزش نمیدهد', output.getvalue())
        for x, linear, sigmoid, tanh in zip(result['points'], result['linear_derivative'], result['sigmoid_derivative'], result['tanh_derivative']):
            probability = 1 / (1 + math.exp(-x))
            self.assertEqual(linear, 1)
            self.assertAlmostEqual(sigmoid, probability * (1 - probability))
            self.assertAlmostEqual(tanh, 1 - math.tanh(x) ** 2)
        self.assertEqual(result['sigmoid_derivative'][4], 0.25)
        self.assertEqual(result['tanh_derivative'][4], 1.0)


if __name__ == '__main__':
    unittest.main()
