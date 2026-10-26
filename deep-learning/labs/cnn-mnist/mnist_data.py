"""Verified MNIST IDX data and deterministic, stratified validation splits.

Mirror and reference MD5 identifiers are the ones published by torchvision:
https://github.com/pytorch/vision/blob/main/torchvision/datasets/mnist.py
Original dataset: http://yann.lecun.com/exdb/mnist/
No torchvision dependency is needed to read the original IDX representation.
"""

import gzip
import hashlib
import json
import random
import struct
import tempfile
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

BASE = "https://ossci-datasets.s3.amazonaws.com/mnist/"
RESOURCES = {
    "train-images-idx3-ubyte.gz": "f68b3c2dcbeaaa9fbdd348bbdeb94873",
    "train-labels-idx1-ubyte.gz": "d53e105ee54ea40749a09fcbcd1e9432",
    "t10k-images-idx3-ubyte.gz": "9fb629c4189551a2d022fa330f9573f3",
    "t10k-labels-idx1-ubyte.gz": "ec29112dd5afa0611ce80d1b7f02629c",
}


def utc_now():
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def verify_data(directory, download=False):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    provenance_path = directory / "sources.json"
    previous = (
        json.loads(provenance_path.read_text()) if provenance_path.exists() else {}
    )
    records = {}
    for filename, expected in RESOURCES.items():
        target = directory / filename
        retrieved = None
        if not target.exists():
            if not download:
                raise FileNotFoundError(f"Missing {target}; add --download once")
            temporary = None
            try:
                with tempfile.NamedTemporaryFile(
                    dir=directory, prefix="mnist-", suffix=".partial", delete=False
                ) as stream:
                    temporary = Path(stream.name)
                    with urllib.request.urlopen(
                        BASE + filename, timeout=60
                    ) as response:
                        total = 0
                        while chunk := response.read(1024 * 1024):
                            total += len(chunk)
                            if total > 64 * 1024 * 1024:
                                raise ValueError("Unexpected dataset download size")
                            stream.write(chunk)
                payload = temporary.read_bytes()
                if hashlib.md5(payload).hexdigest() != expected:
                    raise ValueError(f"Reference checksum mismatch: {filename}")
                if target.exists():
                    raise FileExistsError(f"Another download created {target}")
                temporary.rename(target)
                retrieved = utc_now()
            finally:
                if temporary and temporary.exists():
                    temporary.unlink()
        payload = target.read_bytes()
        if hashlib.md5(payload).hexdigest() != expected:
            raise ValueError(
                f"Cached dataset checksum mismatch: {target}; preserve it for inspection"
            )
        sha256 = hashlib.sha256(payload).hexdigest()
        old = previous.get(filename, {})
        records[filename] = {
            "url": BASE + filename,
            "reference_md5": expected,
            "sha256": sha256,
            "bytes": len(payload),
            "retrieved_at_utc": retrieved
            or (old.get("retrieved_at_utc") if old.get("sha256") == sha256 else None),
            "verified_at_utc": utc_now(),
        }
    provenance_path.write_text(json.dumps(records, indent=2) + "\n")
    return records


def read_idx(path, images):
    payload = gzip.decompress(Path(path).read_bytes())
    header_size = 16 if images else 8
    if len(payload) < header_size:
        raise ValueError("Truncated IDX header")
    header = struct.unpack(">4I" if images else ">2I", payload[:header_size])
    magic, count = header[:2]
    if count == 0 or magic != (2051 if images else 2049):
        raise ValueError("Invalid IDX identity or count")
    if images and header[2:] != (28, 28):
        raise ValueError("Expected 28 by 28 MNIST images")
    data = payload[header_size:]
    if len(data) != count * (784 if images else 1):
        raise ValueError("IDX payload length does not match its header")
    if not images and any(label > 9 for label in data):
        raise ValueError("MNIST labels must be digits zero to nine")
    return count, data


def stratified_split(labels, seed, smoke=False):
    """Split only the official training pool; never accept the test pool here."""
    if set(labels) != set(range(10)):
        raise ValueError("All ten classes must be present")
    rng = random.Random(seed)
    train, validation = [], []
    for label in range(10):
        group = [i for i, value in enumerate(labels) if value == label]
        rng.shuffle(group)
        count = max(1, len(group) // 10)
        if len(group) <= count:
            raise ValueError(
                "Every class needs both training and validation observations"
            )
        validation.extend(group[:count][:16] if smoke else group[:count])
        train.extend(group[count:][:64] if smoke else group[count:])
    rng.shuffle(train)
    rng.shuffle(validation)
    return train, validation


def selected_test_indices(labels, seed, smoke=False):
    if not smoke:
        return list(range(len(labels)))
    rng = random.Random(seed)
    selected = []
    for label in range(10):
        group = [i for i, value in enumerate(labels) if value == label]
        rng.shuffle(group)
        selected.extend(group[:32])
    rng.shuffle(selected)
    return selected


def indices_digest(indices):
    return hashlib.sha256(
        json.dumps(indices, separators=(",", ":")).encode()
    ).hexdigest()
