"""Download pinned validation artifacts into ignored storage, never into Git.

Downloads resume by verified byte ranges. A complete SHA-256 check is mandatory
before a partial file becomes usable. Run explicitly; never imported by slides.
"""

import hashlib
import json
import os
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "results/model-validation/cache"
BERT_REV = "86b5e0934494bd15c9632b12f734a8a67f723594"
ONNX_REV = "c5cae0f1942c8d7727372c7b1f6b485aa39e4421"
ARTIFACTS = [
    {
        "file": "resnet152-v1-7.tar.gz",
        "url": f"https://media.githubusercontent.com/media/onnx/models/{ONNX_REV}/validated/vision/classification/resnet/model/resnet152-v1-7.tar.gz",
        "sha256": "470ccde11c3ee2b490c214e48459c03e5b4118e8143f83dd795263efcf794cf3",
        "size": 226450954,
    },
    {
        "file": "bert/model.onnx",
        "url": f"https://huggingface.co/google-bert/bert-base-uncased/resolve/{BERT_REV}/model.onnx",
        "sha256": "44d7a2896d341c51fb1eba89aea3a590e6af0ce33e25481136f7eeecb62e5f7f",
        "size": 532091246,
    },
    {
        "file": "bert/model.safetensors",
        "url": f"https://huggingface.co/google-bert/bert-base-uncased/resolve/{BERT_REV}/model.safetensors",
        "sha256": "68d45e234eb4a928074dfd868cead0219ab85354cc53d20e772753c6bb9169d3",
        "size": 440449768,
    },
]
SMALL = [
    (
        "config.json",
        570,
        "7160e1553ad2ca51d8c1cb066be533db31826e12d173824c1bb0cb1a4f187d20",
    ),
    (
        "tokenizer_config.json",
        48,
        "a025160ef0431f1a392f6f050c1310f4c5d9fb6f275932dbccba73c4d214bf10",
    ),
    (
        "tokenizer.json",
        466062,
        "ce64fce797c24f68df90b40a3f74f579b336a493db14bd583fd520ea0d8c9a98",
    ),
    (
        "vocab.txt",
        231508,
        "07eced375cec144d27c900241f3e339478dec958f92fddbc551f295c992038a3",
    ),
    (
        "LICENSE",
        11356,
        "43070e2d4e532684de521b885f385d0841030efa2b1a20bafb76133a5e1379c1",
    ),
]
ARTIFACTS += [
    {
        "file": "bert/" + name,
        "url": f"https://huggingface.co/google-bert/bert-base-uncased/resolve/{BERT_REV}/{name}",
        "size": size,
        "sha256": sha,
    }
    for name, size, sha in SMALL
]
ARTIFACTS += [
    {
        "file": "vit/model.safetensors",
        "url": "https://huggingface.co/google/vit-base-patch16-224/resolve/3f49326eb077187dfe1c2a2bb15fbd74e6ab91e3/model.safetensors",
        "size": 346293852,
        "sha256": "1cea07110a4a47edc51420b2dda6f3b8b58e7256e8f44b4ea6aa9696162ccb5d",
    },
    {
        "file": "vit/config.json",
        "url": "https://huggingface.co/google/vit-base-patch16-224/resolve/3f49326eb077187dfe1c2a2bb15fbd74e6ab91e3/config.json",
        "size": 69665,
        "sha256": "abdf73cc4ce79495a83f32a8c9265daa7a1363f5a3efa4704c88a6e7f45ad19d",
    },
    {
        "file": "vit/preprocessor_config.json",
        "url": "https://huggingface.co/google/vit-base-patch16-224/resolve/3f49326eb077187dfe1c2a2bb15fbd74e6ab91e3/preprocessor_config.json",
        "size": 160,
        "sha256": "90d1ae427c27d2b9dcb01f6a62ba96aa67aac2de1697c59cd212055b5035c4a2",
    },
    {
        "file": "vit/astronaut.png",
        "url": "https://raw.githubusercontent.com/scikit-image/scikit-image/e8a42ba85aaf5fd9322ef9ca51bc21063b22fcae/skimage/data/astronaut.png",
        "size": 791555,
        "sha256": "88431cd9653ccd539741b555fb0a46b61558b301d4110412b5bc28b5e3ea6cb5",
    },
]
ARTIFACTS += [
    {
        "file": "clip/pytorch_model.bin",
        "url": "https://huggingface.co/openai/clip-vit-base-patch32/resolve/3d74acf9a28c67741b2f4f2ea7635f0aaf6f0268/pytorch_model.bin",
        "size": 605247071,
        "sha256": "a63082132ba4f97a80bea76823f544493bffa8082296d62d71581a4feff1576f",
    },
    {
        "file": "clip/config.json",
        "url": "https://huggingface.co/openai/clip-vit-base-patch32/resolve/3d74acf9a28c67741b2f4f2ea7635f0aaf6f0268/config.json",
        "size": 4186,
        "sha256": "b575ef3c36f2a057fa19e221650105052d61cc9c1a972ec15019c6261ec98770",
    },
    {
        "file": "clip/preprocessor_config.json",
        "url": "https://huggingface.co/openai/clip-vit-base-patch32/resolve/3d74acf9a28c67741b2f4f2ea7635f0aaf6f0268/preprocessor_config.json",
        "size": 316,
        "sha256": "910e70b3956ac9879ebc90b22fb3bc8a75b6a0677814500101a4c072bd7857bd",
    },
    {
        "file": "clip/tokenizer.json",
        "url": "https://huggingface.co/openai/clip-vit-base-patch32/resolve/3d74acf9a28c67741b2f4f2ea7635f0aaf6f0268/tokenizer.json",
        "size": 2224041,
        "sha256": "b556ac8c99757ffb677208af34bc8c6721572114111a6e0aaf5fa69ff0b8d842",
    },
    {
        "file": "clip/tokenizer_config.json",
        "url": "https://huggingface.co/openai/clip-vit-base-patch32/resolve/3d74acf9a28c67741b2f4f2ea7635f0aaf6f0268/tokenizer_config.json",
        "size": 592,
        "sha256": "34b7336e4bee12e0a9730eaf5189f582ef3c3eea5027f65730e5717256755aad",
    },
    {
        "file": "clip/special_tokens_map.json",
        "url": "https://huggingface.co/openai/clip-vit-base-patch32/resolve/3d74acf9a28c67741b2f4f2ea7635f0aaf6f0268/special_tokens_map.json",
        "size": 389,
        "sha256": "f8c0d6c39aee3f8431078ef6646567b0aba7f2246e9c54b8b99d55c22b707cbf",
    },
    {
        "file": "clip/README.md",
        "url": "https://huggingface.co/openai/clip-vit-base-patch32/resolve/3d74acf9a28c67741b2f4f2ea7635f0aaf6f0268/README.md",
        "size": 7942,
        "sha256": "8f0e8c678e0afe5f384f3bf8a6694c1cb53c41e52f86277967b6c5354cb0f9f4",
    },
    {
        "file": "clip/radford21a.pdf",
        "url": "https://proceedings.mlr.press/v139/radford21a/radford21a.pdf",
        "size": 3526772,
        "sha256": "2a4952960f350e50a3a4a847371b80b8aaa09ba82d1c2a8f6b30450e392a1fe4",
    },
]
BLOCK = 4 * 1024 * 1024


def digest(path):
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def fetch(item):
    path = CACHE / item["file"]
    path.parent.mkdir(parents=True, exist_ok=True)
    if (
        path.exists()
        and path.stat().st_size == item["size"]
        and digest(path) == item["sha256"]
    ):
        return {**item, "cached": True}
    temporary = path.with_suffix(path.suffix + ".part")
    state_path = path.with_suffix(path.suffix + ".ranges.json")
    # Old serial partial downloads have a contiguous prefix; the range writer
    # preallocates the remaining file, so its length is never progress evidence.
    state = (
        json.loads(state_path.read_text())
        if state_path.exists()
        else {
            "prefix": temporary.stat().st_size if temporary.exists() else 0,
            "ranges": [],
        }
    )
    if state["prefix"] > item["size"]:
        raise ValueError("Partial file is larger than the pinned artifact")
    state_path.write_text(json.dumps(state))
    descriptor = os.open(temporary, os.O_RDWR | os.O_CREAT)
    os.ftruncate(descriptor, item["size"])

    def chunk(bounds):
        start, end = bounds
        for attempt in range(4):
            try:
                url = (
                    item["url"]
                    + ("&" if "?" in item["url"] else "?")
                    + f"range_start={start}"
                )
                request = urllib.request.Request(
                    url,
                    headers={
                        "User-Agent": "DannaSourceModelValidation/1.0",
                        "Range": f"bytes={start}-{end - 1}",
                    },
                )
                with urllib.request.urlopen(request, timeout=120) as response:
                    data = response.read()
                    if (
                        (
                            response.status != 206
                            and not (
                                response.status == 200
                                and start == 0
                                and end == item["size"]
                            )
                        )
                        or len(data) != end - start
                        or (
                            response.status == 206
                            and not response.headers.get(
                                "Content-Range", ""
                            ).startswith(f"bytes {start}-")
                        )
                    ):
                        raise ValueError(
                            "The server did not return the requested byte range"
                        )
                os.pwrite(descriptor, data, start)
                return [start, end]
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(attempt + 1)

    ranges = [
        (start, min(start + BLOCK, item["size"]))
        for start in range(state["prefix"], item["size"], BLOCK)
    ]
    ranges = [bounds for bounds in ranges if list(bounds) not in state["ranges"]]
    try:
        with ThreadPoolExecutor(max_workers=12) as pool:
            for future in as_completed(
                [pool.submit(chunk, bounds) for bounds in ranges]
            ):
                state["ranges"].append(future.result())
                state_path.write_text(json.dumps(state))
                print(
                    item["file"],
                    state["prefix"]
                    + sum(end - start for start, end in state["ranges"]),
                    "/",
                    item["size"],
                    flush=True,
                )
    finally:
        os.close(descriptor)
    if digest(temporary) != item["sha256"]:
        temporary.unlink(missing_ok=True)
        state_path.unlink(missing_ok=True)
        raise ValueError("Artifact checksum mismatch: " + item["file"])
    temporary.replace(path)
    state_path.unlink(missing_ok=True)
    return {**item, "retrieved_utc": datetime.now(UTC).isoformat()}


if __name__ == "__main__":
    CACHE.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(fetch, ARTIFACTS))
    (CACHE.parent / "artifact-retrieval.json").write_text(
        json.dumps(results, indent=2) + "\n"
    )
