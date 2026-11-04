"""Curate the actual 7TA3 native-site Vina run for offline inspection."""

import hashlib
import json
import shutil
from datetime import UTC, datetime
from pathlib import Path

from peptide_lab.redock import atoms, compare, score_files

PROJECT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    work = PROJECT / "results/tnf-peptide/prepared"
    assets = PROJECT / "assets/tnf-peptide"
    source = work / "peptide.pdb"
    native = work / "native.pdbqt"
    reference = work / "peptide.pdbqt"
    receptor = work / "receptor.pdbqt"
    scores = score_files(reference, native)
    quality = json.loads((PROJECT / "data/processed/tnf-peptide-quality.json").read_text())
    if sha(reference) != quality["pdbqt_sha256"]:
        raise ValueError("Peptide input digest differs from its quality record")
    for original, name in [
        (reference, "reference.pdbqt"),
        (receptor, "receptor.pdbqt"),
        (native, "native-pose.pdbqt"),
        (work / "peptide-rotated.pdbqt", "rotated-start.pdbqt"),
        (work / "rotated.pdbqt", "rotated-pose.pdbqt"),
    ]:
        shutil.copyfile(original, assets / name)
    poses = {}
    for line in native.read_text().splitlines():
        if line.startswith("ENDMDL"):
            break
        if line.startswith(("ATOM  ", "HETATM")) and line.split()[-1] not in ("H", "HD"):
            key = (line[21], line[22:27], line[12:16].strip())
            if key in poses:
                raise ValueError(f"Duplicate atom {key}")
            poses[key] = line[30:54]
    pdb = []
    for line in source.read_text().splitlines():
        if line.startswith(("ATOM  ", "HETATM")):
            key = (line[21], line[22:27], line[12:16].strip())
            if key not in poses:
                raise ValueError(f"Missing docked atom {key}")
            pdb.append(line[:30] + poses.pop(key) + line[54:])
        elif line.startswith(("TER", "END")):
            pdb.append(line)
    if poses:
        raise ValueError("Docked pose has unexpected heavy atoms")
    ssbond = next(
        line
        for line in (assets / "7ta3.pdb").read_text().splitlines()
        if line.startswith("SSBOND") and line[15] == "A"
    )
    (assets / "native-pose.pdb").write_text(
        "REMARK VINA RIGID POSE; NOT EXPERIMENTAL\n" + ssbond + "\n" + "\n".join(pdb) + "\n"
    )
    params = {}
    for line in (work / "native.conf").read_text().splitlines():
        key, value = (v.strip() for v in line.split("=", 1))
        if key not in ("receptor", "ligand"):
            params[key] = float(value) if "." in value else int(value)
    files = [
        "reference.pdbqt",
        "receptor.pdbqt",
        "native-pose.pdbqt",
        "native-pose.pdb",
        "rotated-start.pdbqt",
        "rotated-pose.pdbqt",
    ]
    report = {
        "source": "https://www.rcsb.org/structure/7TA3",
        "scope": "known-site rigid redocking of the experimentally bound peptide conformation",
        "method": "AutoDock Vina 1.2.7 CLI",
        "recorded_output_utc": datetime.fromtimestamp(native.stat().st_mtime, UTC).isoformat(),
        "settings": params,
        "scores": scores,
        "submitted_poses": 5,
        "saved_poses": len(scores["poses"]),
        "files_sha256": {n: sha(assets / n) for n in files},
        "limitations": [
            "The receptor and peptide start from the experimentally bound complex",
            "Peptide internal torsions are frozen and the binding site is known",
            "Protonation states have not been independently validated",
            "Five receptor side chains were modeled; receptor loops remain incomplete",
            "A docking score is not experimental affinity or evidence of treatment effect",
        ],
        "repeat": {
            "seed": 43,
            "input_transform": "rigid rotation and translation of the same bound conformation",
            "initial_heavy_atom_rmsd_angstrom": compare(
                atoms(reference.read_text()), atoms((work / "peptide-rotated.pdbqt").read_text())
            ),
            "scores_vs_experimental": score_files(reference, work / "rotated.pdbqt"),
            "qualification": "One repeat, not an independent benchmark or a new peptide",
        },
    }
    out = PROJECT / "data/processed/tnf-peptide-redock.json"
    out.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
