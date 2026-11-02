"""Verify BERT's deterministic three-byte WebGPU input-type specialization.

Integer token indices fit exactly in int32. No weight, operator or output type
changes. The browser applies these same three bytes after verifying the original
artifact, then verifies the derived SHA-256. A converted large file is not hosted.
"""

from pathlib import Path
import hashlib
import json
import onnx

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "results/model-validation/cache/bert"
source = (CACHE / "model.onnx").read_bytes()
assert (
    hashlib.sha256(source).hexdigest()
    == "44d7a2896d341c51fb1eba89aea3a590e6af0ce33e25481136f7eeecb62e5f7f"
)
model = onnx.load_model_from_string(source)
assert [value.name for value in model.graph.input] == [
    "input_ids",
    "attention_mask",
    "token_type_ids",
]
for value in model.graph.input:
    assert value.type.tensor_type.elem_type == onnx.TensorProto.INT64
    value.type.tensor_type.elem_type = onnx.TensorProto.INT32
derived = model.SerializeToString()
patches = [
    {"offset": i, "from": source[i], "to": derived[i]}
    for i in range(len(source) - 256, len(source))
    if source[i] != derived[i]
]
assert len(source) == len(derived)
assert len(patches) == 3 and all(
    patch["from"] == 7 and patch["to"] == 6 for patch in patches
)
check = bytearray(source)
for patch in patches:
    check[patch["offset"]] = patch["to"]
assert check == derived
report = {
    "operation": "Three ONNX graph input tensor types: int64 to int32; weights and operators unchanged",
    "source_sha256": hashlib.sha256(source).hexdigest(),
    "derived_sha256": hashlib.sha256(derived).hexdigest(),
    "bytes": len(source),
    "patches": patches,
}
assert (
    report["derived_sha256"]
    == "c526583275c6693ee6d83cd13b5aa02d47a36aceddf9558f9a93332d8f3245f2"
)
(CACHE / "model-int32.onnx").write_bytes(derived)
(ROOT / "results/model-validation/bert-int32-derivation.json").write_text(
    json.dumps(report, indent=2) + "\n"
)
print(json.dumps(report, indent=2))
