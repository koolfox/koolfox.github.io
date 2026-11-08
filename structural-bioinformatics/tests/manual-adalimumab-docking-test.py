"""Offline geometric and failure-preservation checks for the manual docking sample."""

import importlib.util
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
from Bio.PDB import PDBParser
from rdkit import Chem
from rdkit.Geometry import Point3D

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "manual_docking", PROJECT / "scripts/manual-adalimumab-docking.py"
)
docking = importlib.util.module_from_spec(spec)
spec.loader.exec_module(docking)


class ManualDockingTests(unittest.TestCase):
    def test_real_alignment_and_reference_frame(self):
        parser = PDBParser(QUIET=True)
        source = parser.get_structure("a", PROJECT / docking.INPUTS["3wd5"])[0]
        target = parser.get_structure("b", PROJECT / docking.INPUTS["repaired"])[0]
        fragment, audit = docking.fit_site(source, target)
        self.assertEqual(audit["matched_ca"], 141)
        self.assertAlmostEqual(audit["ca_rmsd_angstrom"], 1.5441, places=3)
        self.assertEqual(
            audit["mismatches_3wd5_7ta3_min_distance_to_fragment_angstrom"][0][:3],
            [31, "ASP", "ARG"],
        )
        self.assertTrue(np.allclose(fragment.mean(axis=0), [-2.588, -46.229, -34.856], atol=0.01))

    def test_pdbqt_receptor_coordinates_match_repaired_pdb(self):
        parser = PDBParser(QUIET=True)
        receptor = parser.get_structure("r", PROJECT / docking.INPUTS["repaired"])[0]["B"]
        count = 0
        for line in (PROJECT / docking.INPUTS["receptor"]).read_text().splitlines():
            if not line.startswith("ATOM  ") or line.split()[-1] in ("H", "HD", "HS"):
                continue
            residue = receptor[int(line[22:26])]
            name = line[12:16].strip()
            if int(line[22:26]) == 157 and name in ("O", "OXT"):
                name = "OXT" if name == "O" else "O"
            atom = residue[name]
            xyz = np.array([float(line[i : i + 8]) for i in (30, 38, 46)])
            np.testing.assert_allclose(xyz, atom.coord, atol=0.001)
            count += 1
        self.assertGreater(count, 1000)

    def test_failure_report_survives(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            with patch.object(
                docking.Chem, "SDMolSupplier", side_effect=ValueError("test failure")
            ):
                report = docking.run(Path(sys.executable).parent, output)
            self.assertEqual(report["status"], "failed")
            self.assertIn(
                "test failure", json.loads((output / "report.json").read_text())["failures"][0]
            )

    def test_sequence_stereo_bond_and_internal_clash_screens(self):
        mol = Chem.SDMolSupplier(str(PROJECT / docking.INPUTS["peptide"]), removeHs=False)[0]
        expected = docking.expected_molecule()
        self.assertTrue(docking.molecular_qc(mol, expected)["geometry_clean"])
        inverted = Chem.Mol(mol)
        atom = next(
            a for a in inverted.GetAtoms() if a.GetChiralTag() != Chem.ChiralType.CHI_UNSPECIFIED
        )
        atom.InvertChirality()
        self.assertFalse(
            docking.molecular_qc(inverted, expected)["graph_and_specified_stereo_match"]
        )
        corrupted = Chem.Mol(mol)
        corrupted.GetConformer().SetAtomPosition(0, Point3D(100, 100, 100))
        self.assertTrue(docking.molecular_qc(corrupted, expected)["bad_bonds"])
        clash = Chem.Mol(mol)
        topological = Chem.GetDistanceMatrix(clash)
        i, j = next(
            (i, j)
            for i in range(clash.GetNumAtoms())
            for j in range(i + 1, clash.GetNumAtoms())
            if clash.GetAtomWithIdx(i).GetAtomicNum() > 1
            and clash.GetAtomWithIdx(j).GetAtomicNum() > 1
            and topological[i, j] >= 4
        )
        clash.GetConformer().SetAtomPosition(j, clash.GetConformer().GetAtomPosition(i))
        self.assertTrue(docking.molecular_qc(clash, expected)["nonlocal_overlaps"])

    def test_mapped_pose_coordinates_detect_tampering(self):
        mol = Chem.MolFromSmiles("CCO")
        conf = Chem.Conformer(3)
        for i in range(3):
            conf.SetAtomPosition(i, Point3D(float(i), 0, 0))
        mol.AddConformer(conf)
        mapping = {1: 8, 2: 7, 3: 6}
        coords = {
            8: np.array([0.0, 0.0, 0.0]),
            7: np.array([1.0, 0.0, 0.0]),
            6: np.array([2.0, 0.0, 0.0]),
        }
        self.assertTrue(docking.pose_coordinate_qc(mol, mapping, coords, "CCO")["passed"])
        coords[7] = np.array([1.1, 0.0, 0.0])
        self.assertFalse(docking.pose_coordinate_qc(mol, mapping, coords, "CCO")["passed"])
        self.assertFalse(docking.pose_coordinate_qc(mol, mapping, coords, "OCC")["passed"])

    def test_receptor_completeness_and_coordinate_tampering(self):
        pdb = PROJECT / docking.INPUTS["repaired"]
        qt = PROJECT / docking.INPUTS["receptor"]
        self.assertTrue(docking.receptor_qc(pdb, qt)["passed"])
        with tempfile.TemporaryDirectory() as temp:
            altered = Path(temp) / "receptor.pdbqt"
            lines = qt.read_text().splitlines(keepends=True)
            altered.write_text("".join(lines[1:]))
            self.assertFalse(docking.receptor_qc(pdb, altered)["passed"])
            line = lines[0]
            lines[0] = line[:30] + f"{float(line[30:38]) + 0.1:8.3f}" + line[38:]
            altered.write_text("".join(lines))
            self.assertTrue(docking.receptor_qc(pdb, altered)["coordinate_mismatches"])

    def test_completed_run_with_zero_qc_passing_poses(self):
        calls = 0
        original_qc = docking.molecular_qc

        def fail_pose(mol, expected):
            nonlocal calls
            calls += 1
            result = original_qc(mol, expected)
            if calls > 1:
                result["failures"].append("injected pose failure")
                result["geometry_clean"] = False
            return result

        def fake_command(args, log, root, out, tool_dir, timeout):
            if log.name == "prepare.log":
                (out / "ligand.pdbqt").write_text("TORSDOF 30\n")
            elif log.name == "export.log":
                shutil.copyfile(PROJECT / docking.INPUTS["peptide"], out / "poses.sdf")
            log.write_text("")

        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            tool_dir = Path(sys.executable).parent
            with (
                patch.object(docking, "command", side_effect=fake_command),
                patch.object(docking, "molecular_qc", side_effect=fail_pose),
                patch.object(docking, "pdbqt_models", return_value=[({}, {}, "")]),
                patch.object(docking, "pose_coordinate_qc", return_value={"passed": True}),
            ):
                report = docking.run(tool_dir, output)
            saved = json.loads((output / "report.json").read_text())
            self.assertEqual(report["status"], "exploratory_no_qc_passing_poses")
            self.assertEqual(saved["geometry_clean_pose_count"], 0)
            self.assertIn("injected pose failure", saved["pose_qc"][0]["failures"])
            self.assertNotIn(str(tool_dir), json.dumps(saved))
            self.assertNotIn(str(output), json.dumps(saved))
            self.assertIn("<tool-dir>", json.dumps(saved["commands"]))

    def test_distance_matrix(self):
        d = docking.distance(np.array([[0, 0, 0], [0, 0, 3]]), np.array([[0, 0, 1]]))
        np.testing.assert_allclose(d[:, 0], [1, 2])


if __name__ == "__main__":
    unittest.main()
