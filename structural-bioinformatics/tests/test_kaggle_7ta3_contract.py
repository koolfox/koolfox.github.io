"""Offline checks for the private, bounded Kaggle package."""

import importlib.util
import json
from pathlib import Path

import pytest

PROJECT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("build_kernel", PROJECT / "kaggle/build_kernel.py")
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


def test_private_cpu_package_is_self_contained_and_deterministic(tmp_path):
    first, second = tmp_path / "first", tmp_path / "second"
    builder.build(first)
    builder.build(second)
    metadata = json.loads((first / "kernel-metadata.json").read_text())
    assert metadata["id"].startswith("lakookoo/")
    assert metadata["is_private"] is True and metadata["enable_gpu"] is False
    assert metadata["dataset_sources"] == metadata["kernel_sources"] == []
    assert (first / "experiment.py").read_bytes() == (second / "experiment.py").read_bytes()
    compile((first / "experiment.py").read_text(), "experiment.py", "exec")
    assert (first / "experiment.py").stat().st_size < 500_000


def test_rejects_modified_public_input(tmp_path, monkeypatch):
    fake = tmp_path / "input"
    fake.mkdir()
    (fake / "file").write_bytes(b"modified")
    monkeypatch.setattr(builder, "PROJECT", fake)
    monkeypatch.setattr(builder, "INPUTS", {"file": "0" * 64})
    with pytest.raises(ValueError, match="input hash mismatch"):
        builder.build(tmp_path / "package")
    assert not (tmp_path / "package").exists()
