"""Build bounded, illustrative linear L-peptide conformers from standard residues.

Fixed charge assumptions are recorded. Structures are not validated binders.
"""

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from rdkit import Chem, rdBase
from rdkit.Chem import AllChem

ALPHABET = frozenset("ACDEFGHIKLMNPQRSTVWY")


def build(sequence, seed=42):
    if not sequence or len(sequence) > 13 or set(sequence) - ALPHABET:
        raise ValueError("Use 1–13 uppercase standard amino acid codes")
    source = Chem.MolFromSequence(sequence)
    if source is None:
        raise ValueError("RDKit could not construct sequence")
    molecule = Chem.RWMol(source)
    for atom in molecule.GetAtoms():
        info = atom.GetPDBResidueInfo()
        name, residue = info.GetName().strip(), info.GetResidueName()
        if name == "N" and info.GetResidueNumber() == 1:
            atom.SetFormalCharge(1)
        elif (
            name == "OXT"
            or (residue == "ASP" and name == "OD2")
            or (residue == "GLU" and name == "OE2")
        ):
            atom.SetFormalCharge(-1)
        elif (residue == "ARG" and name == "NH1") or (residue == "LYS" and name == "NZ"):
            atom.SetFormalCharge(1)
    molecule = molecule.GetMol()
    Chem.SanitizeMol(molecule)
    charge = Chem.GetFormalCharge(molecule)
    molecule = Chem.AddHs(molecule)
    params = AllChem.ETKDGv3()
    params.randomSeed = seed
    if AllChem.EmbedMolecule(molecule, params) != 0:
        raise ValueError("Conformer generation failed")
    if not AllChem.MMFFHasAllMoleculeParams(molecule):
        raise ValueError("MMFF94 parameters unavailable")
    if AllChem.MMFFOptimizeMolecule(molecule, maxIters=10000 if len(sequence) > 12 else 1000) != 0:
        raise ValueError("MMFF94 optimization did not converge")
    return molecule, charge


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sequence", required=True, action="append")
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    if len(args.sequence) > 20 or len(set(args.sequence)) != len(args.sequence):
        parser.error("Choose up to 20 distinct sequences")
    if any(not s or len(s) > 13 or set(s) - ALPHABET for s in args.sequence):
        parser.error("Use 1–13 uppercase standard amino acid codes")
    args.output_dir.mkdir(parents=True, exist_ok=False)
    report = {
        "status": "running",
        "started_at_utc": datetime.now(UTC).isoformat(),
        "rdkit": rdBase.rdkitVersion,
        "seed": 42,
        "chemistry": "linear L residues; free N+ and C-; Asp/Glu -, Lys/Arg +; "
        "neutral histidine; reduced cysteine; no caps or disulfides",
        "method": "one ETKDGv3 conformer, MMFF94 optimization; "
        "maximum 10000 iterations for length 13, otherwise 1000",
        "limitations": "fixed protonation and one conformer are not docking validation",
        "candidates": [],
    }
    path = args.output_dir / "manifest.json"
    try:
        for seq in args.sequence:
            row = {"sequence": seq}
            report["candidates"].append(row)
            try:
                molecule, charge = build(seq)
                target = args.output_dir / f"{seq}.sdf"
                writer = Chem.SDWriter(str(target))
                writer.write(molecule)
                writer.close()
                row.update(
                    status="requires_further_validation",
                    formal_charge=charge,
                    sdf_sha256=hashlib.sha256(target.read_bytes()).hexdigest(),
                )
            except Exception as exc:
                row.update(status="failed", error=str(exc))
        report["status"] = (
            "failed"
            if any(r["status"] == "failed" for r in report["candidates"])
            else "requires_further_validation"
        )
    finally:
        report["finished_at_utc"] = datetime.now(UTC).isoformat()
        path.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"status": report["status"], "count": len(report["candidates"])}))
    if report["status"] == "failed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
