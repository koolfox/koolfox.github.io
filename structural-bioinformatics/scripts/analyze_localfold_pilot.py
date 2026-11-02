"""Recompute the real LocalFold pilot from curated exports; no inference/network."""

import hashlib
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from peptide_lab.structure import compare_ca, screen_structure

PROJECT = Path(__file__).resolve().parents[1]
PROVENANCE = PROJECT / "data/metadata/localfold-pilot-provenance.json"


def analyze(project=PROJECT):
    provenance = json.loads((project / "data/metadata/localfold-pilot-provenance.json").read_text())
    reference = project / provenance["reference"]["path"]
    if hashlib.sha256(reference.read_bytes()).hexdigest() != provenance["reference"]["sha256"]:
        raise ValueError("Reference digest mismatch")
    results = []
    for run in provenance["runs"]:
        for file in run["files"].values():
            if hashlib.sha256((project / file["path"]).read_bytes()).hexdigest() != file["sha256"]:
                raise ValueError(f"Digest mismatch: {file['path']}")
        request = json.loads((project / run["files"]["request"]["path"]).read_text())[0]
        sequence = request["sequences"][0]["proteinChain"]["sequence"]
        pdb = project / run["files"]["pdb"]["path"]
        confidence = json.loads((project / run["files"]["confidence"]["path"]).read_text())
        result = {"id": run["id"], **screen_structure(pdb, sequence)}
        result["exported_mean_plddt"] = confidence["mean_plddt"]
        result["exported_ptm_rounded"] = confidence["ptm"]
        if run["id"].startswith("ubiquitin-"):
            result["experimental_comparison"] = compare_ca(pdb, reference)[0]
        result["docking"] = "not_run"
        result["functional_test"] = "not_run"
        results.append(result)
    return {
        "schema_version": 1,
        "scope": "Four actual AF2-mono predictions; geometry screening, not chemical validation",
        "method": {
            "sequence_matching": "Exact standard-residue sequence; one chain and one model",
            "occupancy": "Exclude zero occupancy; one alternate conformer per residue",
            "superposition": (
                "BioPython Superimposer, all 76 equal-weight C-alpha atoms; no trimming"
            ),
            "cn_screen": "1.1 to 1.6 angstrom inclusive; conservative gross-defect screen",
            "not_checked": [
                "all-atom clashes and stereochemistry",
                "protonation and terminal chemistry",
                "energetic stability and conformational ensemble",
                "TNF binding or receptor competition",
            ],
        },
        "runs": results,
    }


def figure(project=PROJECT):
    provenance = json.loads((project / "data/metadata/localfold-pilot-provenance.json").read_text())
    reference = project / provenance["reference"]["path"]
    fig = plt.figure(figsize=(12, 7.5), layout="constrained")
    axes = [fig.add_subplot(2, 2, i, projection="3d" if i < 3 else None) for i in range(1, 5)]
    colors = ["#c65a20", "#006a8e"]
    selected_runs = [provenance["runs"][0], provenance["runs"][3]]
    fits = [compare_ca(project / r["files"]["pdb"]["path"], reference) for r in selected_runs]
    cloud = np.vstack([points for _, aligned, target in fits for points in (aligned, target)])
    center = (cloud.min(axis=0) + cloud.max(axis=0)) / 2
    radius = float(np.ptp(cloud, axis=0).max()) / 2 + 1
    for axis, run, color in zip(axes[:2], selected_runs, colors, strict=True):
        comparison, aligned, target = compare_ca(project / run["files"]["pdb"]["path"], reference)
        axis.plot(*target.T, color="#555b66", linewidth=1.8, label="1UBQ experimental")
        axis.plot(*aligned.T, color=color, linewidth=1.5, label="LocalFold prediction")
        axis.set_title(
            f"{'Single sequence' if run['msa'] == 'none' else 'MMseqs2 MSA'}\n"
            f"All-76 C-alpha RMSD = {comparison['rmsd_angstrom']:.2f} Å"
        )
        axis.set_box_aspect((1, 1, 1))
        for letter, coordinate in zip("xyz", center, strict=True):
            getattr(axis, f"set_{letter}label")(f"{letter} (Å)")
            getattr(axis, f"set_{letter}lim")(coordinate - radius, coordinate + radius)
        axis.legend(fontsize=8)
        axes[2].plot(
            range(1, 77),
            comparison["per_residue_displacement_angstrom"],
            color=color,
            label="Single sequence" if run["msa"] == "none" else "MSA",
        )
    axes[2].set(xlabel="Residue (1UBQ author numbering)", ylabel="Displacement after fit (Å)")
    axes[2].set_title("Every residue retained in the comparison")
    axes[2].legend()
    short_runs = [provenance["runs"][1], provenance["runs"][2]]
    labels, distances = [], []
    for run in short_runs:
        seq = "AR" if run["id"] == "ar" else "ARA"
        report = screen_structure(project / run["files"]["pdb"]["path"], seq)
        for link in report["connections"]:
            labels.append(f"{seq}: {link['from']}–{link['to']}")
            distances.append(link["c_n_angstrom"])
    axes[3].bar(labels, distances, color=["#b83d45", "#b83d45", "#b83d45"])
    axes[3].axhspan(1.1, 1.6, alpha=0.25, color="#28824a", label="C–N screening window")
    axes[3].set(ylabel="Adjacent-residue C–N distance (Å)", title="Short outputs fail continuity")
    axes[3].tick_params(axis="x", labelsize=8)
    axes[3].legend(fontsize=8)
    for i, distance in enumerate(distances):
        axes[3].text(i, distance + 0.3, f"{distance:.2f}", ha="center")
    fig.suptitle("LocalFold pilot · AF2-mono / model 1 / seed 0 / 3 recycles / no template")
    target = project / "assets/localfold-pilot/comparison.png"
    fig.savefig(target, dpi=180)
    plt.close(fig)


def main():
    output = PROJECT / "data/processed/localfold-pilot.json"
    output.write_text(json.dumps(analyze(), ensure_ascii=False, indent=2) + "\n")
    figure()
    print(output)


if __name__ == "__main__":
    main()
