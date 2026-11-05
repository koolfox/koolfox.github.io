"""Use synthetic failure records with an authentic antibody-derived candidate library."""

import importlib.util
import json
import re
from pathlib import Path

import numpy as np
import pytest
from Bio import SeqIO

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "join_case_lineage", PROJECT / "scripts/join_case_lineage.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
PDB = PROJECT / "assets/3wd5.pdb"
CANDIDATES = PROJECT / "assets/peptide-ops-39-demo/candidates"
FASTA = CANDIDATES / "candidates.fasta"
MANIFEST = CANDIDATES / "manifest.json"


def make_synthetic_run(tmp_path):
    records = list(SeqIO.parse(str(FASTA), "fasta"))
    run = tmp_path / "run"
    run.mkdir()
    report = {
        "status": "completed_with_failures",
        "total": len(records),
        "target_pdb_sha256": "a" * 64,
        "input_fasta_sha256": module.digest(FASTA),
        "candidates": [
            {
                "index": i,
                "input_id": record.id,
                "sequence": str(record.seq),
                "status": "failed",
                "error": "synthetic test failure",
            }
            for i, record in enumerate(records, 1)
        ],
    }
    (run / "independent-candidates.json").write_text(json.dumps(report))
    cases = tmp_path / "base"
    module.exporter.export(run, cases)
    return run, cases


def test_real_antibody_library_links_to_synthetic_execution_cases(tmp_path):
    run, cases = make_synthetic_run(tmp_path)
    result = module.join(cases, run, PDB, FASTA, MANIFEST, tmp_path / "out")
    rows = [json.loads(line) for line in (tmp_path / "out/cases.jsonl").read_text().splitlines()]
    assert result["case_count"] == 39
    assert all(row["antibody_source_sha256"] == module.digest(PDB) for row in rows)
    assert all(row["antibody_seed"] == "VQ" for row in rows)
    assert all(row["lineage_status"] == "source_consistent" for row in rows)
    assert all(row["biological_binding_label"] is None for row in rows)


def test_cannot_attach_unrelated_candidate_library(tmp_path):
    run, cases = make_synthetic_run(tmp_path)
    wrong = PROJECT / "assets/independent-candidate-demo/input.fasta"
    with pytest.raises(ValueError, match="hash differs"):
        module.join(cases, run, PDB, wrong, MANIFEST, tmp_path / "out")
    assert not (tmp_path / "out").exists()


def test_cannot_change_unprocessed_count_in_base_manifest(tmp_path):
    run, cases = make_synthetic_run(tmp_path)
    path = cases / "manifest.json"
    manifest = json.loads(path.read_text())
    manifest["unprocessed_count"] = 100
    path.write_text(json.dumps(manifest))
    with pytest.raises(ValueError, match="manifest differs"):
        module.join(cases, run, PDB, FASTA, MANIFEST, tmp_path / "out")
    assert not (tmp_path / "out").exists()


def test_interrupted_run_joins_only_observed_cases_and_keeps_unprocessed_count(tmp_path):
    run, _cases = make_synthetic_run(tmp_path)
    path = run / "independent-candidates.json"
    report = json.loads(path.read_text())
    report["status"] = "interrupted"
    report["candidates"] = report["candidates"][:1]
    report["candidates"][0]["status"] = "interrupted"
    path.write_text(json.dumps(report))
    base = tmp_path / "interrupted-base"
    module.exporter.export(run, base)
    result = module.join(base, run, PDB, FASTA, MANIFEST, tmp_path / "out")
    assert result["case_count"] == 1 and result["unprocessed_count"] == 38
    row = json.loads((tmp_path / "out/cases.jsonl").read_text())
    assert row["execution_status"] == "interrupted"
    assert row["biological_binding_label"] is None


def test_published_real_run_recreates_joined_cases(tmp_path):
    root = PROJECT / "assets/lineage-example"
    joined = tmp_path / "joined"
    result = module.join(
        root / "base-cases",
        root / "run",
        PDB,
        root / "candidates/candidates.fasta",
        root / "candidates/manifest.json",
        joined,
    )
    recorded = root / "joined-cases"
    assert (joined / "cases.jsonl").read_bytes() == (recorded / "cases.jsonl").read_bytes()
    manifest = json.loads((recorded / "manifest.json").read_text())
    assert manifest["joiner_sha256"] == module.digest(PROJECT / "scripts/join_case_lineage.py")
    assert manifest["cases_sha256"] == result["cases_sha256"]
    rows = [json.loads(line) for line in (joined / "cases.jsonl").read_text().splitlines()]
    assert [row["candidate_sequence"] for row in rows] == ["VQLVESGG", "AQLVESGG"]
    assert [row["execution_status"] for row in rows] == ["failed", "failed"]
    assert all(row["biological_binding_label"] is None for row in rows)


def test_published_real_lineage_files_match_recorded_hashes():
    root = PROJECT / "assets/lineage-example"
    manifest = json.loads((root / "files-manifest.json").read_text())
    for name, expected in manifest["files"].items():
        assert module.digest(root / name) == expected


def test_real_lineage_docking_rejections_have_severe_clashes():
    root = PROJECT / "assets/lineage-example/run"

    def coordinates(text):
        return np.array(
            [
                [float(line[i : i + 8]) for i in (30, 38, 46)]
                for line in text.splitlines()
                if line.startswith(("ATOM  ", "HETATM")) and line.split()[-1] not in ("H", "HD")
            ]
        )

    for index, sequence in ((1, "VQLVESGG"), (2, "AQLVESGG")):
        folder = root / f"candidate-{index:06d}"
        report = json.loads((folder / "report.json").read_text())
        assert report["status"] == "failed" and "clash" in report["error"].lower()
        receptor = coordinates((folder / "receptor.pdbqt").read_text())
        text = (folder / sequence / "poses.pdbqt").read_text()
        blocks = re.findall(r"^MODEL\s+\d+\s*$(.*?)^ENDMDL\s*$", text, re.M | re.S)
        assert blocks
        minimum = np.linalg.norm(
            coordinates(blocks[0])[:, None, :] - receptor[None, :, :], axis=2
        ).min()
        assert minimum < 2.0
