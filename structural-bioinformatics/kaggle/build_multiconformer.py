"""Package independent, bounded sequence probes for a private Kaggle CPU run."""

import base64
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
SOURCE = ROOT / "assets/tnf-peptide/7ta3.pdb"
SOURCE_HASH = "3c90d11838c88ebb5501319b367c6ac89e16c67c9a84aa22d17d5a4708052de4"
SEEDS = (42, 43, 44, 45)


def build(destination):
    pdb = SOURCE.read_bytes()
    if hashlib.sha256(pdb).hexdigest() != SOURCE_HASH:
        raise ValueError("reference hash mismatch")
    probe = (HERE / "sequence_probe.py").read_text()
    changes = {
        'out = Path("/kaggle/working/sequence-probe")': "out = Path(sys.argv[1])",
        "params.randomSeed = 42": "params.randomSeed = int(sys.argv[2])",
        "maxIters=200": "maxIters=1000",
        (
            '"A single conformer cannot establish sampling quality or binding",'
        ): '"Finite seed sampling cannot establish convergence or binding",',
    }
    for old, new in changes.items():
        if probe.count(old) != 1:
            raise ValueError(f"unexpected probe source: {old}")
        probe = probe.replace(old, new)
    coordinator = (HERE / "multiconformer_runner.py").read_text()
    script = (
        "import base64\nfrom pathlib import Path\n"
        f"Path('/kaggle/working/reference.pdb').write_bytes(base64.b64decode({base64.b64encode(pdb).decode()!r}))\n"
        f"Path('/kaggle/working/probe.py').write_text({probe!r})\n" + coordinator
    )
    dest = Path(destination)
    dest.mkdir(parents=True, exist_ok=False)
    (dest / "experiment.py").write_text(script)
    metadata = {
        "id": "lakookoo/bioops-7ta3-multiconformer",
        "title": "Bioops 7TA3 multiconformer feasibility",
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
