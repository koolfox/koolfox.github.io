"""Offline package and failure-contract checks; no molecular computation locally."""

import importlib.util
import json
from pathlib import Path

import pytest

PROJECT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "multibuilder", PROJECT / "kaggle/build_multiconformer.py"
)
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


def test_package_contract(tmp_path):
    first, second = tmp_path / "one", tmp_path / "two"
    builder.build(first)
    builder.build(second)
    metadata = json.loads((first / "kernel-metadata.json").read_text())
    assert metadata["is_private"] and not metadata["enable_gpu"]
    assert metadata["enable_internet"] and not metadata["dataset_sources"]
    source = (first / "experiment.py").read_text()
    assert source == (second / "experiment.py").read_text()
    assert len(source) < 1_000_000
    compile(source, "experiment.py", "exec")
    assert "minimization_not_converged" in source
    assert "process_timeout" in source
    assert "maxIters=1000" in source
    assert builder.SEEDS == (42, 43, 44, 45)


def test_rejects_changed_reference(tmp_path, monkeypatch):
    source = tmp_path / "bad.pdb"
    source.write_text("modified")
    monkeypatch.setattr(builder, "SOURCE", source)
    with pytest.raises(ValueError, match="reference hash mismatch"):
        builder.build(tmp_path / "output")
    assert not (tmp_path / "output").exists()
