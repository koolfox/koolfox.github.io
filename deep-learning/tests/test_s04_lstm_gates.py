import contextlib
import io
import math
import unittest
from pathlib import Path

CODE = (Path(__file__).resolve().parents[1] / 'workshops/spring-2026/s04_lstm_gates.py').read_text()


def run(input_gate, forget_gate, output_gate=0.5):
    source = CODE.replace('input_gate = 0.25', f'input_gate = {input_gate}', 1)
    source = source.replace('forget_gate = 0.75', f'forget_gate = {forget_gate}', 1)
    source = source.replace('output_gate = 0.5', f'output_gate = {output_gate}', 1)
    scope = {}
    with contextlib.redirect_stdout(io.StringIO()) as output:
        exec(source, scope)
    return scope['result'], output.getvalue()


class GatesTest(unittest.TestCase):
    def test_input_and_forget_limits_preserve_the_other_contribution(self):
        result, text = run(0, 1)
        self.assertAlmostEqual(result['cell'], 0.6)
        self.assertEqual(result['new_contribution'], 0)
        self.assertEqual(result['direct_derivative'], 1)
        self.assertIn('مشتق کل شبکه نیست', text)
        self.assertIn('فرض آموزشی', text)
        result, _ = run(1, 0)
        self.assertAlmostEqual(result['cell'], -0.4)
        self.assertEqual(result['old_contribution'], 0)
        self.assertEqual(result['direct_derivative'], 0)
        self.assertAlmostEqual(result['hidden'], 0.5 * math.tanh(-0.4))

    def test_output_gate_and_invalid_gate(self):
        result, _ = run(1, 1, 0)
        self.assertNotEqual(result['cell'], 0)
        self.assertEqual(result['hidden'], 0)
        with self.assertRaises(ValueError):
            run(1, 1.1)


if __name__ == '__main__':
    unittest.main()
