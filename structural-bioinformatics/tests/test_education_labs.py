"""Independent invariants for the small general teaching exercises."""

import importlib.util
import math
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "learning_lab", PROJECT / "assets/course/learning_lab.py"
)
lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab)


def test_geometry_control_preserves_shape_and_matches_curated_input():
    result = lab.geometry(PROJECT / "assets/course/gromacs/1ubq-protein.pdb")
    assert result["ca_count"] == 76
    assert result["occupied_atom_rows"] == 602
    assert math.isclose(result["ca_radius_of_gyration_angstrom"], 11.4928948762, abs_tol=1e-9)
    assert math.isclose(result["raw_rmsd_after_translation_angstrom"], 10, abs_tol=1e-12)
    assert result["after_known_inverse_translation_angstrom"] < 1e-12
    points = [(0, 0, 0), (3, 4, 0)]
    assert lab.center(points) == (1.5, 2.0, 0.0)
    assert math.isclose(lab.rmsd(points, [(0, 0, 0), (3, 4, 2)]), math.sqrt(2))


def test_synthetic_energy_and_sampling_answers():
    result = lab.energy()
    assert result["gradient_descent_x"][:4] == [4, 2, 1, 0.5]
    assert all(
        a > b
        for a, b in zip(
            result["gradient_descent_u"][:-1], result["gradient_descent_u"][1:], strict=True
        )
    )
    assert math.isclose(result["p_b"], 1 / (1 + math.exp(2)))
    assert lab.sampling()["block_means"] == [1, 1, 3, 3]


def test_contact_threshold_changes_graph_without_changing_coordinates():
    sparse, dense = lab.graph(4.1), lab.graph(5.0)
    assert sparse["degrees"] == {"A": 1, "B": 3, "C": 1, "D": 1}
    assert len(dense["edges"]) == 5
    assert {tuple(e) for e in sparse["edges"]} < {tuple(e) for e in dense["edges"]}
    assert sparse["coordinates_angstrom"] == dense["coordinates_angstrom"]
