"""The docking protocol document and the run record must tell the same story.

The redocking of 1B09 is the only docking result in this project, so the numbers
in the teaching document are checked against the small processed record. If a run
is repeated with different parameters, both files have to change together.
"""

import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
RECORD = PROJECT / "data" / "processed" / "docking-redock-1b09.json"
DOCUMENT = PROJECT / "docs" / "docking-protocol.fa.md"
PLAN = PROJECT / "data" / "metadata" / "weekly-plan.json"


def test_the_protocol_reports_the_recorded_numbers():
    record = json.loads(RECORD.read_text())
    text = DOCUMENT.read_text()
    checks = record["checks"]

    pose = checks["pose_reproduced"]
    site = checks["site_reproduced"]
    score = checks["score_separates_sites"]

    assert f"{pose['top_pose_rmsd_angstrom']:.3f}" in text
    assert f"{pose['best_pose_rmsd_angstrom']:.3f}" in text
    assert f"{site['crystal_phosphorus_to_calcium_angstrom']:.2f}" in text
    assert f"{site['top_pose_phosphorus_to_calcium_angstrom']:.2f}" in text
    assert f"{site['control_pose_phosphorus_to_calcium_angstrom']:.2f}" in text
    assert f"{abs(score['native_affinity_kcal_per_mole']):.3f}" in text
    assert f"{abs(score['control_affinity_kcal_per_mole']):.3f}" in text
    assert record["method"]["receptor"]["source_sha256"] in text
    assert record["method"]["ligand"]["source"]["sha256"] in text


def test_the_protocol_names_the_gate_that_failed():
    record = json.loads(RECORD.read_text())
    text = DOCUMENT.read_text()
    checks = record["checks"]

    # Two gates passed and one did not; the document must say so in the same words.
    assert checks["pose_reproduced"]["passed"] is True
    assert checks["site_reproduced"]["passed"] is True
    assert checks["score_separates_sites"]["passed"] is False
    assert "امتیاز، جایگاه را تشخیص نداد" in text
    assert "هیچ‌چیز در این سند دربارهٔ آدالیموماب" in text


def test_the_weekly_plan_status_follows_the_record():
    record = json.loads(RECORD.read_text())
    plan = json.loads(PLAN.read_text())
    week = next(week for week in plan["weeks"] if week["week"] == 7)
    topics = {entry["topic"]: entry for entry in week["course"]["topics"]}
    small = next(entry for topic, entry in topics.items() if "مولکول‌های شیمیایی" in topic)
    protein = next(entry for topic, entry in topics.items() if "پروتئین و پروتئین" in topic)

    # A protein and small molecule case was run; a protein and protein case was not.
    assert small["status"] == "partial"
    assert protein["status"] == "pending"
    rmsd = record["checks"]["pose_reproduced"]["top_pose_rmsd_angstrom"]
    assert f"{rmsd:.2f}" in small["note"]
    assert "docking-protocol.fa.md" in protein["note"]
