"""Redock phosphocholine into 1B09 and into a wrong site of the same protein.

The native-site run is the method check: the deposited phosphocholine is a known
answer, so the pose it returns can be compared with the crystal pose. The
wrong-site run is the control: the same ligand in a box that holds no known
ligand must score clearly worse, otherwise the score carries no information.

Run with the isolated docking environment (see environment.yml):

    conda run -n tnf-docking python structural-bioinformatics/docking/run_vina.py

Inputs: the prepared receptor, ligand and boxes of prepare_redock.py.
Outputs, in the work directory:

    poses_native.pdbqt   the ranked poses of the native site
    poses_control.pdbqt  the ranked poses of the wrong site
    docking_run.json     engine version, every parameter, scores and run time
"""

import argparse
import json
import platform
import time
from datetime import UTC, datetime
from pathlib import Path

from vina import Vina

PROJECT = Path(__file__).resolve().parents[1]


def dock(receptor, ligand, center, size, exhaustiveness, seed, cpu, n_poses):
    engine = Vina(sf_name="vina", cpu=cpu, seed=seed, verbosity=1)
    engine.set_receptor(rigid_pdbqt_filename=str(receptor))
    engine.set_ligand_from_file(str(ligand))
    engine.compute_vina_maps(
        center=[float(value) for value in center], box_size=[float(v) for v in size]
    )
    started = time.monotonic()
    engine.dock(exhaustiveness=exhaustiveness, n_poses=n_poses)
    elapsed = time.monotonic() - started
    energies = engine.energies(n_poses=n_poses)
    return engine, energies, round(elapsed, 1)


def run(engine, energies, path, n_poses):
    engine.write_poses(str(path), n_poses=n_poses, overwrite=True)
    # The engine may return fewer poses than asked for; the written models are the truth.
    written = sum(1 for line in path.read_text().splitlines() if line.startswith("MODEL"))
    scores = [
        {
            "rank": index + 1,
            "affinity_kcal_per_mole": round(float(row[0]), 3),
            "intermol_kcal_per_mole": round(float(row[1]), 3),
            "intramol_kcal_per_mole": round(float(row[2]), 3),
            "torsions": int(row[3]),
        }
        for index, row in enumerate(energies[:written])
    ]
    return scores, written


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--project", type=Path, default=PROJECT)
    parser.add_argument(
        "--work",
        type=Path,
        default=PROJECT / "results" / "docking" / "1b09",
        help="directory holding the prepared inputs",
    )
    parser.add_argument("--exhaustiveness", type=int, default=32)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--cpu", type=int, default=4)
    parser.add_argument("--n-poses", type=int, default=20)
    args = parser.parse_args()
    work = args.work.resolve()

    inputs = json.loads((work / "inputs.json").read_text())
    receptor = work / "receptor.pdbqt"
    ligand = work / "ligand.pdbqt"
    for path in (receptor, ligand):
        if not path.exists():
            raise SystemExit(f"{path} is missing; run prepare_redock.py and Meeko first")

    record = {
        "engine": "AutoDock Vina",
        "engine_version": Vina.__version__ if hasattr(Vina, "__version__") else "1.2.7",
        "scoring_function": "vina",
        "parameters": {
            "exhaustiveness": args.exhaustiveness,
            "seed": args.seed,
            "cpu": args.cpu,
            "poses_requested": args.n_poses,
        },
        "host": {
            "python": platform.python_version(),
            "platform": platform.platform(),
        },
        "runs": {},
    }
    for label, box in (("native", inputs["box"]), ("control", inputs["control_box"])):
        engine, energies, elapsed = dock(
            receptor,
            ligand,
            box["center"],
            box["size_angstrom"],
            args.exhaustiveness,
            args.seed,
            args.cpu,
            args.n_poses,
        )
        poses, written = run(engine, energies, work / f"poses_{label}.pdbqt", args.n_poses)
        record["runs"][label] = {
            "box": box,
            "seconds": elapsed,
            "poses_written": written,
            "poses_requested": args.n_poses,
            "poses": poses,
        }
        print(label, poses[0] if poses else "no pose")

    record["generated_at_utc"] = datetime.now(UTC).isoformat(timespec="seconds")
    (work / "docking_run.json").write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({label: run["poses"][0] for label, run in record["runs"].items()}, indent=2))


if __name__ == "__main__":
    main()
