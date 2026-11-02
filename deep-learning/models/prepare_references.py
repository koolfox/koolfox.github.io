"""Recompute source-model fixtures using the released checkpoints (CPU only).

Run after fetch_artifacts.py with: uv run --project deep-learning/models python
 deep-learning/models/prepare_references.py. Large artifacts remain in results/.
"""

from pathlib import Path
import hashlib
import json
import tarfile
import numpy as np
import onnx
import onnxruntime as ort

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "results/model-validation/cache"
OUT = ROOT / "models/references"
OUT.mkdir(exist_ok=True)


def dump(name, value):
    (OUT / name).write_text(
        json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n"
    )


def inspect(path):
    model = onnx.load(path)
    initializers = {value.name for value in model.graph.initializer}
    return {
        "inputs": [
            {
                "name": v.name,
                "shape": [
                    d.dim_param or d.dim_value for d in v.type.tensor_type.shape.dim
                ],
            }
            for v in model.graph.input
            if v.name not in initializers
        ],
        "outputs": [v.name for v in model.graph.output],
        "nodes": len(model.graph.node),
        "initializer_elements": sum(
            np.prod(v.dims).item() for v in model.graph.initializer
        ),
    }


def resnet():
    folder = CACHE / "resnet152-v1-7"
    folder.mkdir(exist_ok=True)
    # Only regular model/tensor files are extracted; never follow archive links.
    with tarfile.open(CACHE / "resnet152-v1-7.tar.gz") as archive:
        for member in archive:
            target = (CACHE / member.name).resolve()
            if not target.is_relative_to(CACHE.resolve()):
                raise ValueError("Unsafe archive path")
            if member.isfile() and target.suffix in {".onnx", ".pb"}:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(archive.extractfile(member).read())
    path = next(folder.glob("*.onnx"))
    if (
        hashlib.sha256(path.read_bytes()).hexdigest()
        != "b0ec92437bf8c9d0739bf9bafdea9638e13f9e3c1e2fb766ad546cc182fd3f6d"
    ):
        raise ValueError("Unexpected ResNet graph")
    test = folder / "test_data_set_0"
    arrays = {}
    for name in ["input_0", "output_0"]:
        proto = onnx.TensorProto()
        proto.ParseFromString((test / (name + ".pb")).read_bytes())
        arrays[name] = onnx.numpy_helper.to_array(proto)
    session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    actual = session.run(None, {session.get_inputs()[0].name: arrays["input_0"]})[0]
    expected = arrays["output_0"]
    np.testing.assert_allclose(actual, expected, rtol=1e-4, atol=1e-5)
    (OUT / "resnet152-input.float32.bin").write_bytes(
        arrays["input_0"].astype("<f4").tobytes()
    )
    existing = (
        json.loads((OUT / "resnet152.json").read_text())
        if (OUT / "resnet152.json").exists()
        else {}
    )
    labels = {
        key: existing[key] for key in ["labels", "labels_source"] if key in existing
    }
    dump(
        "resnet152.json",
        {
            **labels,
            "graph": inspect(path),
            "task": "Official ONNX Model Zoo numerical test tensor; not an ImageNet accuracy measurement",
            "input_shape": list(arrays["input_0"].shape),
            "output_shape": list(actual.shape),
            "output": expected.reshape(-1).tolist(),
            "cpu_max_absolute_error": float(np.max(np.abs(actual - expected))),
        },
    )
    print(
        "RESNET CPU",
        inspect(path),
        "error",
        np.max(np.abs(actual - expected)),
        flush=True,
    )


def bert():
    import torch
    import transformers
    from transformers import BertForMaskedLM, BertTokenizer

    torch.set_num_threads(4)
    tokenizer = BertTokenizer.from_pretrained(CACHE / "bert", local_files_only=True)
    text, pair = (
        "I arrived at the bank [MASK] crossing the river.",
        "My pants were wet.",
    )
    inputs = tokenizer(
        text, pair, return_tensors="pt", padding="max_length", max_length=128
    )
    model = BertForMaskedLM.from_pretrained(
        CACHE / "bert", local_files_only=True, attn_implementation="eager"
    ).eval()
    with torch.inference_mode():
        expected = model(**inputs).logits.numpy()
    session = ort.InferenceSession(
        str(CACHE / "bert/model.onnx"), providers=["CPUExecutionProvider"]
    )
    actual = session.run(None, {key: value.numpy() for key, value in inputs.items()})[0]
    np.testing.assert_allclose(actual, expected, rtol=2e-4, atol=3e-4)
    position = (inputs["input_ids"][0] == tokenizer.mask_token_id).nonzero().item()
    logits = expected[0, position]
    dump(
        "bert-base.json",
        {
            "framework": {
                "name": "PyTorch",
                "version": torch.__version__,
                "transformers": transformers.__version__,
                "onnxruntime": ort.__version__,
                "parameters": sum(value.numel() for value in model.parameters()),
            },
            "graph": inspect(CACHE / "bert/model.onnx"),
            "text": text,
            "textPair": pair,
            "input_ids": inputs["input_ids"][0].tolist(),
            "token_type_ids": inputs["token_type_ids"][0].tolist(),
            "mask_position": position,
            "mask_logits": logits.tolist(),
            "cpu_max_absolute_error": float(np.max(np.abs(actual - expected))),
            "top": [
                {
                    "token": tokenizer.convert_ids_to_tokens(int(i)),
                    "index": int(i),
                    "logit": float(logits[i]),
                }
                for i in np.argsort(logits)[-5:][::-1]
            ],
        },
    )
    expected.astype("<f4").tofile(
        ROOT / "results/model-validation/bert-pytorch-logits.float32.bin"
    )
    cases = [
        {"text": value, "tokens": tokenizer.tokenize(value)}
        for value in [
            "Héllo,[MASK]! unaffable",
            "你好吗 [MASK]",
            "Hello[SEP] [MASK]",
            "  Hello\tWORLD! [MASK]  ",
        ]
    ]
    dump("bert-tokenizer-cases.json", cases)
    (OUT / "bert-vocab.txt").write_bytes((CACHE / "bert/vocab.txt").read_bytes())
    print(
        "BERT CPU",
        inspect(CACHE / "bert/model.onnx"),
        "error",
        np.max(np.abs(actual - expected)),
        flush=True,
    )


if __name__ == "__main__":
    import sys

    if len(sys.argv) == 1 or sys.argv[1] == "resnet":
        resnet()
    if len(sys.argv) == 1 or sys.argv[1] == "bert":
        bert()
