"""Generate an authentic, balanced browser subset from verified training IDX.

No official test file is opened. Selection is disjoint at image level, not a
claim of writer-disjoint validation. Raw source files remain ignored.
"""

from datetime import datetime, timezone
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import random
import struct

ROOT = Path(__file__).resolve().parents[1]


def generate(raw, output):
    sources = json.loads((ROOT / "labs/cnn-mnist/data-sources.json").read_text())[
        "sources"
    ]
    arrays, evidence = {}, {}
    retrieval_path = raw / "retrieval.json"
    retrieval = (
        {item["file"]: item for item in json.loads(retrieval_path.read_text())}
        if retrieval_path.exists()
        else {}
    )
    for name in ["train-images-idx3-ubyte.gz", "train-labels-idx1-ubyte.gz"]:
        data = (raw / name).read_bytes()
        assert hashlib.sha256(data).hexdigest() == sources[name]["sha256"]
        arrays[name] = gzip.decompress(data)
        evidence[name] = {
            **sources[name],
            "retrieved_at_utc": retrieval.get(name, {}).get("retrieved_utc"),
            "verified_at_utc": datetime.now(timezone.utc).isoformat(),
        }
    images, labels = arrays.values()
    assert struct.unpack(">4I", images[:16]) == (2051, 60000, 28, 28)
    assert struct.unpack(">2I", labels[:8]) == (2049, 60000)
    images, labels = images[16:], labels[8:]
    assert len(images) == 60000 * 784 and len(labels) == 60000
    rng = random.Random(7)
    train, validation = [], []
    for digit in range(10):
        indices = [i for i, value in enumerate(labels) if value == digit]
        rng.shuffle(indices)
        train.extend(indices[:200])
        validation.extend(indices[200:250])
    train.sort()
    validation.sort()
    assert len(set(train)) == 2000 and len(set(validation)) == 500
    assert not set(train).intersection(validation)
    order = train + validation
    output.mkdir(parents=True, exist_ok=True)
    artifacts = {}
    for name, payload in [
        ("pixels.bin", b"".join(images[i * 784 : (i + 1) * 784] for i in order)),
        ("labels.bin", bytes(labels[i] for i in order)),
    ]:
        (output / name).write_bytes(payload)
        artifacts[name] = {
            "bytes": len(payload),
            "sha256": hashlib.sha256(payload).hexdigest(),
        }
    manifest = {
        "schema_version": 1,
        "dataset": "MNIST",
        "authors": ["Yann LeCun", "Corinna Cortes", "Christopher J.C. Burges"],
        "source_partition": "official training pool only (60000)",
        "official_test_used": False,
        "source_artifacts": evidence,
        "selection": {
            "algorithm": "Python random.Random(7); shuffle each class; first200 train, next50 validation; sort each split",
            "seed": 7,
            "train_indices": train,
            "validation_indices": validation,
            "train_per_class": 200,
            "validation_per_class": 50,
        },
        "train_count": 2000,
        "validation_count": 500,
        "shape": [28, 28, 1],
        "preprocessing": "uint8 grayscale divided by255 tofloat32; NHWC; labels0..9",
        "artifacts": artifacts,
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "license_evidence": {
            "publisher": "ylecun/mnist dataset card",
            "declared_license": "MIT",
            "url": "https://huggingface.co/datasets/ylecun/mnist/raw/77f3279092a1c1579b2250db8eafed0ad422088c/README.md",
            "revision": "77f3279092a1c1579b2250db8eafed0ad422088c",
            "sha256": "8cd17b7ebe5c115eb401f2ce57f9b3c8b16a6e293dc312c35e4f37f7a81fc4a2",
            "original_homepage": "http://yann.lecun.com/exdb/mnist/",
        },
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=ROOT / "results/mnist-browser/raw")
    parser.add_argument(
        "--output", type=Path, default=ROOT / "data/processed/mnist-browser"
    )
    args = parser.parse_args()
    print(generate(args.raw, args.output)["artifacts"])
