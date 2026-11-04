"""Export recorded docking poses to SDF and PyMOL scripts for visual inspection."""

import argparse
import hashlib
import json
import re
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
from meeko import PDBQTMolecule, RDKitMolCreate
from rdkit import Chem


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def export(run_dir, sequence, output):
    if not sequence or set(sequence) - set("ACDEFGHIKLMNPQRSTVWY"):
        raise ValueError("Sequence must contain standard uppercase amino acids")
    run_dir = Path(run_dir)
    report = json.loads((run_dir / "report.json").read_text())
    if report.get("status") != "requires_further_validation":
        raise ValueError("The docking run has not completed computationally")
    found = [row for row in report["candidates"] if row["sequence"] == sequence]
    if len(found) != 1 or found[0].get("status") != "requires_further_validation":
        raise ValueError("Sequence is absent or did not complete")
    row = found[0]
    receptor = run_dir / "selected-chain.pdb"
    poses = run_dir / sequence / "poses.pdbqt"
    if digest(receptor) != report["selected_pdb_sha256"] or digest(poses) != row["poses_sha256"]:
        raise ValueError("Receptor or pose file does not match the recorded hash")
    pdbqt = PDBQTMolecule.from_file(str(poses), skip_typing=True)
    mols = RDKitMolCreate.from_pdbqt_mol(pdbqt)
    if len(mols) != 1 or mols[0] is None:
        raise ValueError("Meeko could not reconstruct one ligand")
    molecule = mols[0]
    count = molecule.GetNumConformers()
    if count != len(row["poses"]) or count == 0:
        raise ValueError("Reconstructed pose count differs from recorded output")
    blocks = re.findall(r"^MODEL\s+\d+\s*$(.*?)^ENDMDL\s*$", poses.read_text(), re.M | re.S)
    if len(blocks) != count:
        raise ValueError("Pose blocks differ from reconstructed conformers")
    for index, block in enumerate(blocks):
        source = np.array(
            [
                [float(line[j : j + 8]) for j in (30, 38, 46)]
                for line in block.splitlines()
                if line.startswith(("ATOM  ", "HETATM")) and line.split()[-1] not in ("H", "HD")
            ]
        )
        conformer = molecule.GetConformer(index)
        restored = np.array(
            [
                list(conformer.GetAtomPosition(atom.GetIdx()))
                for atom in molecule.GetAtoms()
                if atom.GetAtomicNum() > 1
            ]
        )
        if not len(source) or len(source) != len(restored):
            raise ValueError("Reconstructed heavy-atom counts differ")
        distances = np.linalg.norm(source[:, None, :] - restored[None, :, :], axis=2)
        if distances.min(axis=0).max() > 0.002 or distances.min(axis=1).max() > 0.002:
            raise ValueError("Reconstructed heavy-atom coordinates differ")
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    (output / "receptor.pdb").write_bytes(receptor.read_bytes())
    files = []
    for index in range(count):
        sdf = output / f"pose-{index + 1}.sdf"
        writer = Chem.SDWriter(str(sdf))
        writer.write(molecule, confId=index)
        writer.close()
        script = output / f"pose-{index + 1}.pml"
        script.write_text(
            "reinitialize\nload receptor.pdb, target\n"
            f"load pose-{index + 1}.sdf, peptide\n"
            "hide everything\nshow cartoon, target\ncolor marine, target\n"
            "show sticks, peptide\ncolor orange, peptide\nzoom peptide, 12\n"
        )
        files.append(
            {
                "pose": index + 1,
                "sdf": sdf.name,
                "sdf_sha256": digest(sdf),
                "pymol_script": script.name,
                "pymol_sha256": digest(script),
                "vina_score_kcal_mol": row["poses"][index]["vina_score_kcal_mol"],
            }
        )
    result = {
        "status": "visualization_exported",
        "created_at_utc": datetime.now(UTC).isoformat(),
        "sequence": sequence,
        "source_report_sha256": digest(run_dir / "report.json"),
        "source_receptor_sha256": digest(receptor),
        "source_poses_sha256": digest(poses),
        "exporter_sha256": digest(Path(__file__)),
        "files": files,
        "limitations": "Hydrogens may be reconstructed; display does not validate binding.",
    }
    (output / "manifest.json").write_text(json.dumps(result, indent=2) + "\n")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--sequence", required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    try:
        result = export(args.run_dir, args.sequence, args.output_dir)
    except (OSError, ValueError, KeyError) as exc:
        parser.exit(1, f"Export failed: {exc}\n")
    print(json.dumps({"status": result["status"], "poses": len(result["files"])}))


if __name__ == "__main__":
    main()
