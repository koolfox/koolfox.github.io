"""Validate the offline parser against synthetic wwPDB XML, not the network."""

import gzip
import importlib.util
from pathlib import Path

import pytest

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "inspect_3wd5_validation", PROJECT / "scripts/inspect_3wd5_validation.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def write_report(path, entry="3WD5", duplicate=False):
    residue = '<ModelledSubgroup model="1" chain="A" resnum="69" resname="CYS" rscc="0.841" />'
    xml = (
        f'<report><Entry pdbid="{entry}" />{residue}'
        '<ModelledSubgroup model="1" chain="A" resnum="101" resname="CYS" rama="OUTLIER" />'
        f"{residue if duplicate else ''}</report>"
    )
    path.write_bytes(gzip.compress(xml.encode()))


def test_reads_only_the_specified_residues(tmp_path):
    report = tmp_path / "validation.xml.gz"
    write_report(report)
    data = module.inspect(report)
    assert data["residues"]["69"]["rscc"] == "0.841"
    assert data["residues"]["101"]["rama"] == "OUTLIER"
    assert len(data["input_sha256"]) == 64


@pytest.mark.parametrize("entry,duplicate", [("7TA3", False), ("3WD5", True)])
def test_rejects_wrong_entry_and_ambiguous_residue(tmp_path, entry, duplicate):
    report = tmp_path / "validation.xml.gz"
    write_report(report, entry, duplicate)
    with pytest.raises(ValueError):
        module.inspect(report)
