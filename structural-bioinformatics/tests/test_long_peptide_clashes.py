"""Exercise the clash screen against real and synthetic PDBQT poses."""

import importlib.util
import json
import unittest
from pathlib import Path

import numpy as np

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "general_docking", PROJECT / "scripts/run_general_peptide_docking.py"
)
docking = importlib.util.module_from_spec(spec)
spec.loader.exec_module(docking)


class ClashTests(unittest.TestCase):
    def test_recorded_failed_poses_are_measured(self):
        root = PROJECT / "assets/long-peptide-pilot"
        receptor = docking.xyz((root / "receptor.pdbqt").read_text())
        for folder, minimum, pairs in (("bounded-1000", 0.589, 44), ("bounded-10000", 0.508, 80)):
            with self.subTest(folder=folder):
                poses = docking.inspect_poses((root / folder / "poses.pdbqt").read_text(), receptor)
                self.assertEqual(len(poses), 1)
                self.assertAlmostEqual(
                    poses[0]["minimum_heavy_atom_distance_angstrom"], minimum, places=3
                )
                self.assertEqual(poses[0]["heavy_atom_pairs_below_2_angstrom"], pairs)
                self.assertEqual(poses[0]["severe_clash_screen"], "fail")

    def test_all_modes_including_exact_threshold(self):
        def block(number, x):
            atom = (
                f"ATOM      1  C   ALA A   1    {x:8.3f}{0.0:8.3f}{0.0:8.3f}"
                "  1.00  0.00     0.000 C\n"
            )
            return f"MODEL {number}\nREMARK VINA RESULT: -1.0 0 0\n{atom}ENDMDL\n"

        rows = docking.inspect_poses(block(1, 1.0) + block(2, 2.0), np.array([[0., 0., 0.]]))
        self.assertEqual([row["severe_clash_screen"] for row in rows], ["fail", "pass"])
        self.assertEqual([row["heavy_atom_pairs_below_2_angstrom"] for row in rows], [1, 0])

    def test_invalid_pose_rejected(self):
        with self.assertRaisesRegex(ValueError, "No complete poses"):
            docking.inspect_poses("MODEL 1\n", np.array([[0., 0., 0.]]))

    def test_new_run_preserves_failure_diagnostics(self):
        for budget in (100000, 1000000):
            with self.subTest(budget=budget):
                root = PROJECT / f"assets/long-peptide-pilot/bounded-{budget}"
                report = json.loads((root / "report.json").read_text())
                row = report["candidates"][0]
                fixture = (
                    PROJECT / "tests/fixtures/long-peptide-pilot/run_general_peptide_docking.py.txt"
                )
                self.assertEqual(report["workflow_sha256"], docking.sha(fixture))
                pose_path = root / row["sequence"] / "poses.pdbqt"
                self.assertEqual(row["poses_sha256"], docking.sha(pose_path))
                receptor = docking.xyz((root / "receptor.pdbqt").read_text())
                actual = docking.inspect_poses(pose_path.read_text(), receptor)
                self.assertEqual(row["poses"], actual)
                self.assertEqual(report["status"], "failed")
                self.assertEqual(row["status"], "failed")
                self.assertTrue(any(p["severe_clash_screen"] == "fail" for p in actual))


if __name__ == "__main__":
    unittest.main()
