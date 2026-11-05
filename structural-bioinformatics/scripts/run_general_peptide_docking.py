"""Experimental linear-peptide docking to selected PDB protein chains.

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
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
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
    if any(not s or len(s) > 12 or set(s) - models.ALPHABET for s in args.sequence):
        parser.error("Use 1–12 uppercase standard amino acid codes")
    if not all(math.isfinite(v) for v in args.center + args.size) or not all(
        0 < v <= 30 for v in args.size
    ):
        parser.error("Box values must be finite; each side must be >0 and <=30 Å")
    chains = args.chain.split(",")
    if any(len(chain) != 1 for chain in chains) or len(set(chains)) != len(chains):
        parser.error("Use unique, comma-separated single-character author chain IDs")
    try:
        inspected = [inspect_pdb(args.pdb, chain) for chain in chains]
        inspection = inspected[0] if len(inspected) == 1 else {
            "status": "requires_further_validation",
            "source_sha256": inspected[0]["source_sha256"],
            "author_chains": chains,
            "chains": inspected,
        }
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
        "model_chemistry": "linear L, N+/C-, Asp/Glu -, Lys/Arg +, neutral His, reduced Cys",
        "sampling": "one ETKDGv3 conformer; Vina seed 42, CPU 1, exhaustiveness 2",
        "limitations": [
            "Only explicitly selected chains; no cofactors, waters, ligands or alternate conformations",
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
                return chain.id in chains

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
            ]
            for axis, center, size in zip("xyz", args.center, args.size, strict=True):
                command += ["--center_" + axis, str(center), "--size_" + axis, str(size)]
            process = subprocess.run(command, capture_output=True, text=True, check=False)
            (directory / "vina.stdout.txt").write_text(process.stdout)
            (directory / "vina.stderr.txt").write_text(process.stderr)
            if process.returncode or not pose.is_file():
                raise ValueError(f"Vina failed for {sequence}; inspect logs")
            blocks = re.findall(r"^MODEL\s+\d+\s*$(.*?)^ENDMDL\s*$", pose.read_text(), re.M | re.S)
            if not blocks:
                raise ValueError(f"No complete poses for {sequence}")
            results = []
            for block in blocks:
                score = re.search(r"^REMARK VINA RESULT:\s*([-+\d.]+)", block, re.M)
                if not score or not math.isfinite(float(score.group(1))):
                    raise ValueError("Invalid pose score")
                minimum = float(
                    np.linalg.norm(xyz(block)[:, None, :] - receptor_xyz[None, :, :], axis=2).min()
                )
                if minimum < 2:
                    raise ValueError(f"Severe interchain clash for {sequence}")
                results.append(
                    {
                        "vina_score_kcal_mol": float(score.group(1)),
                        "minimum_heavy_atom_distance_angstrom": minimum,
                    }
                )
            row.update(
                status="requires_further_validation",
                formal_charge=charge,
                poses=results,
                conformer_sha256=sha(sdf),
                ligand_sha256=sha(ligand),
                poses_sha256=sha(pose),
            )
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
