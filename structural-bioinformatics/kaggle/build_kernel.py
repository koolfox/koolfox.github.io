"""Build a self-contained Kaggle script from four public, hash-pinned inputs."""

import base64
import hashlib
import json
import zlib
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
INPUTS = {
    "assets/tnf-peptide/7ta3.pdb": (
        "3c90d11838c88ebb5501319b367c6ac89e16c67c9a84aa22d17d5a4708052de4"
    ),
    "assets/tnf-peptide/receptor.pdbqt": (
        "ef6112549c988297f3911490d9a5466cfcb9fbce65c262608f1b4963e7785e06"
    ),
    "assets/tnf-peptide/reference.pdbqt": (
        "5cd3024fd227adcd1309a51faef8eedcb878de407dc5a76ea4b05251ad6d437e"
    ),
    "scripts/long_peptide_7ta3_control.py": (
        "ab2babb9d35b821f557952577279dbe482780b9ded9653721bd6f49696c4843b"
    ),
}


def build(destination):
    payload = {}
    for name, expected in INPUTS.items():
        data = (PROJECT / name).read_bytes()
        if hashlib.sha256(data).hexdigest() != expected:
            raise ValueError(f"input hash mismatch: {name}")
        payload[name] = base64.b64encode(zlib.compress(data, 9)).decode("ascii")
    template = (Path(__file__).parent / "kernel_template.py").read_text()
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=False)
    (destination / "experiment.py").write_text("PAYLOAD = " + repr(payload) + "\n" + template)
    metadata = {
        "id": "lakookoo/bioops-7ta3-private-control",
        "title": "Bioops 7TA3 private control",
        "code_file": "experiment.py",
        "language": "python",
        "kernel_type": "script",
        "is_private": True,
        "enable_gpu": False,
        "enable_internet": True,
        "dataset_sources": [],
        "competition_sources": [],
        "kernel_sources": [],
    }
    (destination / "kernel-metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")


if __name__ == "__main__":
    import sys

    build(sys.argv[1])
