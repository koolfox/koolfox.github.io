"""Offline safety checks for the optional Gemmi density-map exporter."""

import importlib.util
from pathlib import Path

import pytest

pytest.importorskip("gemmi", reason="optional density-map dependency")
PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "density_map_export", PROJECT / "scripts/export_3wd5_density_map.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_wrong_source_is_rejected_before_output_creation(tmp_path):
    source = tmp_path / "coefficients.cif.gz"
    source.write_bytes(b"not the recorded file")
    output = tmp_path / "output"
    with pytest.raises(ValueError, match="SHA-256"):
        module.export(source, output)
    assert not output.exists()


@pytest.mark.parametrize("timestamp", ["2026-11-06T12:00:00", "2026-11-06T12:00:00+03:00"])
def test_non_utc_timestamp_is_rejected_before_output_creation(tmp_path, timestamp):
    output = tmp_path / "output"
    with pytest.raises(ValueError, match="UTC"):
        module.export(tmp_path / "unused", output, timestamp)
    assert not output.exists()
