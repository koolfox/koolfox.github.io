import contextlib
import io
import math
import unittest
from pathlib import Path

CODE = (Path(__file__).resolve().parents[1] / 'workshops/spring-2026/s04_gru_diagram.py').read_text()


def run(reset, update):
    source = CODE.replace('reset_gate = 0.5', f'reset_gate = {reset}', 1)
    source = source.replace('update_gate = 0.25', f'update_gate = {update}', 1)
    scope = {}
    with contextlib.redirect_stdout(io.StringIO()) as output:
        exec(source, scope)
    return scope['result'], output.getvalue()


class GRUDiagramTest(unittest.TestCase):
    def test_diagram_update_extremes(self):
        old, text = run(0.5, 0)
        self.assertEqual(old['hidden'], 0.6)
        self.assertIn('قرارداد مکمل', text)
        new, _ = run(0.5, 1)
        self.assertEqual(new['hidden'], new['candidate'])
        self.assertEqual(new['old_contribution'], 0)

    def test_reset_changes_candidate_and_invalid_gates_fail(self):
        zero, _ = run(0, 1)
        one, _ = run(1, 1)
        self.assertAlmostEqual(zero['candidate'], math.tanh(0.8 * 0.4 + 0.1))
        self.assertGreater(one['candidate'], zero['candidate'])
        with self.assertRaises(ValueError):
            run(-0.1, 1)


if __name__ == '__main__':
    unittest.main()
