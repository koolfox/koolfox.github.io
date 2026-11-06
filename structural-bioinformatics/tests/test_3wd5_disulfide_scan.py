"""Check the recorded scan against the deposited coordinates."""

import importlib.util
import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]


def test_scan_reproduces_recorded_result():
    spec = importlib.util.spec_from_file_location(
        "scan", PROJECT / "scripts/scan_3wd5_disulfide.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    expected = json.loads(
        (PROJECT / "assets/3wd5-receptor-diagnostic/disulfide-torsion-scan.json").read_text()
    )
    assert module.scan() == expected
    assert expected["grid_points"] == 32400
    assert expected["passing_grid_points"] > 0
    assert max(expected["best"]["sg_displacements_angstrom"]) > 2
