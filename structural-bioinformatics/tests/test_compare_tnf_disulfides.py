import importlib.util
import sys
from pathlib import Path

import pytest

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT / "scripts"))
spec = importlib.util.spec_from_file_location(
    "compare_tnf_disulfides", PROJECT / "scripts/compare_tnf_disulfides.py"
)
comparison = importlib.util.module_from_spec(spec)
spec.loader.exec_module(comparison)


def test_deposited_comparison_and_hash_guard(tmp_path):
    source, sha, chains = comparison.SOURCES["7TA3"]
    result = comparison.measure(source, sha, chains)
    assert result["B"]["sg69_cb101_angstrom"] == pytest.approx(3.0031, abs=0.0001)
    assert result["D"]["sg69_sg101_cb101_degrees"] == pytest.approx(103.798, abs=0.001)
    altered = tmp_path / "changed.pdb"
    altered.write_bytes(source.read_bytes() + b"\n")
    with pytest.raises(ValueError, match="Unexpected source hash"):
        comparison.measure(altered, sha, chains)
