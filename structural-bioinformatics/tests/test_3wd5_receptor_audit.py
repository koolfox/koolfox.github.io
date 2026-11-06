"""Audit the deposited inputs, not the validity of a reconstructed model."""

import importlib.util
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "audit_3wd5", PROJECT / "scripts/audit_3wd5_receptor.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_deposited_geometry_and_unobserved_atoms():
    report = module.audit(PROJECT / "assets/3wd5.pdb")
    assert (
        report["source_sha256"]
        == "fae6eee1b06b8cba0a466280dbc32563efaa54ec639afd921cb610d17debd216"
    )
    assert [len(report["zero_occupancy_atoms"][chain]) for chain in "AHL"] == [0, 12, 18]
    pair = report["deposited_ssbond_pairs"][0]
    assert pair["residues"] == [69, 101]
    assert pair["sg_sg_angstrom"] == 2.049
    assert pair["first_sg_second_cb_angstrom"] == 1.75
    assert pair["first_sg_second_cb_angstrom"] < report["meeko_0_8_0_carbon_sulfur_cutoff_angstrom"]
    assert report["status"] == "not_prepared"
