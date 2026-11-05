"""Use synthetic failure records with an authentic antibody-derived candidate library."""

import importlib.util
import json
from pathlib import Path

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
