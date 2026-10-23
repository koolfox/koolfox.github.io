"""Exercise invariants and course route integrity, not a certificate of teaching quality."""

import importlib.util
import json
from pathlib import Path

import pytest

PROJECT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("course_lab", PROJECT / "scripts/course_lab.py")
LAB = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(LAB)


def test_geometry_distinguishes_rigid_translation_from_shape():
    a = LAB.geometry(shift=10)
    b = LAB.geometry(shift=20)
    assert a["ca_count"] == b["ca_count"] == 152
    assert a["equal_weight_ca_rg_angstrom"] == pytest.approx(17.025613, abs=1e-5)
    assert a["raw_rmsd_angstrom"] == pytest.approx(10)
    assert b["raw_rmsd_angstrom"] == pytest.approx(20)
    assert a["translation_removed_rmsd_angstrom"] < 1e-10
    assert b["translation_removed_rmsd_angstrom"] < 1e-10


def test_verlet_timestep_control_at_equal_elapsed_time():
    small = LAB.harmonic(dt=0.01, steps=1000)
    large = LAB.harmonic(dt=0.1, steps=100)
    assert small["initial_energy"] == large["initial_energy"] == 0.5
    assert small["maximum_absolute_energy_error"] < large["maximum_absolute_energy_error"]
    assert small["maximum_absolute_energy_error"] < 2e-5
    with pytest.raises(ValueError):
        LAB.harmonic(dt=0)


def test_contact_graph_is_simple_and_threshold_monotonic():
    small, large = LAB.network(8), LAB.network(10)
    for graph in (small, large):
        assert graph["degree_sum"] == 2 * graph["edge_count"]
        assert len(graph["edges"]) == len({tuple(e) for e in graph["edges"]})
        assert all(abs(left - right) > 1 for left, right in graph["edges"])
    assert set(map(tuple, small["edges"])) < set(map(tuple, large["edges"]))


def test_lessons_follow_syllabus_and_have_all_reading_phases_and_valid_prerequisites():
    course = json.loads((PROJECT / "data/metadata/learning-course.json").read_text())
    syllabus = json.loads((PROJECT / "data/metadata/course-syllabus.json").read_text())
    assert [s["session"] for s in course["sessions"]] == list(range(1, 31))
    for s in course["sessions"]:
        block = next(b for b in syllabus["blocks"] if b["id"] == s["block"])
        assert block["first_session"] <= s["session"] <= block["last_session"]
        assert all(1 <= p < s["session"] for p in s["prerequisites"])
        text = (PROJECT / s["path"]).read_text()
        for phase in ("lesson", "practice", "research", "presentation"):
            assert text.count(f"<!-- course:{phase} -->") == 1
        assert s["check"]["question"] and s["check"]["answer"]


def test_teaching_command_cannot_overwrite_research_outputs(tmp_path):
    import subprocess
    import sys

    protected = PROJECT / "data/processed/full-epitope.json"
    before = protected.read_bytes()
    result = subprocess.run(
        [
            sys.executable,
            str(PROJECT / "scripts/course_lab.py"),
            "inspect",
            "--output",
            str(protected),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode != 0
    assert "only under" in result.stderr
    assert protected.read_bytes() == before


def test_teaching_coordinates_are_traceable_and_md_input_has_a_complete_backbone():
    import hashlib

    from Bio.PDB import PDBParser

    for filename, pathkey, hashkey in (
        ("md-teaching-input.json", "output", "output_sha256"),
        ("rna-teaching-input.json", "output", "sha256"),
    ):
        record = json.loads((PROJECT / "data/metadata" / filename).read_text())
        data = PROJECT / record[pathkey]
        assert hashlib.sha256(data.read_bytes()).hexdigest() == record[hashkey]
        assert record["retrieved_at_utc"] and record["source_url"].startswith(
            "https://files.rcsb.org/"
        )
    model = PDBParser(QUIET=True).get_structure(
        "training", str(PROJECT / "assets/course/gromacs/1ubq-protein.pdb")
    )[0]
    residues = list(model.get_residues())
    assert len(residues) == 76
    assert [r.id[1] for r in residues] == list(range(1, 77))
    assert all({"N", "CA", "C", "O"} <= {a.name for a in r} for r in residues)


def test_nine_chapter_reader_and_formative_quizzes_match_all_topics():
    import re

    course = json.loads((PROJECT / "data/metadata/learning-course.json").read_text())
    syllabus = json.loads((PROJECT / "data/metadata/course-syllabus.json").read_text())
    quizzes = json.loads((PROJECT / "data/metadata/course-quizzes.json").read_text())["quizzes"]
    reader = (PROJECT / "docs/course-sessions.fa.md").read_text()
    assert len(re.findall(r"^## ", reader, re.M)) == len(syllabus["blocks"]) == 9
    assert syllabus["source_kind"] == "official_course_webpage"
    assert syllabus["source_url"] == "https://docs.ce.sharif.edu/courses/40553"
    assert sum(b["sessions"] for b in syllabus["blocks"]) == 30
    assert {q["topic"] for q in quizzes} == {s["session"] for s in course["sessions"]}
    assert len({q["id"] for q in quizzes}) == len(quizzes)
    for q in quizzes:
        assert 0 <= q["correct"] < len(q["options"])
        assert len(set(q["options"])) == len(q["options"]) >= 3
        assert q["explanation"] and (PROJECT / q["lesson"]).is_file()
