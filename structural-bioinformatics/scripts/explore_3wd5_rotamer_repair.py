#!/usr/bin/env python3
"""Enumerate rigid cysteine rotamers; report diagnostics, not a receptor."""

import hashlib
import itertools
import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import Bio
import gemmi
import numpy as np
from audit_3wd5_disulfide_angles import dihedral
from Bio.PDB import PDBParser
from compare_3wd5_local_density import sample
from compare_3wd5_template_transfer import (
    COEFF_SHA,
    MAP_SHA,
    SOURCE,
    TEMPLATE,
    TEMPLATE_SHA,
    verify,
)
from scan_3wd5_disulfide import SHA

PROJECT = Path(__file__).resolve().parents[1]
TRIMER = PROJECT / "assets/3wd5-trimer-3fab.pdb"
TRIMER_SHA = "260d6967b3660a014d8f238dbf1d579d7f796d46e1c4eada74b48bb1efb26974"


def rotate(residue, degrees, start=None):
    ca, cb, sg = (residue[a].coord.astype(float) for a in ("CA", "CB", "SG"))
    if start is not None:
        sg = np.asarray(start, dtype=float)
    axis = (cb - ca) / np.linalg.norm(cb - ca)
    v = sg - cb
    t = np.deg2rad(np.asarray(degrees))[:, None]
    return (
        cb
        + v * np.cos(t)
        + np.cross(axis, v) * np.sin(t)
        + axis * np.dot(axis, v) * (1 - np.cos(t))
    )


def enumerate_candidates(chain, neighbors, start=None, step=2):
    """Screen grid with fixed bond lengths/CA-CB-SG angles; return all passing points."""
    residues = [chain[n] for n in (69, 101)]
    cb = [r["CB"].coord.astype(float) for r in residues]
    originals = [r["SG"].coord.astype(float) for r in residues]
    start = originals if start is None else start
    degrees = np.arange(-180, 180, step)
    p, q = [rotate(r, degrees, s) for r, s in zip(residues, start, strict=True)]
    delta = q[None, :, :] - p[:, None, :]
    distance = np.linalg.norm(delta, axis=2)
    u = cb[0] - p[:, None, :]
    v = cb[1] - q[None, :, :]
    a = np.degrees(
        np.arccos(np.clip(np.sum(u * delta, axis=2) / np.linalg.norm(u, axis=2) / distance, -1, 1))
    )
    b = np.degrees(
        np.arccos(np.clip(np.sum(v * -delta, axis=2) / np.linalg.norm(v, axis=2) / distance, -1, 1))
    )
    near = [
        np.linalg.norm(pos[:, None, :] - neighbors[None, :, :], axis=2).min(axis=1)
        for pos in (p, q)
    ]
    for i, (pos, other) in enumerate(((p, residues[1]), (q, residues[0]))):
        points = np.array([atom.coord for atom in other if atom.name != "SG"])
        near[i] = np.minimum(
            near[i], np.linalg.norm(pos[:, None, :] - points[None, :, :], axis=2).min(axis=1)
        )
    valid = (
        (distance >= 1.9)
        & (distance <= 2.2)
        & (a >= 95)
        & (a <= 115)
        & (b >= 95)
        & (b <= 115)
        & (near[0][:, None] >= 2.5)
        & (near[1][None, :] >= 2.5)
    )
    rows = []
    for i, j in np.argwhere(valid):
        torsion = dihedral(cb[0], p[i], q[j], cb[1])
        # Broad handedness-neutral diagnostic, not a universal chemical law.
        if not 60 <= abs(torsion) <= 120:
            continue
        moves = [
            float(np.linalg.norm(pos - orig)) for pos, orig in zip((p[i], q[j]), start, strict=True)
        ]
        rows.append(
            {
                "rotation_degrees": [int(degrees[i]), int(degrees[j])],
                "positions": [p[i], q[j]],
                "displacement_from_input_angstrom": moves,
                "sg_sg_angstrom": float(distance[i, j]),
                "angles_degrees": [float(a[i, j]), float(b[i, j])],
                "dihedral_degrees": torsion,
                "nearest_other_heavy_angstrom": [float(near[0][i]), float(near[1][j])],
            }
        )
    return sorted(rows, key=lambda row: sum(x * x for x in row["displacement_from_input_angstrom"]))


def neighbors(model, chain_id):
    return np.array(
        [
            atom.coord.astype(float)
            for chain in model
            for residue in chain
            if residue.id[0] == " "
            for atom in residue
            if atom.element not in ("H", "D")
            and atom.occupancy is not None
            and atom.occupancy > 0
            and not (chain.id == chain_id and residue.id[1] in (69, 101))
        ]
    )


def summarize(row):
    return {k: v for k, v in row.items() if k != "positions"}


def candidate_sulfurs(positions):
    """Return the six candidate sulfurs in the reconstructed coordinate frame."""
    return {
        ("ABC"[i], residue): np.asarray(pos)[list(perm)]
        for i, perm in enumerate(((0, 1, 2), (1, 2, 0), (2, 0, 1)))
        for residue, pos in zip((69, 101), positions, strict=True)
    }


def interchain_sulfur_pairs(sulfurs):
    """Measure all unique inter-chain pairs, excluding the covalent intra-chain pairs."""
    expected = {(chain, residue) for chain in "ABC" for residue in (69, 101)}
    if set(sulfurs) != expected:
        raise ValueError("Expected exactly the six A/B/C candidate sulfurs")
    pairs = []
    for left, right in itertools.combinations(sorted(sulfurs), 2):
        if left[0] == right[0]:
            continue
        distance = float(np.linalg.norm(sulfurs[left] - sulfurs[right]))
        if not math.isfinite(distance):
            raise ValueError("Nonfinite sulfur distance")
        pairs.append(
            {
                "atoms": [f"{left[0]}:{left[1]}:SG", f"{right[0]}:{right[1]}:SG"],
                "distance_angstrom": distance,
            }
        )
    return pairs


def summarize_atom_records(raw, *, pdbqt=False):
    """Describe exact PDB/PDBQT bytes; fail on malformed atom lines."""
    chains = {}
    atom_types = {}
    record_types = {}
    atom_records = 0
    charge_sum = 0.0
    for line in raw.decode("ascii").splitlines():
        if line[:6].strip() not in ("ATOM", "HETATM"):
            continue
        if len(line) < (78 if pdbqt else 54):
            raise ValueError("Truncated atom record")
        record_type = line[:6].strip()
        record_types[record_type] = record_types.get(record_type, 0) + 1
        chain = line[21].strip() or "<blank>"
        residue = (line[17:20].strip(), line[22:26].strip(), line[26].strip())
        if not line[12:16].strip() or not residue[0] or not residue[1]:
            raise ValueError("Incomplete atom identity")
        coords = [float(line[start : start + 8]) for start in (30, 38, 46)]
        if not all(math.isfinite(x) for x in coords):
            raise ValueError("Nonfinite atom coordinate")
        entry = chains.setdefault(chain, {"atom_records": 0, "residues": set()})
        entry["atom_records"] += 1
        entry["residues"].add(residue)
        atom_records += 1
        if pdbqt:
            atom_type = line[77:].strip()
            charge = float(line[70:76])
            if not atom_type or not math.isfinite(charge):
                raise ValueError("Invalid PDBQT charge or atom type")
            atom_types[atom_type] = atom_types.get(atom_type, 0) + 1
            charge_sum += charge
    if not atom_records:
        raise ValueError("No atom records")
    result = {
        "sha256": hashlib.sha256(raw).hexdigest(),
        "bytes": len(raw),
        "atom_records": atom_records,
        "record_types": record_types,
        "chains": {
            c: {"atom_records": info["atom_records"], "residues": len(info["residues"])}
            for c, info in sorted(chains.items())
        },
    }
    if pdbqt:
        result["autodock_atom_types"] = dict(sorted(atom_types.items()))
        result["sum_of_rounded_partial_charges"] = round(charge_sum, 6)
    return result


def meeko_process_environment():
    """Avoid cross-interpreter imports from the caller environment."""
    return {
        key: value for key, value in os.environ.items() if key not in ("PYTHONPATH", "PYTHONHOME")
    }


def meeko_environment(meeko):
    """Query the interpreter named by the executable, not this process by assumption."""
    first = Path(meeko).read_text().splitlines()[0]
    if not first.startswith("#!/") or " " in first:
        raise ValueError("Expected an absolute, argument-free Python shebang for Meeko")
    interpreter = first[2:]
    code = (
        "import importlib.metadata as m,json,platform,sys; "
        "names=('meeko','rdkit','numpy','scipy','gemmi','biopython'); "
        "print(json.dumps({'python':sys.version.split()[0], 'executable':sys.executable, "
        "'platform':platform.platform(), 'packages':{n:m.version(n) for n in names}, "
        "'meeko_declared_requirements':m.requires('meeko')}))"
    )
    proc = subprocess.run(
        [interpreter, "-c", code],
        capture_output=True,
        text=True,
        check=True,
        env=meeko_process_environment(),
    )
    return json.loads(proc.stdout)


def probe_candidate(row, meeko):
    """Apply symmetry copies in a temporary file; run the unmodified guard and Meeko."""
    sys.path.insert(0, str(PROJECT / "src"))
    from peptide_lab.receptor_input import inspect_pdb, reject_close_cysteine_contacts

    positions = candidate_sulfurs(row["positions"])
    records = []
    changed = 0
    for line in TRIMER.read_text().splitlines(keepends=True):
        if not line.startswith("ATOM  ") or line[21] not in "ABC":
            continue
        key = (line[21], int(line[22:26]))
        if key in positions and line[12:16].strip() == "SG":
            xyz = positions[key]
            line = line[:30] + "".join(f"{x:8.3f}" for x in xyz) + line[54:]
            changed += 1
        records.append(line)
    if changed != 6:
        raise ValueError("Expected exactly six SG records")
    with tempfile.TemporaryDirectory(prefix="3wd5-candidate-") as tmp:
        path = Path(tmp) / "candidate.pdb"
        path.write_text("".join(records) + "END\n")
        input_summary = summarize_atom_records(path.read_bytes())
        model = PDBParser(QUIET=True, PERMISSIVE=False).get_structure("candidate", path)
        try:
            inspections = {cid: inspect_pdb(path, cid)["status"] for cid in "ABC"}
            reject_close_cysteine_contacts(model, set("ABC"))
        except ValueError as exc:
            return {"guard": "rejected", "reason": str(exc), "meeko": "not run"}
        result = subprocess.run(
            [str(meeko), "--read_pdb", str(path), "-o", str(Path(tmp) / "candidate"), "-p"],
            capture_output=True,
            text=True,
            check=False,
            env=meeko_process_environment(),
        )
        output = Path(tmp) / "candidate.pdbqt"
        output_summary = (
            summarize_atom_records(output.read_bytes(), pdbqt=True) if output.is_file() else None
        )
        if result.returncode == 0 and output_summary is None:
            raise ValueError("Meeko reported success without a PDBQT file")
        return {
            "guard": "passed",
            "input_atom_selection": input_summary,
            "environment": meeko_environment(meeko),
            "candidate_pdb_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "meeko_program_sha256": hashlib.sha256(Path(meeko).read_bytes()).hexdigest(),
            "chain_inspections": inspections,
            "meeko": {
                "exit_code": result.returncode,
                "output_pdbqt": output_summary,
                "stdout": result.stdout.replace(tmp, "<temporary>"),
                "stderr": result.stderr.replace(tmp, "<temporary>"),
                "output_files": sorted(p.name for p in Path(tmp).iterdir() if p != path),
            },
        }


def run(map_path, coefficients, meeko):
    for path, sha in (
        (SOURCE, SHA),
        (TEMPLATE, TEMPLATE_SHA),
        (TRIMER, TRIMER_SHA),
        (map_path, MAP_SHA),
        (coefficients, COEFF_SHA),
    ):
        verify(path, sha)
    grid = gemmi.read_ccp4_map(str(map_path)).grid
    refl = gemmi.as_refln_blocks(gemmi.cif.read(str(coefficients)))[0]
    if not np.array_equal(
        np.asarray(grid),
        np.asarray(refl.transform_f_phi_to_map("pdbx_FWT", "pdbx_PHWT", sample_rate=3.0)),
    ):
        raise ValueError("map differs from coefficients")
    arr = np.asarray(grid)
    mean, sigma = float(np.mean(arr, dtype=np.float64)), float(np.std(arr, dtype=np.float64))
    parser = PDBParser(QUIET=True, PERMISSIVE=False)
    model = parser.get_structure("source", SOURCE)[0]
    chain = model["A"]
    rows = enumerate_candidates(chain, neighbors(model, "A"))
    trimer = parser.get_structure("trimer", TRIMER)[0]
    all_atoms = [
        (c.id, r.id[1], a.name, a.coord.astype(float))
        for c in trimer
        for r in c
        if r.id[0] == " "
        for a in r
        if a.element not in ("H", "D")
        and a.occupancy is not None
        and a.occupancy > 0
        and not (c.id in "ABC" and r.id[1] in (69, 101) and a.name == "SG")
    ]

    def multichain(row):
        points = [
            p[list(perm)] for perm in ((0, 1, 2), (1, 2, 0), (2, 0, 1)) for p in row["positions"]
        ]
        closest = []
        for index, point in enumerate(points):
            cid = "ABC"[index // 2]
            res = (69, 101)[index % 2]
            options = [
                (float(np.linalg.norm(point - xyz)), c, n, name)
                for c, n, name, xyz in all_atoms
                if not (c == cid and n == res)
            ]
            closest.append(min(options))
        return closest

    for row in rows:
        row["density"] = [sample(grid, p, mean, sigma) for p in row["positions"]]
        row["multichain_nearest_excluding_candidate_sulfurs"] = multichain(row)
        pairs = interchain_sulfur_pairs(candidate_sulfurs(row["positions"]))
        row["interchain_sulfur_pairs"] = pairs
        row["interchain_sulfur_min_angstrom"] = min(p["distance_angstrom"] for p in pairs)
        row["interchain_sulfur_all_at_least_2_5_angstrom"] = all(
            p["distance_angstrom"] >= 2.5 for p in pairs
        )
    # Real structure, synthetic perturbation: known sulfurs are withheld from the selection.
    control_model = parser.get_structure("control", TEMPLATE)[0]
    controls = {}
    for cid in ("B", "D"):
        c = control_model[cid]
        native = [c[n]["SG"].coord.astype(float) for n in (69, 101)]
        start = [rotate(c[n], [deg])[0] for n, deg in ((69, 20), (101, -20))]
        found = enumerate_candidates(c, neighbors(control_model, cid), start=start)
        best = found[0] if found else None
        controls[cid] = {
            "input_rotations_degrees": [20, -20],
            "passing_count": len(found),
            "selected": None if best is None else summarize(best),
            "selected_sg_rmsd_to_known_angstrom": None
            if best is None
            else float(
                np.sqrt(
                    np.mean(
                        [
                            np.sum((a - b) ** 2)
                            for a, b in zip(best["positions"], native, strict=True)
                        ]
                    )
                )
            ),
        }
    return {
        "input_sha256": {
            "3wd5": SHA,
            "reconstruction": TRIMER_SHA,
            "7ta3": TEMPLATE_SHA,
            "map": MAP_SHA,
            "coefficients": COEFF_SHA,
        },
        "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "versions": {
            "biopython": Bio.__version__,
            "numpy": np.__version__,
            "gemmi": gemmi.__version__,
            "python": sys.version.split()[0],
        },
        "grid_degrees": 2,
        "screen": {
            "sg_sg_angstrom": [1.9, 2.2],
            "angles_degrees": [95, 115],
            "abs_dihedral_degrees": [60, 120],
            "other_heavy_min_angstrom": 2.5,
        },
        "passing_count": len(rows),
        "selected_minimum_displacement": None if not rows else summarize(rows[0]),
        "all_candidate_summaries": [summarize(r) for r in rows],
        "synthetic_7ta3_controls": controls,
        "temporary_candidate_probe": None if not rows else probe_candidate(rows[0], meeko),
    }


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--map", type=Path, required=True)
    p.add_argument("--coefficients", type=Path, required=True)
    p.add_argument("--meeko", type=Path, required=True)
    args = p.parse_args()
    print(json.dumps(run(args.map, args.coefficients, args.meeko), indent=2, allow_nan=False))
