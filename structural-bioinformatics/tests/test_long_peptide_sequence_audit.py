"""Independent sequence-to-experiment comparison for the retained 7TA3 run."""

import importlib.util
import json
import math
import re
from pathlib import Path

import pytest

PROJECT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "sequence_audit", PROJECT / "scripts/long_peptide_sequence_audit.py"
)
audit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit)
ROOT = PROJECT / "assets/long-peptide-pilot/7ta3-sequence-control"
RUN = ROOT / "run-20261106"


def test_retained_results_and_independent_ca_rmsd():
    report = json.loads((ROOT / "independent-audit.json").read_text())
    pose_path = RUN / "GWRIGEAGTDPNL/poses.pdbqt"
    receptor = RUN / "receptor.pdbqt"
    assert report["source_sha256"] == audit.sha(audit.SOURCE)
    assert report["receptor_sha256"] == audit.sha(receptor)
    assert report["poses_sha256"] == audit.sha(pose_path)
    assert report["audit_script_sha256"] == audit.sha(Path(audit.__file__))
    assert report["poses"] == audit.audit(
        audit.SOURCE.read_text(), receptor.read_text(), pose_path.read_text()
    )
    native = audit.atom_map(audit.SOURCE.read_text(), native=True)
    blocks = re.findall(r"^MODEL\s+\d+\s*$(.*?)^ENDMDL\s*$", pose_path.read_text(), re.M | re.S)
    for block, result in zip(blocks, report["poses"], strict=True):
        pose = audit.atom_map(block)
        squared = [
            sum((x - y) ** 2 for x, y in zip(native[k], pose[k], strict=True)) for k in native
        ]
        assert math.isclose(
            math.sqrt(sum(squared) / len(squared)),
            result["fixed_frame_rmsd_angstrom"],
            abs_tol=1e-12,
        )
        assert result["matched_native_heavy_atoms"] == 97
        assert result["fixed_frame_rmsd_angstrom"] > 2
    original = json.loads((RUN / "report.json").read_text())
    for observed, row in zip(original["candidates"][0]["poses"], report["poses"], strict=True):
        assert math.isclose(
            observed["minimum_heavy_atom_distance_angstrom"],
            row["geometry"]["minimum_angstrom"],
            abs_tol=1e-12,
        )
        assert (
            observed["heavy_atom_pairs_below_2_angstrom"]
            == row["geometry"]["pairs_below_2_angstrom"]
        )


def test_missing_native_atom_is_rejected():
    pose_path = RUN / "GWRIGEAGTDPNL/poses.pdbqt"
    lines = pose_path.read_text().splitlines()
    index = next(
        i
        for i, line in enumerate(lines)
        if line.startswith("ATOM  ") and line[12:16].strip() == "CA"
    )
    del lines[index]
    with pytest.raises(ValueError, match="atom identities"):
        audit.audit(
            audit.SOURCE.read_text(), (RUN / "receptor.pdbqt").read_text(), "\n".join(lines)
        )
