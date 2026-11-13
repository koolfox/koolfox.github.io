import contextlib
import io
import math
import unittest
from pathlib import Path

CODE = (Path(__file__).resolve().parents[1] / 'workshops/spring-2026/s04_cross_entropy.py').read_text()


def run(code):
    scope = {}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(code, scope)
    return scope['result']


class CrossEntropyTest(unittest.TestCase):
    def test_source_distribution_for_each_explicit_target(self):
        for target, probability in zip('helo', [0.05, 0.1, 0.2, 0.65]):
            with self.subTest(target=target):
                result = run(CODE.replace('target = "e"', f'target = "{target}"', 1))
                self.assertEqual(result['probability'], probability)
                self.assertAlmostEqual(result['loss_ln'], -math.log(probability))
                self.assertAlmostEqual(result['loss_ln'], result['loss_log10'] * math.log(10))
        curve = run(CODE)['curve_loss']
        self.assertEqual(curve[-1], 0.0)
        self.assertTrue(all(a > b for a, b in zip(curve, curve[1:])))

    def test_zero_probability_and_invalid_distribution(self):
        zero = CODE.replace('[0.05, 0.1, 0.2, 0.65]', '[0.05, 0, 0.2, 0.75]', 1)
        self.assertIsNone(run(zero)['loss_ln'])
        bad = CODE.replace('[0.05, 0.1, 0.2, 0.65]', '[0.05, 0.1, 0.2, 0.7]', 1)
        with self.assertRaises(ValueError):
            run(bad)


if __name__ == '__main__':
    unittest.main()
