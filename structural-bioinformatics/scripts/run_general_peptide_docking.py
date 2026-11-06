"""Experimental linear-peptide docking to one user-selected PDB protein chain.

This is a limited, fixed-protonation exploratory workflow, not validated drug design.
"""

import argparse
import hashlib
import importlib.util
import json
import math
import re
import subprocess
import sys
from datetime import UTC, datetime
from importlib.metadata import version as package_version
from pathlib import Path

import numpy as np
from Bio import SeqIO
from Bio.PDB import PDBIO, PDBParser, Select
from meeko import MoleculePreparation, PDBQTWriterLegacy
from rdkit import Chem, rdBase

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT / "src"))
from peptide_lab.pdbqt_torsions import inspect_torsions  # noqa: E402
from peptide_lab.receptor_input import inspect_pdb  # noqa: E402

spec = importlib.util.spec_from_file_location(
    "build_peptide_models", PROJECT / "scripts/build_peptide_models.py"
)
models = importlib.util.module_from_spec(spec)
spec.loader.exec_module(models)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def xyz(text):
    points = [
        [float(line[i : i + 8]) for i in (30, 38, 46)]
        for line in text.splitlines()
        if line.startswith(("ATOM  ", "HETATM")) and line.split()[-1] not in ("H", "HD")
    ]
    array = np.asarray(points, dtype=float)
    if not len(array) or not np.isfinite(array).all():
        raise ValueError("PDBQT has missing or invalid heavy-atom coordinates")
    return array


def inspect_poses(text, receptor_xyz, center=None, size=None):
    """Measure every saved pose, including those that fail the clash screen."""
    blocks = re.findall(r"^MODEL\s+\d+\s*$(.*?)^ENDMDL\s*$", text, re.M | re.S)
    if not blocks:
        raise ValueError("No complete poses")
    results = []
    for block in blocks:
        score = re.search(r"^REMARK VINA RESULT:\s*([-+\d.]+)", block, re.M)
        if not score or not math.isfinite(float(score.group(1))):
            raise ValueError("Invalid pose score")
        ligand_xyz = xyz(block)
        distances = np.linalg.norm(ligand_xyz[:, None, :] - receptor_xyz[None, :, :], axis=2)
        minimum = float(distances.min())
        results.append(
            {
                "vina_score_kcal_mol": float(score.group(1)),
                "minimum_heavy_atom_distance_angstrom": minimum,
                "heavy_atom_pairs_below_2_angstrom": int(np.count_nonzero(distances < 2)),
                "severe_clash_screen": "pass" if minimum >= 2 else "fail",
            }
        )
        if center is not None and size is not None:
            outside = np.any(np.abs(ligand_xyz - np.asarray(center)) > np.asarray(size) / 2, axis=1)
            results[-1]["heavy_atoms_outside_box"] = int(np.count_nonzero(outside))
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdb", type=Path, required=True)
    parser.add_argument("--chain", required=True)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--sequence", action="append")
    source.add_argument("--fasta", type=Path)
    parser.add_argument("--center", type=float, nargs=3, required=True, metavar=("X", "Y", "Z"))
    parser.add_argument("--size", type=float, nargs=3, required=True, metavar=("X", "Y", "Z"))
    parser.add_argument("--receptor-preparer", required=True)
    parser.add_argument("--vina", required=True)
    parser.add_argument(
        "--max-evals", type=int, default=0, help="Vina evaluations per search; 0 uses its heuristic"
    )
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    if args.max_evals < 0:
        parser.error("--max-evals must be nonnegative")
    fasta_hash = None
    sequence_ids = {}
    if args.fasta:
        try:
            fasta_hash = sha(args.fasta)
            records = list(SeqIO.parse(str(args.fasta), "fasta"))
        except (OSError, ValueError) as exc:
            parser.exit(1, f"FASTA rejected: {exc}\n")
        if len(records) > 20 or len({r.id for r in records}) != len(records):
            parser.error("FASTA must contain at most 20 uniquely identified records")
        args.sequence = [str(record.seq) for record in records]
        sequence_ids = {str(record.seq): record.id for record in records}
    if (
        not args.sequence
        or len(args.sequence) > 20
        or len(set(args.sequence)) != len(args.sequence)
    ):
        parser.error("Choose up to 20 distinct explicit peptide sequences")
    if any(not s or len(s) > 13 or set(s) - models.ALPHABET for s in args.sequence):
        parser.error("Use 1–13 uppercase standard amino acid codes")
    if not all(math.isfinite(v) for v in args.center + args.size) or not all(
        0 < v <= 30 for v in args.size
    ):
        parser.error("Box values must be finite; each side must be >0 and <=30 Å")
    try:
        inspection = inspect_pdb(args.pdb, args.chain)
    except (OSError, ValueError) as exc:
        parser.exit(1, f"PDB rejected: {exc}\n")
    args.output_dir.mkdir(parents=True, exist_ok=False)
    out = args.output_dir.resolve()
    report = {
        "status": "running",
        "started_at_utc": datetime.now(UTC).isoformat(),
        "input": inspection,
        "center_angstrom": args.center,
        "size_angstrom": args.size,
        "sequences": args.sequence,
        "fasta_sha256": fasta_hash,
        "rdkit_version": rdBase.rdkitVersion,
        "meeko_version": package_version("meeko"),
        "biopython_version": package_version("biopython"),
        "workflow_sha256": sha(Path(__file__)),
        "model_builder_sha256": sha(PROJECT / "scripts/build_peptide_models.py"),
        "inspector_sha256": sha(PROJECT / "src/peptide_lab/receptor_input.py"),
        "torsion_inspector_sha256": sha(PROJECT / "src/peptide_lab/pdbqt_torsions.py"),
        "model_chemistry": "linear L, N+/C-, Asp/Glu -, Lys/Arg +, neutral His, reduced Cys",
        "sampling": "one ETKDGv3 conformer; Vina seed 42, CPU 1, exhaustiveness 2",
        "vina_max_evals_per_run": args.max_evals,
        "limitations": [
            "Only one selected chain; no cofactors, waters, ligands or alternate conformations",
            "Receptor protonation, side chains, loops, assembly "
            "and binding site require independent review",
            "One peptide conformer and charge state; no flexible-peptide "
            "benchmark or negative control",
            "Docking scores are not binding affinities, inhibition, safety or cost",
        ],
        "candidates": [],
    }
    path = out / "report.json"

    def save():
        tmp = out / "report.json.tmp"
        tmp.write_text(json.dumps(report, indent=2) + "\n")
        tmp.replace(path)

    save()
    try:
        version = subprocess.run(
            [args.vina, "--version"], capture_output=True, text=True, check=True
        )
        report["vina_version"] = version.stdout.strip()
        if report["vina_version"] != "AutoDock Vina v1.2.7":
            raise ValueError("Only Vina 1.2.7 is tested")
        structure = PDBParser(QUIET=True, PERMISSIVE=False).get_structure("input", str(args.pdb))

        class Chain(Select):
            def accept_chain(self, chain):
                return chain.id == args.chain

        writer = PDBIO()
        writer.set_structure(structure)
        selected = out / "selected-chain.pdb"
        writer.save(str(selected), Chain())
        report["selected_pdb_sha256"] = sha(selected)
        prefix = out / "receptor"
        prep = subprocess.run(
            [args.receptor_preparer, "--read_pdb", str(selected), "-o", str(prefix), "-p"],
            capture_output=True,
            text=True,
            check=False,
        )
        (out / "receptor.stdout.txt").write_text(prep.stdout)
        (out / "receptor.stderr.txt").write_text(prep.stderr)
        receptor = out / "receptor.pdbqt"
        if prep.returncode or not receptor.is_file():
            raise ValueError("Receptor preparation failed; inspect receptor logs")
        report["receptor_pdbqt_sha256"] = sha(receptor)
        receptor_xyz = xyz(receptor.read_text())
        for sequence in args.sequence:
            row = {
                "sequence": sequence,
                "input_id": sequence_ids.get(sequence),
                "status": "running",
            }
            report["candidates"].append(row)
            save()
            directory = out / sequence
            directory.mkdir()
            molecule, charge = models.build(sequence)
            sdf = directory / "conformer.sdf"
            sw = Chem.SDWriter(str(sdf))
            sw.write(molecule)
            sw.close()
            setups = MoleculePreparation().prepare(molecule)
            if len(setups) != 1:
                raise ValueError(f"Unexpected Meeko model count for {sequence}")
            pdbqt, ok, error = PDBQTWriterLegacy.write_string(setups[0])
            if not ok:
                raise ValueError(f"Ligand preparation failed: {error}")
            ligand = directory / "ligand.pdbqt"
            ligand.write_text(pdbqt)
            row["ligand_sha256"] = sha(ligand)
            row["torsion_diagnostic"] = inspect_torsions(pdbqt)
            save()
            pose = directory / "poses.pdbqt"
            command = [
                args.vina,
                "--receptor",
                str(receptor),
                "--ligand",
                str(ligand),
                "--out",
                str(pose),
                "--seed",
                "42",
                "--cpu",
                "1",
                "--exhaustiveness",
                "2",
                "--num_modes",
                "3",
                "--max_evals",
                str(args.max_evals),
            ]
            for axis, center, size in zip("xyz", args.center, args.size, strict=True):
                command += ["--center_" + axis, str(center), "--size_" + axis, str(size)]
            process = subprocess.run(command, capture_output=True, text=True, check=False)
            (directory / "vina.stdout.txt").write_text(process.stdout)
            (directory / "vina.stderr.txt").write_text(process.stderr)
            if process.returncode or not pose.is_file():
                raise ValueError(f"Vina failed for {sequence}; inspect logs")
            results = inspect_poses(pose.read_text(), receptor_xyz, args.center, args.size)
            row.update(
                formal_charge=charge,
                poses=results,
                conformer_sha256=sha(sdf),
                ligand_sha256=sha(ligand),
                poses_sha256=sha(pose),
            )
            if any(result["severe_clash_screen"] == "fail" for result in results):
                raise ValueError(f"Severe interchain clash for {sequence}")
            row["status"] = "requires_further_validation"
            save()
        report["status"] = "requires_further_validation"
    except Exception as exc:
        report["status"] = "failed"
        report["error"] = str(exc)
        if report["candidates"] and report["candidates"][-1]["status"] == "running":
            report["candidates"][-1]["status"] = "failed"
        print(f"Error: {exc}", file=sys.stderr)
    finally:
        report["finished_at_utc"] = datetime.now(UTC).isoformat()
        save()
    print(json.dumps({"status": report["status"], "report": str(path)}))
    if report["status"] == "failed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
