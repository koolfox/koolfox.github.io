"""Export full CLIP ViT-B/32 using unchanged original PyTorch ZIP storage.

Both learned encoders, projections, L2 normalization and learned logit scale are
present. End-token selection uses a host-tokenizer-derived one-hot mask; the
selection itself is computed on GPU by multiply/reduce, exactly matching the
original model's EOT indexing without int64 GPU index requirements.
"""

import hashlib
import json
import struct
import zipfile
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
import torch
from onnx.external_data_helper import set_external_data
from PIL import Image
from transformers import CLIPImageProcessor, CLIPModel, CLIPTokenizerFast

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "results/model-validation/cache/clip"
REFERENCE = ROOT / "models/references"
EXPECTED_SHA = "a63082132ba4f97a80bea76823f544493bffa8082296d62d71581a4feff1576f"
PROMPTS = [
    "A photo of a plane.",
    "A photo of a car.",
    "A photo of a dog.",
    "A photo of a bird.",
]


class SimilarityModel(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, pixel_values, input_ids, attention_mask, end_mask):
        visual = self.model.vision_model(pixel_values=pixel_values).pooler_output
        image = self.model.visual_projection(visual)
        language = self.model.text_model(
            input_ids=input_ids, attention_mask=attention_mask
        ).last_hidden_state
        end_token = (language * end_mask.unsqueeze(-1)).sum(dim=1)
        text = self.model.text_projection(end_token)
        image = image / image.norm(p=2, dim=-1, keepdim=True)
        text = text / text.norm(p=2, dim=-1, keepdim=True)
        cosine = image @ text.T
        logits = cosine * self.model.logit_scale.exp()
        return logits, cosine, image, text


def storage_bytes(tensor):
    storage = tensor.untyped_storage()
    raw = torch.tensor([], dtype=torch.uint8).set_(
        storage, 0, (storage.nbytes(),), (1,)
    )
    return raw.numpy().tobytes()


def zip_storage_index(path):
    index = {}
    with path.open("rb") as stream, zipfile.ZipFile(path) as archive:
        for info in archive.infolist():
            if not info.filename.startswith("archive/data/"):
                continue
            assert info.compress_type == zipfile.ZIP_STORED
            raw = archive.read(info)
            stream.seek(info.header_offset)
            header = stream.read(30)
            assert header[:4] == b"PK\x03\x04"
            name_length, extra_length = struct.unpack("<HH", header[26:30])
            offset = info.header_offset + 30 + name_length + extra_length
            index[(len(raw), hashlib.sha256(raw).hexdigest())] = {
                "offset": offset,
                "bytes": len(raw),
                "entry": info.filename,
            }
    return index


def main():
    path = CACHE / "pytorch_model.bin"
    with path.open("rb") as source:
        assert hashlib.file_digest(source, "sha256").hexdigest() == EXPECTED_SHA
    torch.set_num_threads(4)
    original_state = torch.load(path, map_location="cpu", weights_only=True, mmap=True)
    model = CLIPModel.from_pretrained(
        CACHE, local_files_only=True, use_safetensors=False, attn_implementation="eager"
    ).eval()
    tokenizer = CLIPTokenizerFast.from_pretrained(CACHE, local_files_only=True)
    processor = CLIPImageProcessor.from_pretrained(CACHE, local_files_only=True)
    image = Image.open(REFERENCE / "clip-source-dog.png").convert("RGB")
    pixels = processor(images=image, return_tensors="pt")["pixel_values"]
    encoded = tokenizer(
        PROMPTS,
        padding="max_length",
        max_length=77,
        truncation=False,
        return_tensors="pt",
    )
    assert tuple(encoded["input_ids"].shape) == (4, 77)
    end_mask = torch.zeros((4, 77), dtype=torch.float32)
    end_mask[torch.arange(4), encoded["input_ids"].argmax(dim=-1)] = 1
    arguments = (
        pixels,
        encoded["input_ids"].to(torch.int32),
        encoded["attention_mask"].to(torch.int32),
        end_mask,
    )
    wrapper = SimilarityModel(model).eval()
    with torch.inference_mode():
        direct = model(pixel_values=pixels, **encoded)
        expected = wrapper(*arguments)
    torch.testing.assert_close(
        expected[0], direct.logits_per_image, atol=2e-5, rtol=1e-5
    )
    torch.testing.assert_close(expected[2], direct.image_embeds, atol=2e-6, rtol=1e-5)
    torch.testing.assert_close(expected[3], direct.text_embeds, atol=2e-6, rtol=1e-5)
    full_path = CACHE / "model-export.onnx"
    names = [
        "logits_per_image",
        "cosine_similarity",
        "image_embeddings",
        "text_embeddings",
    ]
    torch.onnx.export(
        wrapper,
        arguments,
        str(full_path),
        input_names=["pixel_values", "input_ids", "attention_mask", "end_mask"],
        output_names=names,
        opset_version=17,
        dynamo=False,
        do_constant_folding=False,
        external_data=False,
    )
    graph = onnx.load(full_path)
    storages = zip_storage_index(path)
    storage_cache, mapped, transposes = {}, [], []
    for initializer in graph.graph.initializer:
        key = initializer.name.removeprefix("model.")
        if key not in original_state:
            assert len(initializer.raw_data) < 131072, initializer.name
            continue
        tensor = original_state[key]
        assert list(tensor.shape) == list(initializer.dims), key
        assert tensor.numpy().tobytes() == initializer.raw_data, key
        storage = tensor.untyped_storage()
        identity = (storage.data_ptr(), storage.nbytes())
        if identity not in storage_cache:
            raw = storage_bytes(tensor)
            storage_cache[identity] = storages[
                (len(raw), hashlib.sha256(raw).hexdigest())
            ]
        source = storage_cache[identity]
        length = tensor.numel() * tensor.element_size()
        offset = source["offset"] + tensor.storage_offset() * tensor.element_size()
        assert offset + length <= source["offset"] + source["bytes"]
        transpose = not tensor.is_contiguous()
        if transpose:
            assert tensor.ndim == 2 and tensor.stride() == (1, tensor.shape[0]), (
                key,
                tensor.stride(),
            )
            original_name = initializer.name
            initializer.name += "__original_storage"
            initializer.dims[:] = list(reversed(tensor.shape))
            transposes.append(
                onnx.helper.make_node(
                    "Transpose",
                    [initializer.name],
                    [original_name],
                    perm=[1, 0],
                    name=original_name + "__storage_view",
                )
            )
        set_external_data(
            initializer, location="pytorch_model.bin", offset=offset, length=length
        )
        initializer.ClearField("raw_data")
        initializer.data_location = onnx.TensorProto.EXTERNAL
        mapped.append(
            {
                "initializer": initializer.name,
                "source_key": key,
                "zip_entry": source["entry"],
                "offset": offset,
                "length": length,
                "transpose_view": transpose,
            }
        )
    nodes = list(graph.graph.node)
    graph.graph.ClearField("node")
    graph.graph.node.extend(transposes + nodes)
    small = graph.SerializeToString()
    assert len(small) < 3_000_000
    local = CACHE / "model-webgpu.onnx"
    local.write_bytes(small)
    onnx.checker.check_model(str(local))
    feeds = dict(
        zip(
            ["pixel_values", "input_ids", "attention_mask", "end_mask"],
            [value.numpy() for value in arguments],
        )
    )
    session = ort.InferenceSession(str(local), providers=["CPUExecutionProvider"])
    actual = session.run(None, feeds)
    maximum = {}
    for name, value, gold in zip(names, actual, expected):
        target = gold.numpy()
        np.testing.assert_allclose(value, target, atol=3e-4, rtol=1e-4)
        maximum[name] = float(np.max(np.abs(value - target)))
    (ROOT / "models/graphs/clip-vit-base-patch32.onnx").write_bytes(small)
    pixels.numpy().astype("<f4").tofile(REFERENCE / "clip-input.float32.bin")
    preview = processor(
        images=image, do_normalize=False, do_rescale=False, return_tensors="np"
    )["pixel_values"][0].transpose(1, 2, 0)
    Image.fromarray(preview.astype("uint8")).save(REFERENCE / "clip-preview.png")
    reference = {
        "framework": {
            "name": "PyTorch",
            "version": torch.__version__,
            "model": "CLIPModel",
        },
        "prompts": PROMPTS,
        "input_ids": encoded["input_ids"].tolist(),
        "attention_mask": encoded["attention_mask"].tolist(),
        "end_mask": end_mask.tolist(),
        "logits": direct.logits_per_image.numpy().reshape(-1).tolist(),
        "cosine": (direct.image_embeds @ direct.text_embeds.T)
        .numpy()
        .reshape(-1)
        .tolist(),
        "image_embeddings": direct.image_embeds.numpy().reshape(-1).tolist(),
        "text_embeddings": direct.text_embeds.numpy().reshape(-1).tolist(),
        "parameters": sum(value.numel() for value in model.parameters()),
        "nodes": len(graph.graph.node),
        "cpu_onnx_max_absolute_error": maximum,
    }
    (REFERENCE / "clip-base.json").write_text(
        json.dumps(reference, separators=(",", ":")) + "\n"
    )
    report = {
        "source_sha256": EXPECTED_SHA,
        "graph_sha256": hashlib.sha256(small).hexdigest(),
        "graph_bytes": len(small),
        "mapped_initializers": mapped,
        "parameters": reference["parameters"],
        "nodes": reference["nodes"],
        "cpu_onnx_max_absolute_error": maximum,
    }
    (ROOT / "results/model-validation/clip-export.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    print(
        {key: value for key, value in report.items() if key != "mapped_initializers"},
        flush=True,
    )


if __name__ == "__main__":
    main()
