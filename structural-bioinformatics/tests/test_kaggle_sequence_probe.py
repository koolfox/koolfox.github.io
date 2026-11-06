"""Packaging checks; scientific calculation runs only on Kaggle."""

import importlib.util
import json
from pathlib import Path

import pytest

PROJECT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "sequence_builder", PROJECT / "kaggle/build_sequence_probe.py"
)
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


def test_package_is_private_bounded_and_reproducible(tmp_path):
    first, second = tmp_path / "one", tmp_path / "two"
    builder.build(first)
    builder.build(second)
    metadata = json.loads((first / "kernel-metadata.json").read_text())
    assert metadata["is_private"] and not metadata["enable_gpu"]
    assert metadata["enable_internet"]
    assert not metadata["dataset_sources"] and not metadata["kernel_sources"]
    source = (first / "experiment.py").read_text()
    assert source == (second / "experiment.py").read_text()
    assert len(source) < 1_000_000
    compile(source, "experiment.py", "exec")
    assert source.index('report["stage"] = "embed"') < source.index(
        'pdb = Path("/kaggle/working/reference.pdb")'
    )


def test_modified_reference_rejected(tmp_path, monkeypatch):
    source = tmp_path / "bad.pdb"
    source.write_text("modified")
    monkeypatch.setattr(builder, "SOURCE", source)
    with pytest.raises(ValueError, match="reference hash mismatch"):
        builder.build(tmp_path / "output")
    assert not (tmp_path / "output").exists()
