"""Offline invariants for the deposited-coordinate fragment, not a binding test."""

import hashlib
import importlib.util
import json
import math
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "manual_extract", ROOT / "scripts/manual-adalimumab-extract.py"
)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class FragmentTest(unittest.TestCase):
    def test_reproducible_and_hash_checked(self):
        source = (ROOT / "assets/3wd5.pdb").read_bytes()
        pdb, report = MODULE.build(source)
        self.assertEqual(pdb, (ROOT / report["fragment"]["path"]).read_bytes())
        self.assertEqual(
            report, json.loads((ROOT / "data/processed/manual-adalimumab.json").read_text())
        )
        self.assertEqual(hashlib.sha256(pdb).hexdigest(), report["fragment"]["sha256"])
        with self.assertRaises(ValueError):
            MODULE.build(source + b"changed")

    def test_fragment_is_exact_source_subset_and_contiguous(self):
        source = (ROOT / "assets/3wd5.pdb").read_text().splitlines()
        out = (ROOT / "assets/manual-adalimumab-bound-fragment.pdb").read_text().splitlines()
        atoms = [line for line in out if line.startswith("ATOM  ")]
        self.assertEqual(len(atoms), 65)
        self.assertTrue(all(line in source for line in atoms))
        self.assertTrue(
            all(
                line[21] == "H"
                and not line[26].strip()
                and 52 <= int(line[22:26]) <= 59
                and float(line[54:60]) > 0
                for line in atoms
            )
        )
        self.assertFalse(any(line.startswith(("HETATM", "CONECT", "MODEL")) for line in out))
        self.assertEqual(out[-1], "END")
        groups = {n: [line for line in atoms if int(line[22:26]) == n] for n in range(52, 60)}
        self.assertTrue(
            all(
                {"N", "CA", "C", "O"} <= {line[12:16].strip() for line in g}
                for g in groups.values()
            )
        )
        for n in range(52, 59):
            c = next(line for line in groups[n] if line[12:16].strip() == "C")
            nxt = next(line for line in groups[n + 1] if line[12:16].strip() == "N")

            def xyz(line):
                return [float(line[i : i + 8]) for i in (30, 38, 46)]

            self.assertTrue(1.1 <= math.dist(xyz(c), xyz(nxt)) <= 1.8)

    def test_contact_and_model_status(self):
        report = json.loads((ROOT / "data/processed/manual-adalimumab.json").read_text())
        closest = report["contacts"]["closest"]
        self.assertEqual(report["selection"]["sequence"], "TWNSGHID")
        self.assertEqual(report["contacts"]["count"], 32)
        self.assertEqual(
            (closest["peptide_atom"]["author_number"], closest["peptide_atom"]["name"]),
            ("57", "NE2"),
        )
        self.assertEqual(
            (closest["tnf_atom"]["author_number"], closest["tnf_atom"]["name"]), ("145", "O")
        )
        self.assertAlmostEqual(closest["distance_angstrom"], 3.0459, places=4)
        model = json.loads((ROOT / report["independent_sequence_model"]["report_path"]).read_text())
        self.assertEqual(model["status"], "requires_further_validation")
        self.assertEqual(model["sequence"], "TWNSGHID")
        self.assertIsNone(model["input_coordinates"])
        self.assertEqual(
            hashlib.sha256((ROOT / model["output_path"]).read_bytes()).hexdigest(),
            model["output_sha256"],
        )
        self.assertEqual(model["qc_status"], "passed_basic_checks")
        attempt = json.loads(
            (ROOT / "data/processed/manual-adalimumab-model-attempt1.json").read_text()
        )
        self.assertEqual(attempt["status"], "failed")
        self.assertIn("did not converge", attempt["error"])

    def test_symmetry_contacts_reproducible(self):
        spec = importlib.util.spec_from_file_location(
            "neighbor", ROOT / "scripts/manual-adalimumab-neighbor.py"
        )
        neighbor = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(neighbor)
        calculated = neighbor.calculate()
        saved = json.loads((ROOT / "data/processed/manual-adalimumab-neighbor.json").read_text())
        self.assertEqual(calculated, saved)
        self.assertEqual([saved["chains"][c]["contact_count"] for c in "ABC"], [32, 0, 82])


class OutputSafetyTest(unittest.TestCase):
    scripts = [
        "manual-adalimumab-extract.py",
        "manual-adalimumab-neighbor.py",
        "manual-adalimumab-model.py",
    ]

    def run_script(self, name, *args):
        return subprocess.run(
            [sys.executable, str(ROOT / "scripts" / name), *map(str, args)],
            capture_output=True,
            text=True,
            check=False,
        )

    def test_existing_directory_and_symlink_preserved(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            existing = tmp / "existing"
            existing.mkdir()
            names = [
                "manual-adalimumab-bound-fragment.pdb",
                "manual-adalimumab.json",
                "manual-adalimumab-neighbor.json",
                "manual-adalimumab-sequence-model.sdf",
                "manual-adalimumab-model.json",
            ]
            for name in names:
                (existing / name).write_bytes(b"preexisting artifact")
            alias = tmp / "alias"
            alias.symlink_to(existing, target_is_directory=True)
            for script in self.scripts:
                for target in (existing, alias):
                    with self.subTest(script=script, target=target):
                        result = self.run_script(script, "--output-dir", target)
                        self.assertNotEqual(result.returncode, 0)
                        self.assertTrue(
                            all(
                                (existing / name).read_bytes() == b"preexisting artifact"
                                for name in names
                            )
                        )
            self.assertEqual(set(os.listdir(existing)), set(names))

    def test_output_directory_required(self):
        for script in self.scripts:
            with self.subTest(script=script):
                self.assertNotEqual(self.run_script(script).returncode, 0)

    def test_fresh_extract_and_neighbor_outputs(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            extract = tmp / "extract"
            result = self.run_script(self.scripts[0], "--output-dir", extract)
            self.assertEqual(result.returncode, 0, result.stderr)
            report = json.loads((extract / "manual-adalimumab.json").read_text())
            fragment = (extract / report["fragment"]["path"]).read_bytes()
            self.assertEqual(hashlib.sha256(fragment).hexdigest(), report["fragment"]["sha256"])
            self.assertEqual(
                fragment, (ROOT / "assets/manual-adalimumab-bound-fragment.pdb").read_bytes()
            )
            self.assertEqual(report["contacts"]["count"], 32)
            self.assertIsNone(report["independent_sequence_model"]["report_path"])
            neighbor = tmp / "neighbor"
            result = self.run_script(self.scripts[1], "--output-dir", neighbor)
            self.assertEqual(result.returncode, 0, result.stderr)
            report = json.loads((neighbor / "manual-adalimumab-neighbor.json").read_text())
            self.assertEqual([report["chains"][c]["contact_count"] for c in "ABC"], [32, 0, 82])

    def test_model_failure_preserves_preexisting_file(self):
        try:
            import rdkit  # noqa: F401
        except ImportError:
            self.skipTest("RDKit not available")
        spec = importlib.util.spec_from_file_location(
            "manual_model", ROOT / "scripts" / self.scripts[2]
        )
        model = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(model)
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            existing = tmp / "other.sdf"
            existing.write_bytes(b"untouched")
            output = tmp / "new"

            def fail_after_file_created():
                (output / "manual-adalimumab-sequence-model.sdf").write_bytes(b"preserve")
                raise ValueError("simulated failure")

            with mock.patch.object(model, "build_conformer", side_effect=fail_after_file_created):
                with self.assertRaises(SystemExit):
                    model.main(["--output-dir", str(output)])
            self.assertEqual(existing.read_bytes(), b"untouched")
            self.assertEqual(
                (output / "manual-adalimumab-sequence-model.sdf").read_bytes(), b"preserve"
            )
            report = json.loads((output / "manual-adalimumab-model.json").read_text())
            self.assertEqual(report["status"], "failed")
            self.assertEqual(report["qc_status"], "failed_or_incomplete")
            self.assertTrue(report["partial_output_present"])
            self.assertEqual(report["error"], "simulated failure")

    def test_model_write_error_does_not_report_qc_success(self):
        try:
            import rdkit  # noqa: F401
        except ImportError:
            self.skipTest("RDKit not available")
        spec = importlib.util.spec_from_file_location(
            "manual_model_write_failure", ROOT / "scripts" / self.scripts[2]
        )
        model = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(model)
        original_open = Path.open

        def refuse_sdf(path, *args, **kwargs):
            if path.name == "manual-adalimumab-sequence-model.sdf" and args[0] == "xb":
                raise OSError("simulated write failure")
            return original_open(path, *args, **kwargs)

        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "model"
            with mock.patch.object(Path, "open", new=refuse_sdf):
                with self.assertRaises(SystemExit):
                    model.main(["--output-dir", str(output)])
            report = json.loads((output / "manual-adalimumab-model.json").read_text())
            self.assertEqual(report["status"], "failed")
            self.assertEqual(report["qc_status"], "failed_or_incomplete")
            self.assertFalse(report["partial_output_present"])
            self.assertIsNone(report["output_sha256"])

    def test_fresh_model_output(self):
        try:
            import rdkit  # noqa: F401
        except ImportError:
            self.skipTest("RDKit not available")
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "model"
            result = self.run_script(self.scripts[2], "--output-dir", output)
            self.assertEqual(result.returncode, 0, result.stderr)
            report = json.loads((output / "manual-adalimumab-model.json").read_text())
            sdf = (output / report["output_path"]).read_bytes()
            self.assertEqual(hashlib.sha256(sdf).hexdigest(), report["output_sha256"])
            self.assertEqual(report["status"], "requires_further_validation")
            self.assertIsNone(report["input_coordinates"])
            self.assertNotIn("retry", report["method"])


if __name__ == "__main__":
    unittest.main()
