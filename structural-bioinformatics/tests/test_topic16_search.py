"""Check the teaching example's mathematical and reporting invariants."""

import importlib.util
import math
import subprocess
import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
SCRIPT = PROJECT / "assets/course/topic16_search.py"
spec = importlib.util.spec_from_file_location("topic16_search", SCRIPT)
model = importlib.util.module_from_spec(spec)
spec.loader.exec_module(model)


def test_separate_starts_find_both_wells_and_lower_energy():
    for start, target in [(-1.5, -1), (0.5, 1)]:
        steps, x, energy, status = model.minimize(start)
        assert status == "stationary" and steps > 0
        assert math.isclose(x, target, abs_tol=1e-6)
        assert energy < model.energy(start)
        assert abs(model.gradient(x)) < 1e-6


def test_stationary_peak_and_step_limit_are_distinguished():
    assert model.minimize(0) == (0, 0, 1, "stationary")
    assert model.energy(0.1) < model.energy(0)
    assert model.minimize(0.5, max_steps=2)[-1] == "step_limit"


def test_command_output_and_invalid_rate():
    result = subprocess.run(
        [sys.executable, str(SCRIPT)], capture_output=True, text=True, check=True
    )
    assert len(result.stdout.splitlines()) == 4
    bad = subprocess.run([sys.executable, str(SCRIPT), "--rate", "nan"], capture_output=True)
    assert bad.returncode != 0
