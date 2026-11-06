"""Evidence checks for the source-specific 3WD5 TNF docking experiment."""

import hashlib
import json
from pathlib import Path

import pytest
from Bio.PDB import PDBParser

PROJECT = Path(__file__).resolve().parents[1]
RUN = PROJECT / "assets/3wd5-tnf-docking"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_source_receptor_and_pose_provenance():
    source = PROJECT / "assets/3wd5.pdb"
    report = json.loads((RUN / "report.json").read_text())
    assert digest(source) == report["input"]["source_sha256"]
    assert report["input"]["author_chain"] == "A"
    assert digest(RUN / "selected-chain.pdb") == report["selected_pdb_sha256"]
    assert digest(RUN / "receptor.pdbqt") == report["receptor_pdbqt_sha256"]
    assert digest(RUN / "AC/poses.pdbqt") == report["candidates"][0]["poses_sha256"]
    assert report["status"] == "requires_further_validation"
    assert len(report["candidates"][0]["poses"]) == 3
    parser = PDBParser(QUIET=True, PERMISSIVE=False)
    chain = parser.get_structure("source", source)[0]["A"]
    selected = parser.get_structure("selected", RUN / "selected-chain.pdb")[0]["A"]

    def atoms(c):
        return {
            (a.parent.id, a.name): tuple(a.coord) for a in c.get_atoms() if a.parent.id[0] == " "
        }

    assert atoms(chain) == atoms(selected)
    assert float(chain[69]["SG"] - chain[101]["SG"]) == pytest.approx(2.049, abs=0.002)
    assert float(chain[69]["SG"] - chain[101]["CB"]) == pytest.approx(1.750, abs=0.002)
    pdbqt = {}
    for line in (RUN / "receptor.pdbqt").read_text().splitlines():
        if line.startswith(("ATOM  ", "HETATM")) and line[76:].strip() not in ("H", "HD"):
            pdbqt[(int(line[22:26]), line[12:16].strip())] = tuple(
                float(line[i : i + 8]) for i in (30, 38, 46)
            )
    expected = {
        (a.parent.id[1], a.name): tuple(round(float(c), 3) for c in a.coord)
        for a in selected.get_atoms()
        if a.element not in ("H", "D")
    }
    # Meeko interchanges terminal oxygens; both deposited positions are retained.
    expected[(157, "O")], expected[(157, "OXT")] = expected[(157, "OXT")], expected[(157, "O")]
    assert pdbqt == expected


def test_correction_removes_only_the_extra_inferred_bond():
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "specific_run", PROJECT / "scripts/run_3wd5_tnf_docking.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    class Info:
        def __init__(self, name):
            self.name = name

        def GetName(self):
            return self.name

        def GetPDBResidueInfo(self):
            return self

    class Mol:
        def __init__(self, names):
            self.names = names

        def GetAtomWithIdx(self, index):
            return Info(self.names[index])

    molecules = {"A:69": (Mol(["SG"]),), "A:101": (Mol(["CB", "SG"]),)}
    key = ("A:69", "A:101")
    bonds = {key: [(0, 0), (0, 1)], ("A:1", "A:2"): [(1, 2)]}
    assert module.correct_bonds(molecules, bonds) == {
        key: [(0, 1)],
        ("A:1", "A:2"): [(1, 2)],
    }
    with pytest.raises(ValueError, match="Unexpected"):
        module.correct_bonds(molecules, {key: [(0, 0)]})
