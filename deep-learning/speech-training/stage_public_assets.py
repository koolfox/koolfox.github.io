"""Stage pinned public speech assets without executing any downloaded code."""

import hashlib
import json
import shutil
import urllib.request
from pathlib import Path


MODEL_REVISION = "bcca4112db62fccaf733772226d4f9931a088a0a"
UPSTREAM_REVISION = "07e40f5d0b03fc473635ef378654bfb581027ac3"
DATA_REVISION = "698f7f7bfe7a8fc665e9c4c0ca9eea7e0d49f64f"
MODEL = f"https://huggingface.co/ArminRahimi/Audio8-TTS-Persian/resolve/{MODEL_REVISION}/"
UPSTREAM = f"https://raw.githubusercontent.com/Edge0-AI/Audio8_TTS/{UPSTREAM_REVISION}/"
DATA = f"https://huggingface.co/datasets/MahtaFetrat/Mana-TTS/resolve/{DATA_REVISION}/dataset/"
ASSETS = {
    "model/configuration_arktts.py": (MODEL + "configuration_arktts.py", "27fa4fd4073ef1983a48919a4562300cace84687335035a9b9a077966e1ac04e", 4554),
    "model/modeling_arktts.py": (MODEL + "modeling_arktts.py", "b320b6c875e6a57afb9745cc98fc72c116d9df6b3bf20d092a5ad3095026911f", 34737),
    "model/modeling_arktts_codec.py": (MODEL + "modeling_arktts_codec.py", "e1d6b0e1ef1e9ad303dc01d45d86229cf7f2e98d06a7b426234a7e4d7e3ede68", 19838),
    "model/processing_arktts.py": (MODEL + "processing_arktts.py", "eba6ecb6b7f0e221bcd19c5e3fe5978e677faf6b362912ff4febc08c3dc7f9df", 11185),
    "model/config.json": (MODEL + "config.json", "92e19f10edb6c79ef2ccf4aebe218baa2c12743d648d75238041eca39439f8d3", 1459),
    "model/tokenizer.json": (MODEL + "tokenizer.json", "f24e08099d45a8adf3f52f5f0b03276e433bb9d689bb15fcbcc48ce58744588b", 12217872),
    "model/model.safetensors": (MODEL + "model.safetensors", "e0540b75b39171ace3942ddca063a0c8881a66da97ce3eecae1a5bd4aa55fa4c", 1202342528),
    "model/codec.pth": (MODEL + "codec.pth", "c310505aa11fe2f6cc63b8d3130dc7e77e73227774f5c62575769b1f47a8d048", 1349857559),
    "upstream/audio8_tts_data.py": (UPSTREAM + "audio8_tts_data.py", "7d17291f930464b72dd8a1eb0d40dccd5d6678cb8fd273fd38ecd55e0c40f5b4", 12385),
    "upstream/audio8_tts_sft.py": (UPSTREAM + "audio8_tts_sft.py", "b2096da46dde83049074b45ae43a3501ca15a29e46f0fa50eeca98b310365d14", 16387),
    "dataset/dataset_part_001.parquet": (DATA + "dataset_part_001.parquet", "23303f424e4b4b49b5643a2b2e3c4f81667230e8c2d5b8cee7685bd4e537c363", 463625469),
    "wheels/transformers-4.57.5-py3-none-any.whl": ("https://files.pythonhosted.org/packages/f8/de/4f95d22d9764659d2bd35065f383f3fe099699a9e6e89fa4728dbcd7244a/transformers-4.57.5-py3-none-any.whl", "5a1e0deb989cd0b8f141b6d8c9b7c956fc029cd288d68844f57dc0acbaf2fe39", 11993481),
    "wheels/tokenizers-0.22.1-cp39-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl": ("https://files.pythonhosted.org/packages/d0/c6/dc3a0db5a6766416c32c034286d7c2d406da1f498e4de04ab1b8959edd00/tokenizers-0.22.1-cp39-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl", "e2ef6063d7a84994129732b47e7915e8710f27f99f3a3260b8a38fc7ccd083f4", 3250221),
    "wheels/huggingface_hub-0.36.2-py3-none-any.whl": ("https://files.pythonhosted.org/packages/a8/af/48ac8483240de756d2438c380746e7130d1c6f75802ef22f3c6d49982787/huggingface_hub-0.36.2-py3-none-any.whl", "48f0c8eac16145dfce371e9d2d7772854a4f591bcb56c9cf548accf531d54270", 566395),
}


def download(url, destination, expected_hash, expected_size):
    destination.parent.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    size = 0
    with urllib.request.urlopen(url, timeout=120) as source, destination.open("xb") as target:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            size += len(chunk)
            if size > expected_size:
                raise ValueError(f"asset larger than expected: {destination.name}")
            digest.update(chunk)
            target.write(chunk)
    if size != expected_size or digest.hexdigest() != expected_hash:
        raise ValueError(f"asset integrity mismatch: {destination.name}")


def stage(output):
    if output.exists():
        raise FileExistsError(output)
    if shutil.disk_usage(output.parent).free < 6 * 1024**3:
        raise OSError("at least 6 GiB free space is required")
    output.mkdir()
    for relative, (url, digest, size) in ASSETS.items():
        print(f"Staging {relative} ({size} bytes)", flush=True)
        download(url, output / relative, digest, size)
    manifest = {"model_revision": MODEL_REVISION, "upstream_revision": UPSTREAM_REVISION,
                "data_revision": DATA_REVISION, "data_license": "cc0-1.0",
                "assets": {name: {"sha256": value[1], "bytes": value[2]} for name, value in ASSETS.items()}}
    (output / "assets-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("Public assets verified; no downloaded code or weights were executed.", flush=True)


if __name__ == "__main__":
    stage(Path("/kaggle/working/speech-assets"))
