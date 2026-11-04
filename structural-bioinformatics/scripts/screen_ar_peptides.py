"""Run a bounded illustrative A/R dipeptide screen, not a drug-efficacy test.

The sole tested receptor and box are derived from 7TA3. One conformer per
sequence, one approximate protonation state and a low search budget are used.
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import time
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
from meeko import MoleculePreparation, PDBQTWriterLegacy
from rdkit import Chem, rdBase
from rdkit.Chem import AllChem

PROJECT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build(sequence, seed):
    if not 2 <= len(sequence) <= 3 or set(sequence) - set("AR"):
        raise ValueError("Only A/R sequences of length 2 or 3 are supported")
    molecule = Chem.RWMol(Chem.MolFromSequence(sequence))
    for atom in molecule.GetAtoms():
        info = atom.GetPDBResidueInfo()
        name = info.GetName().strip()
        if (name == "N" and info.GetResidueNumber() == 1) or (
            info.GetResidueName() == "ARG" and name == "NH1"
        ):
            atom.SetFormalCharge(1)
        if name == "OXT":
            atom.SetFormalCharge(-1)
    molecule = molecule.GetMol()
    Chem.SanitizeMol(molecule)
    charge = Chem.GetFormalCharge(molecule)
    molecule = Chem.AddHs(molecule)
    settings = AllChem.ETKDGv3()
    settings.randomSeed = seed
    if AllChem.EmbedMolecule(molecule, settings) != 0:
        raise ValueError("ETKDG did not generate a conformer")
    if not AllChem.MMFFHasAllMoleculeParams(molecule):
        raise ValueError("MMFF parameters unavailable")
    status = AllChem.MMFFOptimizeMolecule(molecule, maxIters=1000)
    if status != 0:
        raise ValueError("MMFF optimization did not converge")
    setups = MoleculePreparation().prepare(molecule)
    if len(setups) != 1:
        raise ValueError("Unexpected number of prepared ligand models")
    pdbqt, ok, error = PDBQTWriterLegacy.write_string(setups[0])
    if not ok:
        raise ValueError(error)
    return molecule, pdbqt, charge


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sequence", action="append", required=True)
    parser.add_argument("--receptor", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--vina", default="vina")
    args = parser.parse_args()
    if len(args.sequence) > 4 or len(set(args.sequence)) != len(args.sequence):
        parser.error("Choose at most four distinct explicit sequences")
    if not args.receptor.is_file():
        parser.error("Prepared receptor is missing")
    for seq in args.sequence:
        if not 2 <= len(seq) <= 3 or set(seq) - set("AR"):
            parser.error("Only A/R sequences of length 2 or 3 are supported")
    baseline = json.loads((PROJECT / "data/processed/tnf-peptide-redock.json").read_text())
    if sha(args.receptor) != baseline["files_sha256"]["receptor.pdbqt"]:
        parser.error("Receptor differs from the 7TA3 redocking reference")
    settings = baseline["settings"]
    box = {key: settings[key] for key in settings if key.startswith(("center_", "size_"))}
    if len(box) != 6:
        parser.error("7TA3 reference box is incomplete")
    args.output_dir.mkdir(parents=True, exist_ok=False)
    out = args.output_dir.resolve()
    report = {
        "status": "running",
        "started_at_utc": datetime.now(UTC).isoformat(),
        "purpose": "technical A/R short-peptide pilot; not validated discovery",
        "rdkit_version": rdBase.rdkitVersion,
        "conformer_method": "ETKDGv3 + MMFF94; one conformer",
        "protonation": (
            "N-terminus +1, C-terminus -1, Arg side chain +1; fixed assumptions, not pH prediction"
        ),
        "receptor_sha256": sha(args.receptor),
        "box": box,
        "docking": {
            "engine": "AutoDock Vina 1.2.7",
            "cpu": 1,
            "exhaustiveness": 2,
            "num_modes": 3,
            "seed": 42,
        },
        "limitations": [
            "One conformer and one protonation state per peptide",
            "Low search budget; no flexible-peptide benchmark or negative-site control",
            "Monomeric TNF receptor from a peptide-bound structure with modeled side chains",
            "Known binding box is derived from a different 31-residue peptide",
            "Scores do not measure binding affinity, inhibition, safety, or manufacturing cost",
        ],
        "candidates": [],
    }
    manifest = out / "run.json"

    def save():
        temp = out / "run.json.tmp"
        temp.write_text(json.dumps(report, indent=2) + "\n")
        os.replace(temp, manifest)

    save()
    try:
        version = subprocess.run(
            [args.vina, "--version"], capture_output=True, text=True, check=True
        )
        report["engine_version"] = version.stdout.strip()
        for sequence in args.sequence:
            row = {"sequence": sequence, "status": "preparing", "seed": 42}
            report["candidates"].append(row)
            save()
            folder = out / sequence
            folder.mkdir()
            mol, pdbqt, charge = build(sequence, 42)
            ligand = folder / "ligand.pdbqt"
            ligand.write_text(pdbqt)
            writer = Chem.SDWriter(str(folder / "conformer.sdf"))
            writer.write(mol)
            writer.close()
            row.update(
                {
                    "formal_charge": charge,
                    "pdbqt_sha256": sha(ligand),
                    "sdf_sha256": sha(folder / "conformer.sdf"),
                    "status": "docking",
                }
            )
            save()
            command = [
                args.vina,
                "--receptor",
                str(args.receptor.resolve()),
                "--ligand",
                str(ligand),
                "--out",
                str(folder / "poses.pdbqt"),
                "--seed",
                "42",
                "--cpu",
                "1",
                "--exhaustiveness",
                "2",
                "--num_modes",
                "3",
            ]
            for key, value in box.items():
                command.extend([f"--{key}", str(value)])
            start = time.monotonic()
            proc = subprocess.run(command, capture_output=True, text=True, check=False)
            (folder / "vina.stdout.txt").write_text(proc.stdout)
            (folder / "vina.stderr.txt").write_text(proc.stderr)
            row["elapsed_seconds"] = round(time.monotonic() - start, 2)
            row["exit_code"] = proc.returncode
            if proc.returncode != 0 or not (folder / "poses.pdbqt").is_file():
                raise RuntimeError(f"Vina failed for {sequence}: {proc.returncode}")
            contents = (folder / "poses.pdbqt").read_text()
            models = re.findall(r"^MODEL\s+\d+\s*$(.*?)^ENDMDL\s*$", contents, re.M | re.S)
            if not models:
                raise ValueError("No complete scored poses")
            receptor_atoms = np.array(
                [
                    [float(line[j : j + 8]) for j in (30, 38, 46)]
                    for line in args.receptor.read_text().splitlines()
                    if line.startswith(("ATOM  ", "HETATM")) and line.split()[-1] not in ("H", "HD")
                ]
            )
            poses = []
            for model in models:
                score = re.search(r"^REMARK VINA RESULT:\s*([-+\d.]+)", model, re.M)
                if not score:
                    raise ValueError("Pose score missing")
                ligand_atoms = np.array(
                    [
                        [float(line[j : j + 8]) for j in (30, 38, 46)]
                        for line in model.splitlines()
                        if line.startswith(("ATOM  ", "HETATM"))
                        and line.split()[-1] not in ("H", "HD")
                    ]
                )
                if not len(ligand_atoms):
                    raise ValueError("Pose contains no heavy atoms")
                distance = float(
                    np.linalg.norm(
                        ligand_atoms[:, None, :] - receptor_atoms[None, :, :], axis=2
                    ).min()
                )
                poses.append(
                    {
                        "vina_score_kcal_mol": float(score.group(1)),
                        "minimum_interchain_heavy_distance_angstrom": distance,
                        "severe_clash_screen": "pass" if distance >= 2 else "fail",
                    }
                )
            row.update(
                {
                    "poses": poses,
                    "poses_sha256": sha(folder / "poses.pdbqt"),
                    "status": "completed",
                }
            )
            save()
            print(json.dumps(row), flush=True)
        report["status"] = "completed"
    except Exception as exc:
        report["status"] = "failed"
        report["error"] = str(exc)
        raise
    finally:
        report["finished_at_utc"] = datetime.now(UTC).isoformat()
        save()


if __name__ == "__main__":
    main()
