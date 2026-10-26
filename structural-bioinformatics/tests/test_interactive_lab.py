"""Scientific controls for the same engine executed in browser Python."""

import math
import runpy
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pytest

PROJECT = Path(__file__).resolve().parents[1]
lab = SimpleNamespace(**runpy.run_path(str(PROJECT / "assets/course/interactive_lab.py")))
PDB = PROJECT / "assets/course/gromacs/1ubq-protein.pdb"


def test_rigid_fit_removes_translation_rotation_but_not_local_deformation():
    shifted = lab.geometry(PDB, 10, 73, 0)
    assert shifted["fitted_rmsd"] < 1e-12
    assert math.isclose(shifted["reference_rg"], shifted["moving_rg"], abs_tol=1e-12)
    changed = lab.geometry(PDB, 10, 73, 3)
    assert changed["fitted_rmsd"] > 0.1
    assert changed["fitted_rmsd"] < changed["raw_rmsd"]
    translated = lab.geometry(PDB, 10, 0, 0)
    assert math.isclose(translated["raw_rmsd"], 10, abs_tol=1e-12)


def test_fit_does_not_allow_a_mirror_reflection():
    fixed = np.array([[0, 0, 0], [2, 0, 0], [0, 3, 0], [0, 0, 4]], dtype=float)
    moving = fixed * [-1, 1, 1]
    assert lab.rmsd(lab.fit(moving, fixed), fixed) > 0.5


def test_sequence_orientation_and_invalid_input():
    result = lab.sequence("AA CG\nT")
    assert result["reverse_complement_5_to_3"] == "ACGTT"
    assert result["rna_5_to_3"] == "AACGU"
    assert result["gc_percent"] == 40
    for text in ("", "AGNT", "A" * 301):
        with pytest.raises(ValueError):
            lab.sequence(text)


def test_equilibrium_and_optimizer_control_cases():
    assert lab.populations(0)["probability_b"] == 0.5
    assert math.isclose(lab.populations(2)["probability_b"], 1 / (1 + math.exp(2)))
    assert lab.minimize(rate=0.25, steps=3)["positions"] == [4, 2, 1, 0.5]
    assert lab.minimize(rate=1, steps=3)["energies"] == [16, 16, 16, 16]
    assert lab.minimize(rate=1.1, steps=3)["energies"][-1] > 16


def test_sampling_keeps_seed_reproducible_and_exposes_regime_shift():
    result = lab.sampling(shift=2, noise=0)
    assert result["block_means"] == [1] * 4 + [3] * 4
    assert result["mean"] == 2
    assert lab.sampling(seed=17) == lab.sampling(seed=17)
    assert lab.sampling(seed=18)["series"] != lab.sampling(seed=17)["series"]


def test_graph_matches_known_distances_and_records_real_input():
    sparse, dense = lab.graph(PDB), lab.graph(PDB, 5)
    assert sparse["degrees"] == [1, 3, 1, 1]
    assert len(dense["edges"]) == 5
    assert {tuple(e[:2]) for e in sparse["edges"]} < {tuple(e[:2]) for e in dense["edges"]}
    assert sorted(d for _, d in sparse["neighbors"]) == [3, 4, 4]
    protein = lab.graph(PDB, 8, "protein", 2, "A:21")
    assert len(protein["points"]) == 76
    assert protein["source_sha256"] == lab.REFERENCE_SHA256
    assert all(abs(i - j) > 2 for i, j, _ in protein["edges"])


@pytest.mark.parametrize("bad", [float("nan"), float("inf"), -999, 999])
def test_controls_reject_nonfinite_or_out_of_range_values(bad):
    with pytest.raises(ValueError):
        lab.populations(bad)
