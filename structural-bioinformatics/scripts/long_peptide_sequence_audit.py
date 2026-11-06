"""Independently audit sequence-generated 7TA3 fragment poses against deposited atoms."""

import argparse
import hashlib
import json
import math
import re
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT / "assets/tnf-peptide/7ta3.pdb"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def atom_map(text, native=False):
    result = {}
    for line in text.splitlines():
        if not line.startswith(("ATOM  ", "HETATM")):
            continue
        if native:
            if line[21] != "A" or line[16] not in " A" or line[26] != " ":
                continue
            number = int(line[22:26]) - 2
            if not 1 <= number <= 13 or float(line[54:60]) <= 0:
                continue
            if line[76:78].strip().upper() in ("H", "D"):
                continue
        else:
            if line.split()[-1] in ("H", "HD"):
                continue
            number = int(line[22:26])
        key = (number, line[17:20].strip(), line[12:16].strip())
        if key in result:
            raise ValueError(f"Duplicate atom: {key}")
        result[key] = tuple(float(line[i : i + 8]) for i in (30, 38, 46))
    if not result:
        raise ValueError("No atoms")
    return result


def geometry(ligand, receptor):
    distances = [math.dist(a, b) for a in ligand.values() for b in receptor.values()]
    return {
        "minimum_angstrom": min(distances),
        "pairs_below_2_angstrom": sum(d < 2 for d in distances),
        "pairs_below_4_angstrom": sum(d < 4 for d in distances),
    }


def audit(source, receptor, poses):
    native = atom_map(source, native=True)
    rec = atom_map(receptor)
    blocks = re.findall(r"^MODEL\s+\d+\s*$(.*?)^ENDMDL\s*$", poses, re.M | re.S)
    if not blocks:
        raise ValueError("No complete poses")
    rows = []
    for block in blocks:
        pose = atom_map(block)
        # The sequence-generated free C terminus has an extra OXT absent in the internal fragment.
        if set(native) - set(pose) or set(pose) - set(native) != {(13, "LEU", "OXT")}:
            raise ValueError("Native/pose atom identities differ beyond the free C-terminal OXT")
        rmsd = math.sqrt(sum(math.dist(native[k], pose[k]) ** 2 for k in native) / len(native))
        rows.append(
            {
                "matched_native_heavy_atoms": len(native),
                "fixed_frame_rmsd_angstrom": rmsd,
                "geometry": geometry(pose, rec),
            }
        )
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", type=Path, required=True)
    args = parser.parse_args()
    receptor = args.run / "receptor.pdbqt"
    pose = args.run / "GWRIGEAGTDPNL/poses.pdbqt"
    print(
        json.dumps(
            {
                "source_sha256": sha(SOURCE),
                "receptor_sha256": sha(receptor),
                "poses_sha256": sha(pose),
                "audit_script_sha256": sha(Path(__file__)),
                "poses": audit(SOURCE.read_text(), receptor.read_text(), pose.read_text()),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
