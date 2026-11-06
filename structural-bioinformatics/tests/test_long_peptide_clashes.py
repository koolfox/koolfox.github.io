"""Exercise the clash screen against real and synthetic PDBQT poses."""

import importlib.util
import json
import math
import re
import unittest
from collections import Counter
from pathlib import Path

import numpy as np

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "general_docking", PROJECT / "scripts/run_general_peptide_docking.py"
)
docking = importlib.util.module_from_spec(spec)
spec.loader.exec_module(docking)


class ClashTests(unittest.TestCase):
    def test_independent_receptor_and_distance_audit(self):
        root = PROJECT / "assets/long-peptide-pilot/bounded-1000000"
        report = json.loads((root / "report.json").read_text())
        receptor_path = root / "receptor.pdbqt"
        self.assertEqual(docking.sha(receptor_path), report["receptor_pdbqt_sha256"])
        self.assertEqual(docking.sha(root / "selected-chain.pdb"), report["selected_pdb_sha256"])
        log = (root / "MQIFVKTLTGKTI/vina.stdout.txt").read_text()
        self.assertIn(
            "Rigid receptor: /private/tmp/long-peptide-search-1000000/receptor.pdbqt", log
        )

        def atom_lines(text):
            return [line for line in text.splitlines() if line.startswith(("ATOM  ", "HETATM"))]

        def coordinates(line):
            return tuple(float(line[i : i + 8]) for i in (30, 38, 46))

        receptor = atom_lines(receptor_path.read_text())
        types = Counter(line.split()[-1] for line in receptor)
        self.assertEqual(
            types, {"C": 357, "OA": 118, "N": 104, "SA": 1, "HD": 142, "A": 21, "NA": 1}
        )
        heavy = [line for line in receptor if line.split()[-1] != "HD"]
        selected = atom_lines((root / "selected-chain.pdb").read_text())
        selected_heavy = [line for line in selected if line[76:78].strip() not in ("H", "D")]
        self.assertEqual(
            Counter(map(coordinates, heavy)), Counter(map(coordinates, selected_heavy))
        )

        pose_path = root / "MQIFVKTLTGKTI/poses.pdbqt"
        blocks = re.findall(r"^MODEL\s+\d+\s*$(.*?)^ENDMDL\s*$", pose_path.read_text(), re.M | re.S)
        self.assertEqual(len(blocks), 2)
        for block, expected, pairs in zip(
            blocks, (0.8605126379, 1.2496375475), (45, 32), strict=True
        ):
            ligand = atom_lines(block)
            self.assertEqual(
                Counter(line.split()[-1] for line in ligand),
                {"C": 62, "OA": 18, "N": 16, "HD": 26, "SA": 1, "A": 6},
            )
            distances = [
                math.dist(coordinates(a), coordinates(b))
                for a in ligand
                if a.split()[-1] != "HD"
                for b in heavy
            ]
            self.assertAlmostEqual(min(distances), expected, places=9)
            self.assertEqual(sum(distance < 2 for distance in distances), pairs)

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

    def test_real_pose_box_diagnostic(self):
        root = PROJECT / "assets/long-peptide-pilot/bounded-1000000"
        receptor = docking.xyz((root / "receptor.pdbqt").read_text())
        poses = docking.inspect_poses(
            (root / "MQIFVKTLTGKTI/poses.pdbqt").read_text(),
            receptor,
            [30, 28, 15],
            [20, 20, 20],
        )
        self.assertEqual([p["heavy_atoms_outside_box"] for p in poses], [7, 3])
        self.assertTrue(all(p["severe_clash_screen"] == "fail" for p in poses))

    def test_bounded_workflow_records_box_diagnostic_on_failure(self):
        root = PROJECT / "assets/long-peptide-pilot/workflow-box-check"
        report = json.loads((root / "report.json").read_text())
        row = report["candidates"][0]
        receptor = docking.xyz((root / "receptor.pdbqt").read_text())
        pose = root / row["sequence"] / "poses.pdbqt"
        self.assertEqual(row["poses_sha256"], docking.sha(pose))
        self.assertEqual(
            row["poses"],
            docking.inspect_poses(pose.read_text(), receptor, [30, 28, 15], [20, 20, 20]),
        )
        self.assertEqual(row["poses"][0]["heavy_atoms_outside_box"], 6)
        self.assertEqual(report["status"], "failed")

    def test_recorded_rigid_diagnostics_remain_failed(self):
        root = PROJECT / "assets/long-peptide-pilot"
        receptor = docking.xyz((root / "bounded-1000000/receptor.pdbqt").read_text())
        for filename, pairs in (("poses.pdbqt", 86), ("poses-box30.pdbqt", 15)):
            with self.subTest(filename=filename):
                poses = docking.inspect_poses(
                    (root / "rigid-diagnostic" / filename).read_text(), receptor
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

        rows = docking.inspect_poses(block(1, 1.0) + block(2, 2.0), np.array([[0.0, 0.0, 0.0]]))
        self.assertEqual([row["severe_clash_screen"] for row in rows], ["fail", "pass"])
        self.assertEqual([row["heavy_atom_pairs_below_2_angstrom"] for row in rows], [1, 0])

    def test_invalid_pose_rejected(self):
        with self.assertRaisesRegex(ValueError, "No complete poses"):
            docking.inspect_poses("MODEL 1\n", np.array([[0.0, 0.0, 0.0]]))

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
