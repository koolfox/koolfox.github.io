# Released source models

`source-models.json` is the browser's model catalog. A slide can link to a model;
opening a slide does not download its weights. The explicit load/run action
verifies every artifact's SHA-256 before creating a WebGPU-only inference session.
Missing GPU support, artifact errors and unsupported operators are errors. The
runtime never substitutes CPU inference, random weights or a smaller architecture.

The default ResNet input is the released Model Zoo **numerical test tensor**. Its
1,000 logits are compared against the released golden tensor. These are not
photograph predictions or a fresh measurement of ImageNet accuracy. The original
ResNet-v1 bottleneck places the spatial stride on the first 1×1 convolution.
Torchvision's ResNet-v1.5 is a different variant.

BERT's task is masked-token prediction with the full released BERT-Base Uncased
MLM checkpoint. The two source sentences are encoded as two segments. This is
not a GLUE evaluation or the source slide's separate next-sentence classifier.

## Reproduce validation

Large validation artifacts, Python environments and detailed machine outputs
remain under ignored `deep-learning/results/model-validation/`. The small
reference fixtures remain versioned for independent comparison.

```sh
uv sync --project deep-learning/models
uv run --project deep-learning/models python deep-learning/models/fetch_artifacts.py
uv run --project deep-learning/models python deep-learning/models/prepare_references.py
python3 -m http.server 8875
# In another terminal, from the repository root:
node deep-learning/models/validate_webgpu.mjs
node --test deep-learning/models/tests/tokenizer.test.mjs
```

WebGPU validation uses an isolated Chromium profile and Metal on this Mac; it
does not attach to a user's existing browser. CPU comparisons are separate
reference-generation checks and are never the browser inference backend.

## Integration API

Import `assets/model-runtime.js`. `sourceModelCatalog()` reads small metadata.
`loadSourceModel(id, {signal, onProgress})` downloads/checks weights and compiles
only on explicit user action. `runSourceModel(handle, input, options)` returns
real output dimensions, adapter metadata and a reference comparison for the exact
default input. Progress stages are `device`, `download`, `verify`, `compile`,
`inference`. `releaseSourceModel(handle)` releases session resources. Abort is
checked during downloads and between compilation/inference stages; a submitted
GPU dispatch cannot be forcibly interrupted through ONNX Runtime's public API.

ResNet accepts an optional Float32Array `input.tensor` already preprocessed to
NCHW `[1,3,224,224]`; otherwise it uses the official test tensor. BERT accepts
`input.text` and `input.textPair`, with at least one `[MASK]`, up to128tokens.
Changed inputs return predictions without falsely comparing to the default's
reference. `localArtifactBase` is for reproducible local validation only; normal
publication uses the manifest's pinned upstream URLs.

## Licensing

Project code retains the repository license. Released model artifacts and BERT's
vocabulary are Apache-2.0; ONNX Runtime is MIT with its accompanying third-party
notices in `assets/vendor/model-runtime/`. The site license does not relicense
third-party weights, slides, text or media.

`preprocessResnetImageData({width,height,data})` is also exported by the runtime.
Pass decoded Uint8ClampedArray RGBA pixels. It returns `{tensor,preview,
resizedShape}` with a Pillow-compatible bilinear resize and center crop. Display
that actual224×224preview, then pass `tensor` to the CNN. Four independent Pillow
fixtures match every preview byte (normalization error≤2.3842e-7). Regenerate
those developer fixtures with `prepare_image_fixtures.py`.

BERT downloads its original official ONNX file, checks its SHA-256, changes only
three declared input-dtype bytes from int64 to int32, and checks the derived
SHA-256. The full transformer/MLM weights and operators are unchanged. Recreate
this deterministic specialization with `prepare_webgpu_graph.py`. The browser
applies the small patch in memory; no converted model needs hosting.

The WebGPU validation script also compares BERT's entire3,906,816-value output
to the independent PyTorch CPU tensor produced by `prepare_references.py`.
The developer-only CPU tensor is ignored and is not downloaded by the site.
`validate_mxnet.py` independently reconstructs the CNN in MXNet1.9.1 CPU via its
official ONNX importer; its x86_64 Python3.9 environment is separate from the
modern PyTorch environment. On this Mac it was run through Rosetta.
