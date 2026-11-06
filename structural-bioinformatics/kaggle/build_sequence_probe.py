"""Build a small private CPU-only Kaggle feasibility probe."""

import base64
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/tnf-peptide/7ta3.pdb"
SOURCE_HASH = "3c90d11838c88ebb5501319b367c6ac89e16c67c9a84aa22d17d5a4708052de4"


def build(destination):
    pdb = SOURCE.read_bytes()
    if hashlib.sha256(pdb).hexdigest() != SOURCE_HASH:
        raise ValueError("reference hash mismatch")
    script = (Path(__file__).parent / "sequence_probe.py").read_text()
    prefix = (
        "import base64\nfrom pathlib import Path\n"
        "Path('/kaggle/working/reference.pdb').write_bytes(base64.b64decode("
        + repr(base64.b64encode(pdb).decode())
        + "))\n"
    )
    dest = Path(destination)
    dest.mkdir(parents=True, exist_ok=False)
    (dest / "experiment.py").write_text(prefix + script)
    metadata = {
        "id": "lakookoo/bioops-7ta3-sequence-feasibility",
        "title": "Bioops 7TA3 sequence feasibility",
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
    (dest / "kernel-metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")


if __name__ == "__main__":
    import sys

    build(sys.argv[1])
