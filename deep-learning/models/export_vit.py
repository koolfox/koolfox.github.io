"""Export the full released ViT-B/16 graph with original safetensors external data.

Only the small ONNX graph and CPU reference are tracked. Every external tensor
points into the exact official safetensors bytes (including its header offset).
No transposed/quantized replacement checkpoint or huge derivative is hosted.
"""

from pathlib import Path
import hashlib
import json
import struct

import numpy as np
import onnx
from onnx.external_data_helper import set_external_data
import onnxruntime as ort
from PIL import Image
import torch
from transformers import ViTForImageClassification, ViTImageProcessor

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "results/model-validation/cache/vit"
REFERENCE = ROOT / "models/references"
GRAPH = ROOT / "models/graphs"
EXPECTED_SHA = "1cea07110a4a47edc51420b2dda6f3b8b58e7256e8f44b4ea6aa9696162ccb5d"


class Classifier(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, pixel_values):
        return self.model(pixel_values=pixel_values).logits


def main():
    weights_path = CACHE / "model.safetensors"
    payload = weights_path.read_bytes()
    assert hashlib.sha256(payload).hexdigest() == EXPECTED_SHA
    header_size = struct.unpack("<Q", payload[:8])[0]
    header = json.loads(payload[8 : 8 + header_size])
    torch.set_num_threads(4)
    model = ViTForImageClassification.from_pretrained(
        CACHE, local_files_only=True, attn_implementation="eager"
    ).eval()
    processor = ViTImageProcessor.from_pretrained(CACHE, local_files_only=True)
    image = Image.open(CACHE / "astronaut.png").convert("RGB")
    inputs = processor(images=image, return_tensors="pt")
    with torch.inference_mode():
        expected = model(**inputs).logits.numpy()
    export_path = CACHE / "model-export.onnx"
    torch.onnx.export(
        Classifier(model),
        (inputs["pixel_values"],),
        str(export_path),
        input_names=["pixel_values"],
        output_names=["logits"],
        opset_version=17,
        dynamo=False,
        do_constant_folding=False,
        external_data=False,
    )
    graph = onnx.load(export_path)
    mapped = []
    for initializer in graph.graph.initializer:
        key = initializer.name.removeprefix("model.")
        if key not in header:
            # Pure shape/scalar constants stay embedded in the small graph.
            assert len(initializer.raw_data) < 1024
            continue
        metadata = header[key]
        assert metadata["dtype"] == "F32"
        assert list(initializer.dims) == metadata["shape"], key
        begin, end = metadata["data_offsets"]
        begin += 8 + header_size
        end += 8 + header_size
        assert initializer.raw_data == payload[begin:end], key
        set_external_data(
            initializer, location="model.safetensors", offset=begin, length=end - begin
        )
        initializer.ClearField("raw_data")
        initializer.data_location = onnx.TensorProto.EXTERNAL
        mapped.append(
            {
                "initializer": initializer.name,
                "safetensors_key": key,
                "offset": begin,
                "length": end - begin,
            }
        )
    small = graph.SerializeToString()
    assert len(small) < 2_000_000
    local_graph = CACHE / "model-webgpu.onnx"
    local_graph.write_bytes(small)
    onnx.checker.check_model(str(local_graph))
    session = ort.InferenceSession(str(local_graph), providers=["CPUExecutionProvider"])
    actual = session.run(None, {"pixel_values": inputs["pixel_values"].numpy()})[0]
    np.testing.assert_allclose(actual, expected, atol=3e-4, rtol=1e-4)
    REFERENCE.mkdir(exist_ok=True)
    GRAPH.mkdir(exist_ok=True)
    (GRAPH / "vit-base-224.onnx").write_bytes(small)
    inputs["pixel_values"].numpy().astype("<f4").tofile(
        REFERENCE / "vit-input.float32.bin"
    )
    resized = image.resize((224, 224), Image.Resampling.BILINEAR)
    resized.save(REFERENCE / "vit-preview.png")
    labels = [model.config.id2label[i] for i in range(1000)]
    reference = {
        "framework": {
            "name": "PyTorch",
            "version": torch.__version__,
            "model": "ViTForImageClassification",
        },
        "input_shape": [1, 3, 224, 224],
        "output_shape": list(expected.shape),
        "output": expected.reshape(-1).tolist(),
        "labels": labels,
        "cpu_onnx_max_absolute_error": float(np.max(np.abs(actual - expected))),
        "parameters": sum(value.numel() for value in model.parameters()),
        "nodes": len(graph.graph.node),
        "task": "ImageNet1k classification; original Google-published converted ViT-B/16 checkpoint at224; not JFT benchmark reproduction",
    }
    (REFERENCE / "vit-base.json").write_text(
        json.dumps(reference, separators=(",", ":")) + "\n"
    )
    report = {
        "source_sha256": EXPECTED_SHA,
        "graph_sha256": hashlib.sha256(small).hexdigest(),
        "graph_bytes": len(small),
        "mapped_initializers": mapped,
        "cpu_onnx_max_absolute_error": reference["cpu_onnx_max_absolute_error"],
        "parameters": reference["parameters"],
        "nodes": reference["nodes"],
    }
    (ROOT / "results/model-validation/vit-export.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    print(
        {key: value for key, value in report.items() if key != "mapped_initializers"},
        flush=True,
    )


if __name__ == "__main__":
    main()
