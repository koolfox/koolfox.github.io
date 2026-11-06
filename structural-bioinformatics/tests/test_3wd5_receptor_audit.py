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


def test_diagnostic_input_preserves_protein_coordinates_and_failure():
    from Bio.PDB import PDBParser

    parser = PDBParser(QUIET=True, PERMISSIVE=False)
    source = parser.get_structure("source", str(PROJECT / "assets/3wd5.pdb"))
    folder = PROJECT / "assets/3wd5-receptor-diagnostic"
    selected = parser.get_structure("selected", str(folder / "3wd5-ahl-diagnostic.pdb"))
    for chain in "AHL":
        original = [a for r in source[0][chain] if r.id[0] == " " for a in r]
        copied = list(selected[0][chain].get_atoms())
        assert len(original) == len(copied)
        for first, second in zip(original, copied, strict=True):
            assert (first.parent.id, first.name, first.occupancy) == (
                second.parent.id,
                second.name,
                second.occupancy,
            )
            assert (first.coord == second.coord).all()
    assert (
        "No template matched for residue_key='A:101'"
        in (folder / "3wd5-ahl-diagnostic.stderr").read_text()
    )
    assert (
        "Creation of data structure for receptor failed"
        in (folder / "3wd5-ahl-diagnostic.stdout").read_text()
    )
