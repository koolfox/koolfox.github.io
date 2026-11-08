#!/usr/bin/env python3
"""Build one illustrative sequence-only conformer using the existing RDKit builder."""

import argparse
import hashlib
import importlib.util
import json
import math
import platform
import sys
from datetime import datetime, timezone
from pathlib import Path

from rdkit import Chem, rdBase
from rdkit.Chem import AllChem

ROOT = Path(__file__).resolve().parents[1]
BUILDER = ROOT / "scripts/build_peptide_models.py"
SEQ = "TWNSGHID"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def build_conformer():
    spec = importlib.util.spec_from_file_location("peptide_builder", BUILDER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    original_optimize = module.AllChem.MMFFOptimizeMolecule

    def extended_optimize(molecule, maxIters):
        return original_optimize(molecule, maxIters=5000)

    module.AllChem.MMFFOptimizeMolecule = extended_optimize
    try:
        return module.build(SEQ, seed=42)
    finally:
        module.AllChem.MMFFOptimizeMolecule = original_optimize


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        type=Path,
        required=True,
        help="New directory to create; existing paths are never overwritten",
    )
    output_dir = parser.parse_args(argv).output_dir
    output_dir.mkdir()
    report = {
        "status": "failed",
        "sequence": SEQ,
        "seed": 42,
        "started_at_utc": datetime.now(timezone.utc).isoformat(),
        "rdkit_version": rdBase.rdkitVersion,
        "python_version": sys.version,
        "platform": platform.platform(),
        "builder": "scripts/build_peptide_models.py",
        "builder_sha256": digest(BUILDER.read_bytes()),
        "method": (
            "RDKit MolFromSequence, explicit H, ETKDGv3 "
            "seed 42, one conformer, MMFF94 max 5000 iterations"
        ),
        "chemistry": (
            "linear L sequence, uncapped N+ and C-, Asp-, neutral histidine; no solvent or receptor"
        ),
        "input_coordinates": None,
        "input_sequence_sha256": digest(SEQ.encode("ascii")),
        "output_path": None,
        "output_sha256": None,
        "qc_status": "not_run",
        "limitations": [
            "One stochastic conformer, not a validated prediction of the free peptide ensemble.",
            "No receptor, docking, binding, affinity, or experimental validation.",
            "Fixed protonation and vacuum force field; no solvent or sampling of alternatives.",
        ],
    }
    try:
        mol, charge = build_conformer()
        block = Chem.MolToMolBlock(mol)
        sdf = (block + "\n$$$$\n").encode("ascii")
        parsed = Chem.MolFromMolBlock(block, removeHs=False, sanitize=True)
        if parsed is None:
            raise ValueError("SDF round-trip failed")
        expected = Chem.MolToSmiles(Chem.RemoveHs(mol), isomericSmiles=True)
        actual = Chem.MolToSmiles(Chem.RemoveHs(parsed), isomericSmiles=True)
        if expected != actual:
            raise ValueError("SDF graph or stereochemistry changed")
        conf = parsed.GetConformer()
        coords = [tuple(conf.GetAtomPosition(i)) for i in range(parsed.GetNumAtoms())]
        if not all(math.isfinite(v) for pt in coords for v in pt):
            raise ValueError("Nonfinite coordinates")
        lengths = [
            math.dist(coords[b.GetBeginAtomIdx()], coords[b.GetEndAtomIdx()])
            for b in parsed.GetBonds()
        ]
        if min(lengths) < 0.65 or max(lengths) > 2.0:
            raise ValueError("Bond length outside QC screen")
        properties = AllChem.MMFFGetMoleculeProperties(mol, mmffVariant="MMFF94")
        energy = AllChem.MMFFGetMoleculeForceField(mol, properties).CalcEnergy()
        if not math.isfinite(energy):
            raise ValueError("Nonfinite MMFF energy")
        report.update(
            status="requires_further_validation",
            qc_status="passed_basic_checks",
            output_path="manual-adalimumab-sequence-model.sdf",
            output_sha256=digest(sdf),
            formal_charge=charge,
            qc={
                "sdf_roundtrip": "passed",
                "isomeric_graph_matches_generated_input": True,
                "atom_count_with_hydrogens": parsed.GetNumAtoms(),
                "heavy_atom_count": parsed.GetNumHeavyAtoms(),
                "bond_count": parsed.GetNumBonds(),
                "finite_coordinates": True,
                "minimum_bond_angstrom": min(lengths),
                "maximum_bond_angstrom": max(lengths),
                "bond_screen_angstrom": [0.65, 2.0],
                "mmff94_energy_kcal_per_mol": energy,
                "optimization": "converged within 5000 iterations; builder fails otherwise",
            },
        )
        with (output_dir / "manual-adalimumab-sequence-model.sdf").open("xb") as stream:
            stream.write(sdf)
    except Exception as exc:
        report["status"] = "failed"
        report["qc_status"] = "failed_or_incomplete"
        report["output_path"] = None
        report["output_sha256"] = None
        report["partial_output_present"] = (
            output_dir / "manual-adalimumab-sequence-model.sdf"
        ).exists()
        report["error"] = str(exc)
    report["finished_at_utc"] = datetime.now(timezone.utc).isoformat()
    with (output_dir / "manual-adalimumab-model.json").open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(report, indent=2) + "\n")
    if report["status"] == "failed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
