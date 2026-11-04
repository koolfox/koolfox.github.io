"""Inspect fixed-receptor PDBQT redocking poses without aligning away the error."""

import math
import re
from pathlib import Path


def atoms(text):
    """Return heavy atoms keyed by PDBQT serial; reject duplicates or invalid coordinates."""
    result = {}
    for line in text.splitlines():
        if not line.startswith(("ATOM  ", "HETATM")):
            continue
        if line.split()[-1] in ("H", "HD"):
            continue
        serial = int(line[6:11])
        if serial in result:
            raise ValueError(f"Duplicate PDBQT atom serial: {serial}")
        xyz = tuple(float(line[i : i + 8]) for i in (30, 38, 46))
        if not all(math.isfinite(n) for n in xyz):
            raise ValueError("Non-finite coordinate")
        result[serial] = xyz
    if not result:
        raise ValueError("No heavy atoms")
    return result


def compare(reference, pose):
    """RMSD of identical atom IDs in the fixed receptor frame; no superposition."""
    if reference.keys() != pose.keys():
        raise ValueError("Atom serials differ between reference and pose")
    return math.sqrt(
        sum(
            sum((a - b) ** 2 for a, b in zip(reference[k], pose[k], strict=True)) for k in reference
        )
        / len(reference)
    )


def score_files(reference_path, poses_path):
    reference = atoms(Path(reference_path).read_text())
    text = Path(poses_path).read_text()
    models = re.findall(r"^MODEL\s+\d+\s*$(.*?)^ENDMDL\s*$", text, re.M | re.S)
    if not models:
        raise ValueError("No complete docking models")
    rows = []
    for i, model in enumerate(models, 1):
        score = re.search(r"^REMARK VINA RESULT:\s*([-+\d.]+)", model, re.M)
        if not score:
            raise ValueError("Docking score missing")
        rows.append(
            {
                "rank": i,
                "vina_score_kcal_mol": float(score.group(1)),
                "heavy_atom_rmsd_angstrom": round(compare(reference, atoms(model)), 4),
            }
        )
    return {
        "heavy_atoms": len(reference),
        "poses": rows,
        "rmsd_method": "same atom serials in the fixed receptor frame; no superposition",
        "limitations": [
            "atom symmetry is not accounted for",
            "Vina score is not a measured affinity",
            "bound conformation and known site make this an easy control",
        ],
    }
