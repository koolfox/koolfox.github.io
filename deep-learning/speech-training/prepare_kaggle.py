"""Make a private, offline Kaggle bundle containing only the preflight script."""

import argparse
import json
import re
import shutil
from pathlib import Path


def prepare(owner, output):
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]*", owner):
        raise ValueError("invalid Kaggle owner")
    output.mkdir(parents=True, exist_ok=False)
    source = Path(__file__).with_name("preflight.py")
    shutil.copyfile(source, output / "preflight.py")
    metadata = {
        "id": f"{owner}/deep-learning-persian-speech-preflight-v1",
        "title": "Deep Learning Persian Speech Preflight V1",
        "code_file": "preflight.py",
        "language": "python",
        "kernel_type": "script",
        "is_private": True,
        "enable_gpu": True,
        "enable_internet": False,
        "machine_shape": "NvidiaTeslaT4",
        "dataset_sources": [],
        "competition_sources": [],
        "kernel_sources": [],
        "model_sources": [],
    }
    (output / "kernel-metadata.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--owner", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    prepare(args.owner, args.output)
