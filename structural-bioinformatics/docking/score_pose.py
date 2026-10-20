"""Score the redocking poses of 1B09 against the deposited phosphocholine.

The question this answers is narrow: does the docking reproduce a pose that is
already known? The reference is the deposited phosphocholine of chain A; the
RMSD is symmetry-corrected over the heavy atoms, so the interchangeable
phosphate oxygens cannot inflate or deflate the number.

Run with the isolated docking environment (see environment.yml):

    conda run -n tnf-docking python structural-bioinformatics/docking/score_pose.py

Inputs: the prepared inputs, the poses of run_vina.py. Output:
`data/processed/docking-redock-1b09.json`, a small record with the checks, the
numbers and the limits of what this run can say.
"""

import argparse
import json
import platform
import subprocess
from datetime import UTC, datetime
from pathlib import Path

from rdkit import Chem

PROJECT = Path(__file__).resolve().parents[1]
RMSD_GATE_ANGSTROM = 2.0
SCORE_GAP_KCAL = 1.0


def export_poses(pdbqt, sdf):
    subprocess.run(["mk_export.py", str(pdbqt), "-s", str(sdf)], check=True, capture_output=True)
    supplier = Chem.SDMolSupplier(str(sdf), removeHs=True)
    return [molecule for molecule in supplier if molecule is not None]


def connectivity(molecule):
    """A copy with single bonds only, so matching compares the graph and not the order."""
    copy = Chem.Mol(molecule)
    for bond in copy.GetBonds():
        bond.SetBondType(Chem.BondType.SINGLE)
    return copy


def reference_molecule(ideal_sdf, reference_pdb):
    """The deposited phosphocholine, written in the atom order of the ideal model."""
    ideal = Chem.MolFromMolFile(str(ideal_sdf), removeHs=True)
    if ideal is None:
        raise SystemExit(f"cannot read the ideal ligand from {ideal_sdf}")
    block = reference_pdb.read_text()
    deposited = Chem.MolFromPDBBlock(block, removeHs=True, sanitize=False, proximityBonding=True)
    if deposited is None or deposited.GetNumAtoms() != ideal.GetNumAtoms():
        raise SystemExit("the deposited ligand does not match the ideal model")
    match = connectivity(deposited).GetSubstructMatch(connectivity(ideal))
    if not match:
        raise SystemExit("the deposited ligand does not match the ideal model")
    conformer = Chem.Conformer(ideal.GetNumAtoms())
    for deposited_index, ideal_index in enumerate(match):
        position = deposited.GetConformer().GetAtomPosition(deposited_index)
        conformer.SetAtomPosition(ideal_index, position)
    reference = Chem.Mol(ideal)
    reference.RemoveAllConformers()
    reference.AddConformer(conformer, assignId=True)
    return reference


def rmsd_against(pose, reference):
    """Heavy-atom RMSD to the crystal pose, without superposition.

    The docking pose is compared in the frame of the crystal, so the two poses must
    not be aligned onto each other first; only the interchangeable phosphate oxygens
    are allowed to permute. RDKit's GetBestRMS would superimpose the molecules and
    therefore measure the difference of the internal geometry instead.
    """
    query = connectivity(pose)
    target = connectivity(reference)
    best = float("inf")
    matches = target.GetSubstructMatches(query, uniquify=False, maxMatches=1000)
    for match in matches:
        total = 0.0
        for query_index, target_index in enumerate(match):
            first = pose.GetConformer().GetAtomPosition(query_index)
            second = reference.GetConformer().GetAtomPosition(target_index)
            total += (
                (first.x - second.x) ** 2 + (first.y - second.y) ** 2 + (first.z - second.z) ** 2
            )
        best = min(best, (total / len(match)) ** 0.5)
    if best == float("inf"):
        raise SystemExit("the pose and the crystal ligand do not share a graph")
    return best


def calcium_ions(receptor_pdb):
    ions = []
    for line in receptor_pdb.read_text().splitlines():
        if line.startswith("HETATM") and line[17:20].strip() == "CA":
            ions.append([float(line[30:38]), float(line[38:46]), float(line[46:54])])
    return ions


def closest_calcium(pose, reference, ions):
    """Distance from the phosphorus of a pose to the nearest calcium ion."""
    phosphorus = next((atom.GetIdx() for atom in pose.GetAtoms() if atom.GetSymbol() == "P"), None)
    if phosphorus is None or not ions:
        return None
    position = pose.GetConformer().GetAtomPosition(phosphorus)
    return round(
        min(
            ((position.x - ion[0]) ** 2 + (position.y - ion[1]) ** 2 + (position.z - ion[2]) ** 2)
            ** 0.5
            for ion in ions
        ),
        2,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--project", type=Path, default=PROJECT)
    parser.add_argument("--work", type=Path, default=PROJECT / "results" / "docking" / "1b09")
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT / "data" / "processed" / "docking-redock-1b09.json",
    )
    args = parser.parse_args()
    work = args.work.resolve()

    inputs = json.loads((work / "inputs.json").read_text())
    run = json.loads((work / "docking_run.json").read_text())
    reference = reference_molecule(work / "ligand_ideal.sdf", work / "reference_ligand.pdb")
    ions = calcium_ions(work / "receptor.pdb")

    results = {}
    for label in ("native", "control"):
        poses = export_poses(work / f"poses_{label}.pdbqt", work / f"poses_{label}.sdf")
        scores = run["runs"][label]["poses"]
        if len(poses) != len(scores):
            raise SystemExit(
                f"{label}: {len(poses)} poses were written but {len(scores)} scores were "
                "recorded; the run and the scoring are out of step"
            )
        scored = []
        for index, pose in enumerate(poses):
            scored.append(
                {
                    "rank": index + 1,
                    "affinity_kcal_per_mole": scores[index]["affinity_kcal_per_mole"],
                    "rmsd_to_crystal_pose_angstrom": round(rmsd_against(pose, reference), 3),
                    "phosphorus_to_nearest_calcium_angstrom": closest_calcium(
                        pose, reference, ions
                    ),
                }
            )
        results[label] = scored

    native = results["native"]
    best = min(native, key=lambda item: item["rmsd_to_crystal_pose_angstrom"])
    top = native[0]
    control_top = results["control"][0]
    native_affinity = top["affinity_kcal_per_mole"]
    control_affinity = control_top["affinity_kcal_per_mole"]
    crystal_to_calcium = closest_calcium(reference, reference, ions)

    record = {
        "pdb_id": inputs["pdb_id"],
        "question": (
            "Can the docking engine reproduce a ligand pose that the crystal structure "
            "already shows, and does the score tell the true site from a wrong one?"
        ),
        "method": {
            "engine": run["engine"],
            "engine_version": run["engine_version"],
            "scoring_function": run["scoring_function"],
            "parameters": run["parameters"],
            "receptor": inputs["receptor"],
            "ligand": inputs["ligand"],
            "reference_pose": inputs["reference_pose"],
            "rmsd": "symmetry-corrected heavy-atom RMSD to the deposited phosphocholine",
        },
        "checks": {
            "pose_reproduced": {
                "criterion": (
                    f"RMSD of the top ranked pose to the crystal pose is at most "
                    f"{RMSD_GATE_ANGSTROM:.1f} Å"
                ),
                "top_pose_rmsd_angstrom": top["rmsd_to_crystal_pose_angstrom"],
                "best_pose_rmsd_angstrom": best["rmsd_to_crystal_pose_angstrom"],
                "best_pose_rank": best["rank"],
                "passed": top["rmsd_to_crystal_pose_angstrom"] <= RMSD_GATE_ANGSTROM,
            },
            "site_reproduced": {
                "criterion": (
                    "the phosphorus of the top pose sits in the calcium pocket of the "
                    "crystal ligand, within 1 Å of the crystal distance"
                ),
                "crystal_phosphorus_to_calcium_angstrom": crystal_to_calcium,
                "top_pose_phosphorus_to_calcium_angstrom": top[
                    "phosphorus_to_nearest_calcium_angstrom"
                ],
                "control_pose_phosphorus_to_calcium_angstrom": control_top[
                    "phosphorus_to_nearest_calcium_angstrom"
                ],
                "passed": (
                    crystal_to_calcium is not None
                    and top["phosphorus_to_nearest_calcium_angstrom"] is not None
                    and abs(top["phosphorus_to_nearest_calcium_angstrom"] - crystal_to_calcium)
                    <= 1.0
                ),
            },
            "score_separates_sites": {
                "criterion": (
                    f"the native site scores at least {SCORE_GAP_KCAL:.1f} kcal/mol better "
                    "than the wrong site"
                ),
                "native_affinity_kcal_per_mole": native_affinity,
                "control_affinity_kcal_per_mole": control_affinity,
                "difference_kcal_per_mole": round(native_affinity - control_affinity, 3),
                "passed": (native_affinity - control_affinity) <= -SCORE_GAP_KCAL,
            },
        },
        "poses": results,
        "pose_distribution": {
            "native_poses_written": len(native),
            "native_poses_within_2_angstrom": sum(
                1 for item in native if item["rmsd_to_crystal_pose_angstrom"] <= RMSD_GATE_ANGSTROM
            ),
            "native_rmsd_range_angstrom": [
                min(item["rmsd_to_crystal_pose_angstrom"] for item in native),
                max(item["rmsd_to_crystal_pose_angstrom"] for item in native),
            ],
            "control_poses_written": len(results["control"]),
            "control_rmsd_range_angstrom": [
                min(item["rmsd_to_crystal_pose_angstrom"] for item in results["control"]),
                max(item["rmsd_to_crystal_pose_angstrom"] for item in results["control"]),
            ],
        },
        "limitations": [
            "This is a method check on one known case, not a search for a new binder.",
            "The Vina score is a ranking function, not an affinity; it is not a binding "
            "free energy.",
            "The control site is the protein atom furthest from every phosphocholine that "
            "is also at least 6 Å from every calcium, so it holds neither a known ligand "
            "nor a metal site.",
            "The ligand is docked as the ideal chemical component model and compared "
            "with the deposited pose; the two are not the same conformer to begin with.",
            "Nothing here measures adalimumab, TNF binding strength, or the TOP2A question.",
        ],
        "software": {
            "python": platform.python_version(),
            "engine": run["engine_version"],
        },
        "generated_at_utc": datetime.now(UTC).isoformat(timespec="seconds"),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(record["checks"], indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
