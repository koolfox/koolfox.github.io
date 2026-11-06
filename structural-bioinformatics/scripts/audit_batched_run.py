"""Independently audit stored peptide batch outputs without rerunning docking."""

import argparse
import hashlib
import json
import math
import re
import sys
from pathlib import Path

import numpy as np
from Bio import SeqIO

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT / "src"))
from peptide_lab.pose_geometry import FAR, classify, minimum_distance  # noqa: E402


def digest(path):
    result = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            result.update(block)
    return result.hexdigest()


def coordinates(text):
    values = [
        [float(line[i : i + 8]) for i in (30, 38, 46)]
        for line in text.splitlines()
        if line.startswith(("ATOM  ", "HETATM")) and line.split()[-1] not in ("H", "HD")
    ]
    array = np.asarray(values, dtype=float)
    if not len(array) or not np.isfinite(array).all():
        raise ValueError("Empty or nonfinite coordinates")
    return array


def audit(root):
    root = Path(root)
    workflow = json.loads((root / "workflow.json").read_text())
    if workflow["status"] != "requires_further_validation":
        raise ValueError("Workflow did not complete computationally")
    for row in workflow["steps"]:
        if digest(root / row["artifact"]) != row["sha256"]:
            raise ValueError("Workflow step hash mismatch")
    candidates = json.loads((root / "candidates/manifest.json").read_text())
    batch = json.loads((root / "docking/batch-workflow.json").read_text())
    fasta = root / "candidates/candidates.fasta"
    if digest(fasta) != candidates["fasta_sha256"] or digest(fasta) != batch["input_fasta_sha256"]:
        raise ValueError("Candidate FASTA hash mismatch")
    expected = [(r.id, str(r.seq)) for r in SeqIO.parse(str(fasta), "fasta")]
    if len(expected) != batch["total_sequences"] or len(expected) != batch["completed_sequences"]:
        raise ValueError("Candidate counts differ")
    observed = []
    minimum = None
    pose_count = 0
    for item in batch["batches"]:
        folder = root / "docking" / f"batch-{item['batch']:06d}"
        input_file = folder / "input.fasta"
        child_file = folder / "docking/report.json"
        if (
            digest(input_file) != item["input_sha256"]
            or digest(child_file) != item["report_sha256"]
        ):
            raise ValueError("Batch hash mismatch")
        child = json.loads(child_file.read_text())
        if child.get("status") != "requires_further_validation":
            raise ValueError("Docking report is not eligible for the batch audit")
        receptor_file = folder / "docking/receptor.pdbqt"
        if digest(receptor_file) != child["receptor_pdbqt_sha256"]:
            raise ValueError("Receptor hash mismatch")
        receptor = coordinates(receptor_file.read_text())
        for row in child["candidates"]:
            observed.append((row["input_id"], row["sequence"]))
            candidate_dir = folder / "docking" / row["sequence"]
            for file, key in (
                ("conformer.sdf", "conformer_sha256"),
                ("ligand.pdbqt", "ligand_sha256"),
                ("poses.pdbqt", "poses_sha256"),
            ):
                if digest(candidate_dir / file) != row[key]:
                    raise ValueError("Candidate file hash mismatch")
            blocks = re.findall(
                r"^MODEL\s+\d+\s*$(.*?)^ENDMDL\s*$",
                (candidate_dir / "poses.pdbqt").read_text(),
                re.M | re.S,
            )
            if not blocks or len(blocks) != len(row["poses"]):
                raise ValueError("Pose count mismatch")
            for number, (block, pose) in enumerate(zip(blocks, row["poses"], strict=True), 1):
                match = re.search(r"^REMARK VINA RESULT:\s*([-+\d.]+)", block, re.M)
                if not match or not math.isclose(
                    float(match.group(1)), pose["vina_score_kcal_mol"], abs_tol=1e-9
                ):
                    raise ValueError("Pose score mismatch")
                distance = minimum_distance(coordinates(block), receptor)
                if not math.isclose(
                    distance, pose["minimum_heavy_atom_distance_angstrom"], abs_tol=1e-9
                ):
                    raise ValueError("Pose distance mismatch")
                if distance < 2:
                    raise ValueError("Pose fails 2 Å clash screen")
                if "proximity" in pose and pose["proximity"] != classify(distance):
                    raise ValueError("Recorded proximity differs from geometry")
                if classify(distance) == FAR:
                    raise ValueError("Pose has no heavy atoms within 4.5 Å; review required")
                pose_count += 1
                if minimum is None or distance < minimum["distance_angstrom"]:
                    minimum = {
                        "sequence": row["sequence"],
                        "pose": number,
                        "distance_angstrom": distance,
                    }
    if observed != expected:
        raise ValueError("Candidate identifiers or order differ")
    return {
        "status": "file_and_geometry_audit_passed",
        "candidates": len(observed),
        "poses": pose_count,
        "minimum": minimum,
        "scope": (
            "hashes, identifiers, recorded Vina scores and simple heavy-atom "
            "distances; not binding validation"
        ),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    try:
        result = audit(args.root)
    except (OSError, ValueError, KeyError) as exc:
        parser.exit(1, f"Audit failed: {exc}\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
