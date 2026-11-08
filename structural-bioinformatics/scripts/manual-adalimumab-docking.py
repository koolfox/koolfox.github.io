#!/usr/bin/env python3
"""Bounded, known-region exploratory docking; all outputs are newly created."""

import argparse
import hashlib
import importlib.metadata
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from Bio.PDB import PDBParser, Superimposer
from rdkit import Chem

ROOT = Path(__file__).resolve().parents[1]
INPUTS = {
    "3wd5": "assets/3wd5.pdb",
    "7ta3": "assets/tnf-peptide/7ta3.pdb",
    "repaired": "assets/tnf-peptide/receptor-repaired.pdb",
    "receptor": "assets/tnf-peptide/receptor.pdbqt",
    "peptide": "assets/manual-adalimumab-sequence-model.sdf",
    "model_report": "data/processed/manual-adalimumab-model.json",
    "repair_report": "data/processed/tnf-receptor-repair.json",
    "preparation": "data/metadata/tnf-peptide-preparation.json",
    "redock_report": "data/processed/tnf-peptide-redock.json",
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def distance(a, b):
    return np.linalg.norm(a[:, None, :] - b[None, :, :], axis=2)


def occupied(atom):
    return (atom.occupancy or 0) > 0 and atom.element not in ("H", "D")


def fit_site(source, target):
    """Fit matching occupied CAs; return transformed 3WD5 fragment and audit."""
    a, b = source["A"], target["B"]
    pairs, mismatches = [], []
    for residue in a:
        key = residue.id
        if key[0] != " " or key not in b:
            continue
        other = b[key]
        if residue.resname != other.resname:
            mismatches.append([key[1], residue.resname, other.resname])
            continue
        if "CA" in residue and "CA" in other and occupied(residue["CA"]) and occupied(other["CA"]):
            pairs.append((residue["CA"], other["CA"]))
    if len(pairs) < 100:
        raise ValueError("insufficient matched CA atoms")
    fit = Superimposer()
    fit.set_atoms([p[1] for p in pairs], [p[0] for p in pairs])
    if fit.rms > 2.5:
        raise ValueError("global CA alignment RMSD exceeds 2.5 A")
    fragment = [
        atom
        for res in source["H"]
        if res.id[0] == " " and 52 <= res.id[1] <= 59
        for atom in res
        if occupied(atom)
    ]
    if len(fragment) != 65:
        raise ValueError("unexpected experimental fragment atom count")
    xyz = np.array([atom.coord @ fit.rotran[0] + fit.rotran[1] for atom in fragment])
    missing = []
    for residue in a:
        if residue.id[0] != " " or residue.id in b:
            continue
        atoms = [at.coord @ fit.rotran[0] + fit.rotran[1] for at in residue if occupied(at)]
        if atoms:
            missing.append([residue.id[1], round(float(distance(np.array(atoms), xyz).min()), 3)])
    for n, old, new in mismatches:
        atoms = np.array([at.coord for at in b[n] if occupied(at)])
        mismatches[mismatches.index([n, old, new])] = [
            n,
            old,
            new,
            round(float(distance(atoms, xyz).min()), 3),
        ]
    return xyz, {
        "matched_ca": len(pairs),
        "ca_rmsd_angstrom": float(fit.rms),
        "mismatches_3wd5_7ta3_min_distance_to_fragment_angstrom": mismatches,
        "missing_7ta3_residue_min_distance_to_fragment_angstrom": missing,
        "rotation_3wd5_to_7ta3": fit.rotran[0].tolist(),
        "translation_3wd5_to_7ta3": fit.rotran[1].tolist(),
    }


def smiles(mol):
    return Chem.MolToSmiles(Chem.RemoveHs(mol), isomericSmiles=True)


def expected_molecule():
    """Independently reconstruct the documented charge and L-sequence graph."""
    mol = Chem.RWMol(Chem.MolFromSequence("TWNSGHID"))
    for atom in mol.GetAtoms():
        info = atom.GetPDBResidueInfo()
        name, res = info.GetName().strip(), info.GetResidueName()
        if name == "N" and info.GetResidueNumber() == 1:
            atom.SetFormalCharge(1)
        elif name == "OXT" or (res == "ASP" and name == "OD2"):
            atom.SetFormalCharge(-1)
    mol = mol.GetMol()
    Chem.SanitizeMol(mol)
    return mol


def molecular_qc(mol, expected):
    """Screen graph, spatial stereo, bond lengths and nonlocal heavy atom overlaps."""
    failures = []
    if mol is None or mol.GetNumConformers() != 1:
        return {"failures": ["missing molecule or 3D conformer"], "geometry_clean": False}
    graph_ok = smiles(mol) == smiles(expected)
    if not graph_ok:
        failures.append("graph or specified stereochemistry differs from sequence")
    spatial = Chem.Mol(mol)
    Chem.AssignStereochemistryFrom3D(spatial, replaceExistingTags=True)
    stereo_ok = smiles(spatial) == smiles(expected)
    if not stereo_ok:
        failures.append("3D stereochemistry differs from sequence")
    xyz = np.asarray(mol.GetConformer().GetPositions())
    if not np.isfinite(xyz).all():
        failures.append("nonfinite coordinates")
        return {"failures": failures, "geometry_clean": False}
    bonds = [(b.GetBeginAtomIdx(), b.GetEndAtomIdx()) for b in mol.GetBonds()]
    lengths = [float(np.linalg.norm(xyz[i] - xyz[j])) for i, j in bonds]
    bad_bonds = [
        {"atoms": [i, j], "angstrom": round(length, 4)}
        for (i, j), length in zip(bonds, lengths, strict=True)
        if not 0.65 <= length <= 2.0
    ]
    if bad_bonds:
        failures.append("bond length outside 0.65-2.0 A")
    # 1-2, 1-3 and 1-4 pairs are excluded; the 0.75 van der Waals sum is a
    # deliberately coarse severe-overlap screen, not an energy or force field.
    topological = Chem.GetDistanceMatrix(mol)
    table = Chem.GetPeriodicTable()
    overlaps = []
    for i in range(mol.GetNumAtoms()):
        ai = mol.GetAtomWithIdx(i)
        if ai.GetAtomicNum() <= 1:
            continue
        for j in range(i + 1, mol.GetNumAtoms()):
            aj = mol.GetAtomWithIdx(j)
            if aj.GetAtomicNum() <= 1 or topological[i, j] < 4:
                continue
            dist = float(np.linalg.norm(xyz[i] - xyz[j]))
            limit = 0.75 * (table.GetRvdw(ai.GetAtomicNum()) + table.GetRvdw(aj.GetAtomicNum()))
            if dist < limit:
                overlaps.append(
                    {
                        "atoms": [i, j],
                        "elements": [ai.GetSymbol(), aj.GetSymbol()],
                        "angstrom": round(dist, 4),
                        "threshold_angstrom": round(limit, 4),
                    }
                )
    if overlaps:
        failures.append("nonlocal heavy atom overlap")
    return {
        "graph_and_specified_stereo_match": graph_ok,
        "spatial_stereo_match": stereo_ok,
        "bond_range_angstrom": [min(lengths), max(lengths)] if lengths else None,
        "bad_bonds": bad_bonds,
        "nonlocal_overlaps": overlaps,
        "nonlocal_rule": "heavy pairs >=4 bonds apart, distance < 0.75 sum of RDKit vdW radii",
        "failures": failures,
        "geometry_clean": not failures,
    }


def receptor_qc(pdb, pdbqt):
    """Compare complete heavy-atom identities and positions, allowing terminal O/OXT swap."""

    def read(path, qt):
        result, elements = {}, {}
        for line in path.read_text().splitlines():
            if not line.startswith("ATOM  "):
                continue
            element = line.split()[-1] if qt else line[76:78].strip()
            if element in ("H", "HD", "HS", "D"):
                continue
            key = (line[21], line[22:27], line[17:20], line[12:16].strip())
            if key in result:
                raise ValueError("duplicate receptor atom identity")
            result[key] = np.array([float(line[i : i + 8]) for i in (30, 38, 46)])
            types = {
                "A": "C",
                "C": "C",
                "N": "N",
                "NA": "N",
                "O": "O",
                "OA": "O",
                "S": "S",
                "SA": "S",
            }
            elements[key] = types.get(element, element) if qt else element
        return result, elements

    original, original_elements = read(pdb, False)
    converted, converted_elements = read(pdbqt, True)
    missing = sorted(set(original) - set(converted))
    extra = sorted(set(converted) - set(original))
    mismatches = []
    swapped = []
    element_mismatches = [
        list(key)
        for key in sorted(set(original) & set(converted))
        if original_elements[key] != converted_elements[key]
    ]
    for key in sorted(set(original) & set(converted)):
        delta = float(np.linalg.norm(original[key] - converted[key]))
        if delta <= 0.002:
            continue
        if key[3] in ("O", "OXT"):
            other = (*key[:3], "OXT" if key[3] == "O" else "O")
            # Both members must exist in both files and the swap must be reciprocal.
            if (
                other in original
                and other in converted
                and np.linalg.norm(original[other] - converted[key]) <= 0.002
                and np.linalg.norm(original[key] - converted[other]) <= 0.002
            ):
                swapped.append(list(key))
                continue
        mismatches.append({"atom": list(key), "distance_angstrom": delta})
    result = {
        "pdb_heavy_count": len(original),
        "pdbqt_heavy_count": len(converted),
        "missing": missing,
        "extra": extra,
        "coordinate_mismatches": mismatches,
        "element_mismatches": element_mismatches,
        "equivalent_terminal_oxygen_swaps": swapped,
        "tolerance_angstrom": 0.002,
    }
    result["passed"] = bool(original) and not (missing or extra or mismatches or element_mismatches)
    return result


def pdbqt_models(path):
    text = path.read_text()
    models = []
    for block in text.split("MODEL ")[1:]:
        block = block.split("ENDMDL")[0]
        mapping, coords = {}, {}
        mapped_smiles = None
        for line in block.splitlines():
            if line.startswith("REMARK SMILES ") and not line.startswith("REMARK SMILES IDX "):
                mapped_smiles = line[len("REMARK SMILES ") :].strip()
            if line.startswith("REMARK SMILES IDX "):
                nums = list(map(int, line.split()[3:]))
                if len(nums) % 2:
                    raise ValueError("malformed PDBQT SMILES mapping")
                for i, serial in zip(nums[::2], nums[1::2], strict=True):
                    if i in mapping or serial in mapping.values():
                        raise ValueError("duplicate PDBQT SMILES mapping")
                    mapping[i] = serial
            elif line.startswith(("ATOM  ", "HETATM")):
                serial = int(line[6:11])
                if serial in coords:
                    raise ValueError("duplicate PDBQT serial")
                coords[serial] = np.array([float(line[i : i + 8]) for i in (30, 38, 46)])
        models.append((mapping, coords, mapped_smiles))
    return models


def pose_coordinate_qc(mol, mapping, coords, mapped_smiles):
    # Meeko's exported SDF places its SMILES-ordered heavy atoms first.
    heavy = [a.GetIdx() for a in mol.GetAtoms() if a.GetAtomicNum() > 1]
    if heavy != list(range(len(heavy))) or set(mapping) != set(range(1, len(heavy) + 1)):
        return {"passed": False, "failure": "incomplete mapping or unexpected SDF atom ordering"}
    if any(serial not in coords for serial in mapping.values()):
        return {"passed": False, "failure": "mapped PDBQT atom missing"}
    reference = Chem.MolFromSmiles(mapped_smiles or "")
    actual = Chem.RemoveHs(mol)
    if reference is None or reference.GetNumAtoms() != actual.GetNumAtoms():
        return {"passed": False, "failure": "invalid mapped SMILES"}
    for index in range(reference.GetNumAtoms()):
        reference.GetAtomWithIdx(index).SetAtomMapNum(index + 1)
        actual.GetAtomWithIdx(index).SetAtomMapNum(index + 1)
    if Chem.MolToSmiles(reference, isomericSmiles=True) != Chem.MolToSmiles(
        actual, isomericSmiles=True
    ):
        return {"passed": False, "failure": "SDF atom order does not match PDBQT mapped SMILES"}
    xyz = mol.GetConformer().GetPositions()
    deviations = [
        float(np.linalg.norm(xyz[i - 1] - coords[serial])) for i, serial in mapping.items()
    ]
    maximum = max(deviations)
    return {
        "passed": maximum <= 0.002,
        "max_distance_angstrom": maximum,
        "mapped_heavy_atoms": len(heavy),
        "tolerance_angstrom": 0.002,
    }


def command(args, log, root, out, tool_dir, timeout):
    def clean(text):
        return (
            text.replace(str(root), "<project>")
            .replace(str(out), "<output>")
            .replace(str(tool_dir), "<tool-dir>")
        )

    try:
        proc = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired as exc:
        content = (exc.stdout or b"") + (exc.stderr or b"")
        if isinstance(content, bytes):
            content = content.decode(errors="replace")
        log.write_text(clean(content) + "\nTIMEOUT\n")
        raise
    log.write_text(clean(proc.stdout + proc.stderr))
    proc.check_returncode()


def run(tool_dir, out):
    tool_dir = Path(tool_dir).resolve()
    out = out.resolve()
    paths = {k: ROOT / v for k, v in INPUTS.items()}
    report = {
        "status": "failed",
        "failures": [],
        "started_utc": datetime.now(timezone.utc).isoformat(),
        "limitations": [
            "exploratory_not_validated; single seed, low search budget, one conformer",
            "search region derived from bound 3WD5 reference: known-site bias",
            "7TA3 monomer omits TNF trimer neighbors and uses five modeled sidechains",
            "scores and contacts are not affinity, binding proof, or replacement evidence",
        ],
        "source_urls": [
            "https://files.rcsb.org/download/3WD5.pdb",
            "https://files.rcsb.org/download/7TA3.pdb",
        ],
    }
    try:
        report["script_sha256"] = digest(Path(__file__))
        report["versions"] = {
            n: importlib.metadata.version(n) for n in ("rdkit", "meeko", "biopython", "numpy")
        }
        report["tools"] = {
            n: {"sha256": digest(tool_dir / n)}
            for n in ("vina", "mk_prepare_ligand.py", "mk_export.py")
        }
        version = subprocess.run(
            [str(tool_dir / "vina"), "--version"],
            capture_output=True,
            text=True,
            timeout=15,
            check=True,
        )
        report["tools"]["vina"]["version"] = version.stdout.strip()
        report["inputs"] = {k: {"path": INPUTS[k], "sha256": digest(v)} for k, v in paths.items()}
        model = json.loads(paths["model_report"].read_text())
        redock = json.loads(paths["redock_report"].read_text())
        if digest(paths["peptide"]) != model["output_sha256"] or model["sequence"] != "TWNSGHID":
            raise ValueError("peptide provenance mismatch")
        if digest(paths["receptor"]) != redock["files_sha256"]["receptor.pdbqt"]:
            raise ValueError("receptor differs from prepared reference")
        report["receptor_qc"] = receptor_qc(paths["repaired"], paths["receptor"])
        if not report["receptor_qc"]["passed"]:
            raise ValueError("receptor atom identity or coordinates mismatch")
        mol = Chem.SDMolSupplier(str(paths["peptide"]), removeHs=False)[0]
        expected = expected_molecule()
        report["input_qc"] = molecular_qc(mol, expected)
        if not report["input_qc"]["geometry_clean"]:
            raise ValueError("input molecule failed geometry or chemistry QC")
        parser = PDBParser(QUIET=True)
        source = parser.get_structure("3wd5", paths["3wd5"])[0]
        target = parser.get_structure("7ta3", paths["repaired"])[0]
        fragment, alignment = fit_site(source, target)
        center = (fragment.min(axis=0) + fragment.max(axis=0)) / 2
        size = np.maximum(fragment.max(axis=0) - fragment.min(axis=0) + 12, 24)
        if np.any(size > 32):
            raise ValueError("search box unexpectedly large")
        report.update(
            {
                "alignment": alignment,
                "center_angstrom": center.tolist(),
                "size_angstrom": size.tolist(),
                "parameters": {
                    "seed": 42,
                    "cpu": 1,
                    "exhaustiveness": 1,
                    "max_evals": 25000,
                    "num_modes": 3,
                },
                "receptor_limitations": json.loads(paths["repair_report"].read_text()),
                "ligand_chemistry": model["chemistry"],
            }
        )
        prep = [
            str(tool_dir / "mk_prepare_ligand.py"),
            "-i",
            str(paths["peptide"]),
            "-o",
            str(out / "ligand.pdbqt"),
        ]
        vina = [
            str(tool_dir / "vina"),
            "--receptor",
            str(paths["receptor"]),
            "--ligand",
            str(out / "ligand.pdbqt"),
            "--out",
            str(out / "poses.pdbqt"),
            "--seed",
            "42",
            "--cpu",
            "1",
            "--exhaustiveness",
            "1",
            "--max_evals",
            "25000",
            "--num_modes",
            "3",
        ]
        for key, values in [("center", center), ("size", size)]:
            for axis, value in zip("xyz", values, strict=True):
                vina += [f"--{key}_{axis}", str(float(value))]
        export = [
            str(tool_dir / "mk_export.py"),
            str(out / "poses.pdbqt"),
            "-s",
            str(out / "poses.sdf"),
        ]

        def sanitized(cmd):
            return [
                x.replace(str(ROOT), "<project>")
                .replace(str(out), "<output>")
                .replace(str(tool_dir), "<tool-dir>")
                for x in cmd
            ]

        report["commands"] = {
            "path_placeholders": (
                "<project>: structural-bioinformatics; <output>: new directory; "
                "<tool-dir>: configured directory of executables"
            ),
            "prepare": sanitized(prep),
            "vina": sanitized(vina),
            "export": sanitized(export),
        }
        command(prep, out / "prepare.log", ROOT, out, tool_dir, 90)
        report["torsdof"] = int((out / "ligand.pdbqt").read_text().split("TORSDOF ")[-1].split()[0])
        command(vina, out / "vina.log", ROOT, out, tool_dir, 180)
        command(export, out / "export.log", ROOT, out, tool_dir, 60)
        poses = list(Chem.SDMolSupplier(str(out / "poses.sdf"), removeHs=False))
        pdbqt = pdbqt_models(out / "poses.pdbqt")
        if not poses or len(poses) != len(pdbqt):
            raise ValueError("SDF/PDBQT pose count mismatch or no poses")
        receptor = np.array([a.coord for a in target["B"].get_atoms() if occupied(a)])
        qc = []
        for pose, (mapping, coords, mapped_smiles) in zip(poses, pdbqt, strict=True):
            q = molecular_qc(pose, expected)
            if pose is None or pose.GetNumConformers() != 1:
                qc.append(q)
                continue
            q["pdbqt_sdf_coordinates"] = pose_coordinate_qc(pose, mapping, coords, mapped_smiles)
            if not q["pdbqt_sdf_coordinates"]["passed"]:
                q["failures"].append("PDBQT and SDF coordinates mismatch")
            xyz = np.array(
                [
                    list(pose.GetConformer().GetAtomPosition(a.GetIdx()))
                    for a in pose.GetAtoms()
                    if a.GetAtomicNum() > 1
                ]
            )
            if not np.isfinite(xyz).all():
                qc.append(q)
                continue
            d = distance(xyz, receptor)
            q["receptor_min_heavy_distance_angstrom"] = float(d.min())
            q["receptor_pairs_below_2_angstrom"] = int((d < 2).sum())
            q["receptor_pairs_within_4_5_angstrom"] = int((d <= 4.5).sum())
            q["centroid_distance_to_reference_fragment_angstrom"] = float(
                np.linalg.norm(xyz.mean(0) - fragment.mean(0))
            )
            q["heavy_atoms_outside_box"] = int(
                (np.abs(xyz - center) > size / 2 + 0.001).any(axis=1).sum()
            )
            if q["receptor_pairs_below_2_angstrom"]:
                q["failures"].append("receptor heavy atom clash below 2 A")
            if not q["receptor_pairs_within_4_5_angstrom"]:
                q["failures"].append("no receptor atom within 4.5 A")
            if q["heavy_atoms_outside_box"]:
                q["failures"].append("heavy atom outside search box")
            q["geometry_clean"] = not q["failures"]
            qc.append(q)
        report["pose_qc"] = qc
        report["geometry_clean_pose_count"] = sum(q["geometry_clean"] for q in qc)
        report["status"] = (
            "exploratory_not_validated"
            if report["geometry_clean_pose_count"]
            else "exploratory_no_qc_passing_poses"
        )
    except Exception as exc:
        report["failures"].append(
            f"{type(exc).__name__}: {exc}".replace(str(ROOT), "<project>")
            .replace(str(out), "<output>")
            .replace(str(tool_dir), "<tool-dir>")
        )
    finally:
        report["finished_utc"] = datetime.now(timezone.utc).isoformat()
        report["outputs_sha256"] = {p.name: digest(p) for p in out.iterdir() if p.is_file()}
        (out / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument(
        "--tool-dir",
        required=True,
        type=Path,
        help="Directory containing Vina and Meeko executables",
    )
    args = parser.parse_args()
    args.output_dir.mkdir(parents=False, exist_ok=False)
    result = run(args.tool_dir, args.output_dir)
    print(json.dumps({"status": result["status"], "failures": result["failures"]}))
    if result["status"] != "exploratory_not_validated":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
