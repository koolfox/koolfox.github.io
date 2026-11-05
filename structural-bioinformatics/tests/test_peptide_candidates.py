"""Traceable sequence variants and input-budget boundaries."""

import hashlib
import json
import subprocess
import sys

import pytest

from peptide_lab.candidates import variants


def test_single_substitution_library_and_budget():
    rows = variants("AR", [1], "ACDE", True, 4)
    assert [(r["sequence"], r["change"]) for r in rows] == [
        ("AR", "reference"),
        ("CR", "A1C"),
        ("DR", "A1D"),
        ("ER", "A1E"),
    ]
    with pytest.raises(ValueError, match="budget"):
        variants("AR", [1], "ACDE", True, 3)
    with pytest.raises(ValueError, match="Positions"):
        variants("AR", [3], "ACDE", True, 4)


def test_user_fasta_region_and_provenance(tmp_path):
    source = tmp_path / "drug.fasta"
    source.write_text(">drug\nGGARWW\n")
    output = tmp_path / "candidates"
    args = [
        sys.executable,
        "-m",
        "peptide_lab.candidates",
        "--fasta",
        str(source),
        "--record-id",
        "drug",
        "--start",
        "3",
        "--end",
        "4",
        "--position",
        "1",
        "--alphabet",
        "ACDE",
        "--include-seed",
        "--max-sequences",
        "4",
        "--output-dir",
        str(output),
    ]
    subprocess.run(args, check=True, capture_output=True, text=True)
    manifest = json.loads((output / "manifest.json").read_text())
    assert manifest["seed"] == "AR"
    assert manifest["source_record"] == {"id": "drug", "start": 3, "end": 4}
    assert manifest["source_fasta_sha256"] == hashlib.sha256(source.read_bytes()).hexdigest()
    assert (
        manifest["fasta_sha256"]
        == hashlib.sha256((output / "candidates.fasta").read_bytes()).hexdigest()
    )
    assert subprocess.run(args, capture_output=True, text=True).returncode != 0


def test_reference_antibody_pdb_region_has_author_provenance(tmp_path):
    from pathlib import Path

    project = Path(__file__).resolve().parents[1]
    pdb = project / "assets/3wd5.pdb"
    output = tmp_path / "variants"
    args = [
        sys.executable,
        "-m",
        "peptide_lab.candidates",
        "--drug-pdb",
        str(pdb),
        "--drug-chain",
        "H",
        "--start",
        "2",
        "--end",
        "3",
        "--position",
        "1",
        "--alphabet",
        "ACDE",
        "--include-seed",
        "--max-sequences",
        "5",
        "--output-dir",
        str(output),
    ]
    subprocess.run(args, check=True, capture_output=True, text=True)
    manifest = json.loads((output / "manifest.json").read_text())
    assert manifest["source_pdb_sha256"] == hashlib.sha256(pdb.read_bytes()).hexdigest()
    assert manifest["source_record"]["author_chain"] == "H"
    assert len(manifest["source_record"]["author_residue_numbers"]) == 2
    assert 4 <= len(manifest["candidates"]) <= 5


def test_recorded_reference_variants_link_to_docking_output():
    from pathlib import Path

    project = Path(__file__).resolve().parents[1]
    root = project / "assets/antibody-variant-demo"
    manifest = json.loads((root / "manifest.json").read_text())
    report = json.loads((project / "data/processed/antibody-variant-demo.json").read_text())
    assert (
        manifest["generator_sha256"]
        == hashlib.sha256(
            (project / "tests/fixtures/docking-provenance-20261104/candidates.py").read_bytes()
        ).hexdigest()
    )
    assert (
        manifest["source_pdb_sha256"]
        == hashlib.sha256((project / "assets/3wd5.pdb").read_bytes()).hexdigest()
    )
    assert (
        manifest["fasta_sha256"]
        == report["fasta_sha256"]
        == hashlib.sha256((root / "candidates.fasta").read_bytes()).hexdigest()
    )
    assert [(r["id"], r["sequence"]) for r in manifest["candidates"]] == [
        (r["input_id"], r["sequence"]) for r in report["candidates"]
    ]
    for row in report["candidates"]:
        assert (
            row["poses_sha256"]
            == hashlib.sha256((root / row["sequence"] / "poses.pdbqt").read_bytes()).hexdigest()
        )


def test_variant_budget_can_exceed_one_docking_batch():
    rows = variants("AR", [1, 2], "ACDEFGHIKLMNPQRSTVWY", True, 40)
    assert len(rows) == 39
    assert len({r["sequence"] for r in rows}) == 39
