"""Notebook execution must be reproducible and preserve the source program."""

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "assets"))
sys.path.insert(0, str(ROOT / "scripts"))

from notebook_kernel import execute_cells
from student_practice import code_cells, choice_question
from workshops import load_workshops, equal_results


class NotebookTests(unittest.TestCase):
    def test_editing_an_earlier_cell_recomputes_the_prefix_without_hidden_state(self):
        cells = [{"source": "x = 3\n"}, {"source": "result = {'square': x * x}\n"}]
        first, _ = execute_cells(cells, 1, {})
        self.assertEqual(first["outputs"][-1]["result"], {"square": 9})
        cells[0]["source"] = "x = 4\n"
        second, _ = execute_cells(cells, 1, {})
        self.assertEqual(second["outputs"][-1]["result"], {"square": 16})
        self.assertNotEqual(first["source_sha256"], second["source_sha256"])
        missing, scope = execute_cells([cells[1]], 0, {})
        self.assertFalse(missing["ok"])
        self.assertIsNone(scope)
        self.assertIn("NameError", missing["outputs"][0]["error"])

    def test_errors_identify_the_cell_and_nonfinite_outputs_are_rejected(self):
        result, _ = execute_cells([{"source": "a = 1"}, {"source": "def broken(:\n"}], 1, {})
        self.assertFalse(result["ok"])
        self.assertIn("cell_2.py", result["outputs"][1]["error"])
        result, _ = execute_cells([{"source": "result = {'x': float('nan')}"}], 0, {})
        self.assertFalse(result["ok"])

    def test_every_workshop_survives_cell_splitting_byte_for_byte_and_computes_its_reference(self):
        for term in ("spring-2022", "spring-2026"):
            for session, unit in load_workshops(term).items():
                with self.subTest(term=term, session=session):
                    cells = code_cells(unit["code"])
                    self.assertEqual("".join(c["source"] for c in cells), unit["code"])
                    record, scope = execute_cells(cells, len(cells) - 1, {})
                    self.assertTrue(record["ok"], record)
                    self.assertTrue(equal_results(scope["result"], unit["reference"]))
                    for question in unit["questions"]:
                        if question["answer"]["kind"] == "manual":
                            continue
                        adapted = choice_question(question)
                        self.assertEqual(adapted["answer"]["kind"], "choice")
                        if question["answer"]["kind"] == "number":
                            answer = adapted["answer"]
                            selected = float(answer["options_fa"][answer["correct_index"]])
                            self.assertAlmostEqual(selected, question["answer"]["value"], delta=max(question["answer"]["tolerance"], abs(selected) * 1e-10))
                            self.assertEqual(len(set(answer["options_fa"])), 4)


if __name__ == "__main__":
    unittest.main()
