"""Bounded rigid known-site 7TA3 fragment control; no claim of fragment binding."""

import argparse
import hashlib
import json
import math
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT / "assets/tnf-peptide/7ta3.pdb"
PREPARED = PROJECT / "assets/tnf-peptide/reference.pdbqt"
RECEPTOR = PROJECT / "assets/tnf-peptide/receptor.pdbqt"
SEQ = "GWRIGEAGTDPNL"
AA = dict(
    zip(
        ("GLY", "TRP", "ARG", "ILE", "GLU", "ALA", "THR", "ASP", "PRO", "ASN", "LEU"),
        "GWRIEATDPNL",
        strict=True,
    )
)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def records(text):
    return [x for x in text.splitlines() if x.startswith(("ATOM  ", "HETATM"))]


def key(line):
    return (line[21], int(line[22:26]), line[26], line[12:16].strip())


def xyz(line):
    return tuple(float(line[i : i + 8]) for i in (30, 38, 46))


def heavy(line, pdbqt=False):
    return (
        (line.split()[-1] not in ("H", "HD", "D"))
        if pdbqt
        else line[76:78].strip() not in ("H", "D")
    )


def select_source(text):
    lines = [
        x
        for x in records(text)
        if x[21] == "A"
        and 3 <= int(x[22:26]) <= 15
        and x[26] == " "
        and x[16] in (" ", "A")
        and float(x[54:60]) > 0
        and heavy(x)
    ]
    residues = {}
    for line in lines:
        residues[int(line[22:26])] = AA[line[17:20]]
    if "".join(residues.get(i, "?") for i in range(3, 16)) != SEQ:
        raise ValueError("unexpected sequence or missing residue")
    if len({key(x) for x in lines}) != len(lines):
        raise ValueError("duplicate atom identifiers")
    return lines


def build(source, prepared):
    ref = select_source(source)
    selected = [
        x for x in records(prepared) if x[21] == "A" and 3 <= int(x[22:26]) <= 15 and x[26] == " "
    ]
    rh = {key(x): x for x in ref}
    ph = {key(x): x for x in selected if heavy(x, True)}
    if len(ph) != sum(heavy(x, True) for x in selected) or rh.keys() != ph.keys():
        raise ValueError("prepared heavy atom identities do not match source")
    if any(math.dist(xyz(rh[k]), xyz(ph[k])) > 0.002 for k in rh):
        raise ValueError("prepared coordinates differ from deposited structure")
    mapping = [
        {
            "source_serial": int(rh[k][6:11]),
            "pdbqt_serial": int(ph[k][6:11]),
            "chain": k[0],
            "residue": k[1],
            "insertion": k[2].strip(),
            "atom": k[3],
            "element": rh[k][76:78].strip(),
        }
        for k in rh
    ]
    return ref, selected, mapping


def metrics(receptor, ligand):
    distances = [math.dist(xyz(a), xyz(b)) for a in receptor for b in ligand]
    return {
        "minimum_heavy_distance_angstrom": min(distances),
        "pairs_below_2_angstrom": sum(d < 2 for d in distances),
        "pairs_below_4_angstrom": sum(d < 4 for d in distances),
    }


def rmsd(reference, pose):
    a = {int(x[6:11]): xyz(x) for x in reference if heavy(x, True)}
    b = {int(x[6:11]): xyz(x) for x in pose if heavy(x, True)}
    if not a or a.keys() != b.keys() or len(b) != sum(heavy(x, True) for x in pose):
        raise ValueError("pose atom serial mismatch")
    return math.sqrt(sum(math.dist(a[k], b[k]) ** 2 for k in a) / len(a))


def translate(lines, dx):
    return [x[:30] + f"{float(x[30:38]) + dx:8.3f}" + x[38:] for x in lines]


def write_ligand(path, lines):
    path.write_text("ROOT\n" + "\n".join(lines) + "\nENDROOT\nTORSDOF 0\n")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--vina", required=True, type=Path)
    p.add_argument("--output-dir", required=True, type=Path)
    args = p.parse_args()
    ref, ligand, mapping = build(SOURCE.read_text(), PREPARED.read_text())
    receptor = [x for x in records(RECEPTOR.read_text()) if heavy(x, True)]
    out = args.output_dir
    out.mkdir(parents=True, exist_ok=False)
    (out / "fragment.pdb").write_text("\n".join(ref) + "\nEND\n")
    (out / "atom-map.json").write_text(json.dumps(mapping, indent=2) + "\n")
    write_ligand(out / "reference.pdbqt", ligand)
    center = [
        (min(xyz(x)[i] for x in ligand) + max(xyz(x)[i] for x in ligand)) / 2 for i in range(3)
    ]
    size = [max(xyz(x)[i] for x in ligand) - min(xyz(x)[i] for x in ligand) + 8 for i in range(3)]
    run = {
        "utc": datetime.now(timezone.utc).isoformat(),
        "source_url": "https://files.rcsb.org/download/7TA3.pdb",
        "source_retrieval_note": (
            "Existing checked-in source; metadata records preparation time, "
            "not original source retrieval time"
        ),
        "source_sha256": sha(SOURCE),
        "prepared_peptide_sha256": sha(PREPARED),
        "receptor_sha256": sha(RECEPTOR),
        "script_sha256": sha(Path(__file__)),
        "vina_sha256": sha(args.vina),
        "vina_version": subprocess.run(
            [str(args.vina), "--version"], capture_output=True, text=True, check=True
        ).stdout.strip(),
        "center_angstrom": center,
        "size_angstrom": size,
        "atom_count": len(mapping),
        "cases": {},
    }
    for dx in (0, 10, 40, -40):
        path = out / f"offset-{dx:+d}.pdbqt"
        translated = translate(ligand, dx)
        write_ligand(path, translated)
        cmd = [
            str(args.vina),
            "--receptor",
            str(RECEPTOR),
            "--ligand",
            str(path),
            "--autobox",
            "--score_only",
            "--cpu",
            "1",
            "--seed",
            "42",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120, check=True)
        log = out / f"score-{dx:+d}.log"
        log.write_text(result.stdout + result.stderr)
        run["cases"][str(dx)] = {
            "geometry": metrics(receptor, [x for x in translated if heavy(x, True)]),
            "fixed_frame_rmsd_angstrom": rmsd(ligand, translated),
            "command": cmd,
            "input_sha256": sha(path),
            "log_sha256": sha(log),
        }
    pose = out / "poses.pdbqt"
    cmd = [
        str(args.vina),
        "--receptor",
        str(RECEPTOR),
        "--ligand",
        str(out / "reference.pdbqt"),
        "--out",
        str(pose),
        "--seed",
        "42",
        "--cpu",
        "1",
        "--exhaustiveness",
        "2",
        "--num_modes",
        "5",
        "--max_evals",
        "100000",
    ]
    for axis, val in zip("xyz", center, strict=True):
        cmd += ["--center_" + axis, str(val)]
    for axis, val in zip("xyz", size, strict=True):
        cmd += ["--size_" + axis, str(val)]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=180, check=True)
    (out / "dock.log").write_text(result.stdout + result.stderr)
    blocks = re.findall(r"^MODEL\s+\d+\s*$(.*?)^ENDMDL\s*$", pose.read_text(), re.M | re.S)
    if not blocks:
        raise ValueError("no Vina poses")
    run["docking"] = {
        "command": cmd,
        "pose_sha256": sha(pose),
        "log_sha256": sha(out / "dock.log"),
        "poses": [
            {
                "rank": i,
                "fixed_frame_rmsd_angstrom": rmsd(ligand, records(block)),
                "geometry": metrics(receptor, [x for x in records(block) if heavy(x, True)]),
                "vina_result": next((x for x in block.splitlines() if "VINA RESULT" in x), None),
            }
            for i, block in enumerate(blocks, 1)
        ],
    }
    (out / "report.json").write_text(json.dumps(run, indent=2) + "\n")
    print(json.dumps(run["docking"], indent=2))


if __name__ == "__main__":
    main()
