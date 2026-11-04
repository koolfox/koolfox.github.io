"""Audit the committed 39-candidate workflow, not a fabricated docking fixture."""

import importlib.util
import json
import math
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "audit_batched_run", PROJECT / "scripts/audit_batched_run.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_published_workflow_reproduces_independent_file_audit():
    root = PROJECT / "assets/peptide-ops-39-demo"
    expected = json.loads((PROJECT / "data/processed/peptide-ops-39-audit.json").read_text())
    actual = module.audit(root)
    assert actual["status"] == expected["status"]
    assert actual["scope"] == expected["scope"]
    assert actual["minimum"]["sequence"] == expected["minimum"]["sequence"]
    assert actual["minimum"]["pose"] == expected["minimum"]["pose"]
    assert math.isclose(
        actual["minimum"]["distance_angstrom"],
        expected["minimum"]["distance_angstrom"],
        abs_tol=1e-9,
    )
    assert actual["candidates"] == 39
    assert actual["poses"] == 89
