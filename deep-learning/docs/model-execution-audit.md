# Model execution audit

Validated 2026-11-02. This records actual inference, independently of publication,
slide coverage, training and historical benchmark reproduction.

## Complete released models executed on hardware WebGPU

Both models ran through the production `assets/model-runtime.js` API using ONNX
Runtime Web1.31.1, an isolated Playwright1.58.2 Chromium145 profile, and
`--enable-unsafe-webgpu --use-angle=metal`. The adapter reported
`vendor:apple`, `architecture:metal-3`, `fallback:false`. Sessions specified
`executionProviders:[{name:'webgpu',device}]` **and**
`extra.session.disable_cpu_ep_fallback:'1'`. Unsupported model nodes cause a
session creation error. JavaScript tokenization, image preprocessing, shape
specialization, downloads and hashing are host work; these are not GPU kernels.
The complete learned inference graph runs on the WebGPU execution provider.

| Model/task and source | Independent reference | Compared output | Maximum absolute error |
| --- | --- | ---: | ---: |
| Full ResNet152-v1, s08 pp36,41–42 | Official released Model Zoo golden tensor | 1,000 logits | 7.1525574e-6 WebGPU |
| Same released ResNet152-v1 | MXNet1.9.1 CPU, official ONNX importer, exact initializers | 1,000 golden logits | 6.6757202e-6 MXNet |
| Same released ResNet152-v1 | Native ONNX Runtime1.31.1 CPU | 1,000 golden logits | 2.8610230e-6 CPU |
| Full BERT-Base Uncased MLM, s14 pp13,16 | PyTorch2.13.0 / Transformers4.57.3, pinned official safetensors | All3,906,816 logits `[1,128,30522]` | 5.1498413e-5 WebGPU |
| Same BERT source mask via production API | Same independent PyTorch reference | All30,522 mask logits | 2.5749207e-5 WebGPU |
| Original, unmodified official BERT ONNX | Same independent PyTorch CPU reference | All3,906,816 logits | 1.4019012e-4 native ONNX CPU |

The CNN tolerance is `3e-5 + 3e-5*abs(reference)`; BERT uses
`3e-4 + 1e-4*abs(reference)`. Every compared value passed, with no nonfinite
outputs. Production API reference results include comparison counts and maximum
error. Edited inputs are not falsely compared to the default input's reference.
These float32 differences are measured errors, not exact-real-number equality.

Recent local production API timings were approximately3.0s load/0.16s inference
for ResNet and7.9s load/0.24s inference for BERT. Load includes local transfer,
hashing, graph specialization and compilation; public network transfer time is
additional. These are single-machine observations, not performance benchmarks.

## Exact checkpoints and task scope

The CNN is the [ONNX Model Zoo's released MXNet Gluon ResNet152-v1](https://github.com/onnx/models/tree/c5cae0f1942c8d7727372c7b1f6b485aa39e4421/validated/vision/classification/resnet),
matching the152-layer family in source s08. It is not a smaller random model or
torchvision's stride-modified ResNet-v1.5. Its original-v1 bottleneck downsamples
on the first1×1 convolution. The default input is the released
`test_data_set_0/input_0.pb` numerical **conformance tensor**, with the released
`output_0.pb` golden logits. Its predicted labels do not identify a photograph or
establish ImageNet accuracy. Its515-node graph contains60,404,072 initializer
elements, including normalization state; that count is not a trainable-parameter
count. Native MXNet validation imported those same released weights and graph
using MXNet's official ONNX importer, on Rosetta x86_64 Python3.9/NumPy1.23.5.

The Transformer is the [official Google BERT-Base Uncased checkpoint](https://huggingface.co/google-bert/bert-base-uncased/tree/86b5e0934494bd15c9632b12f734a8a67f723594):
12 transformer layers,12 attention heads, hidden size768, vocabulary30522,
109,514,298 unique MLM model parameters. The original safetensors also contain
pooler/next-sentence-head weights; those unused heads are not the selected task.
The **complete masked-language-model** uses the exact source text pair:

```text
Segment0: I arrived at the bank [MASK] crossing the river.
Segment1: My pants were wet.
```

Actual encoded IDs before padding are
`[101,1045,3369,2012,1996,2924,103,5153,1996,2314,1012,102,2026,6471,2020,4954,1012,102]`.
Segment1 begins after the first `[SEP]`; padding has attention mask0. Batch1 is
padded to128tokens. Inputs longer than128tokens are rejected without truncation.
The source mask's leading predictions are `after`, `,`, `before`, `of`, `without`;
the actual highest probability was about0.52882. These are measured predictions,
not a supplied answer or fabricated certainty. This does not reproduce NSP,
GLUE fine-tuning or the BERT paper's benchmark table.

## BERT graph specialization: exactly three bytes

The original BERT graph's int64 index inputs caused the strict-GPU session to
fail because nodes were assigned to CPU. That rejected probe is retained. Changing
only the three graph input types from ONNXINT64(7) to INT32(6) allows the complete
model to run with CPUfallback disabled. All token IDs, masks and segment IDs fit
exactly in int32; weights, operators, layers, activations and output types do not
change. Fixed symbolic dimensions are batch_size1/sequence_length128.

`models/prepare_webgpu_graph.py` reconstructs this change through ONNX1.20.0,
asserts that only three bytes differ, and verifies the derived SHA-256:
`c526583275c6693ee6d83cd13b5aa02d47a36aceddf9558f9a93332d8f3245f2`.
The offsets are532091031,532091090,532091149. The browser first verifies the
**original** official artifact's hash, applies the manifest's three checked byte
changes in memory, and verifies the entire derived graph's hash. No500MB
converted artifact is hosted. Native CPU outputs of int64/int32 graphs were
bit-for-bit identical on the fixed source input. WebGPU's complete output was
also compared directly against the independent original PyTorch checkpoint.

## Real image preprocessing

`assets/model-image.js` implements the pinned [Model Zoo ImageNet preprocessing](https://github.com/onnx/models/blob/c5cae0f1942c8d7727372c7b1f6b485aa39e4421/validated/vision/classification/imagenet_preprocess.py):
resize the shorter side to256 using bilinear filtering, preserve aspect ratio
with Python's round-to-even sizing, center crop224×224, RGB→NCHW, divide255,
normalize mean`[.485,.456,.406]`/std`[.229,.224,.225]`. It accepts already-decoded
RGBA pixels, returning the actual crop preview and Float32Array. Browser file
decoding precedes this API; JPEG decoders/color-profile handling can differ
across systems. No bit-identical cross-decoder claim is made.

Four independent Pillow12.0.0 synthetic fixtures cover shrinking, enlargement,
portrait/landscape, odd dimensions and unchanged size:641×479,127×311,513×512,
256×256. **Every resized/cropped preview byte matches Pillow**; normalized tensor
maximum absolute difference is2.3841858e-7. Tests retain the independent preview
SHA-256 values, not generated copies of this implementation. Class labels come
from the pinned Model Zoo synset.txt; their source hash is in the reference JSON.
An uploaded image uses its own preprocessed tensor and gets real model scores,
without a conformance comparison against the unrelated default test tensor.

## Download integrity, licenses and reproducibility

`models/source-models.json` pins exact sources, revisions, SHA-256 hashes, bytes,
source slide pages, config, task, tokenizer, reference and derivation. Main
browser artifacts are241,816,206bytes ResNet ONNX and532,091,246bytes BERT ONNX.
The440,449,768byte PyTorch safetensors is developer reference material and is
not fetched by the browser. Both original public ONNX URLs passed real browser
CORS+Range fetch checks. Network availability is not an offline guarantee.

Weights are downloaded only on explicit load/run, never by reading a slide.
The loader verifies streamed length and SHA-256 before compilation; no silent
CPU fallback, random weights or smaller architecture is used. No GPU, bad
artifacts and unsupported operators surface as errors. An already-aborted or
missing-WebGPU request does not fetch weights. Cancellation is checked during
downloads and between stages; ONNX Runtime does not provide a public API to
forcibly interrupt an already submitted GPU dispatch.

Large weights, environments and detailed output tensors stay in ignored
`deep-learning/results/model-validation/`. Reproducible scripts and small golden
fixtures are tracked under `models/`. See `models/README.md` for commands.
The released weights/vocabulary are Apache-2.0, with retained upstream notices.
ONNX Runtime Web is MIT with its third-party notices. The site's own license
cannot relicense upstream slides, weights or media.

Local evidence includes `resnet152-v1-webgpu.json`,
`resnet-original-mxnet-cpu.json`, `resnet-native-cpu.json`,
`bert-base-uncased-webgpu.json`, `bert-full-pytorch-webgpu.json`,
`bert-int32-derivation.json`, `image-preprocess-results.json`,
`artifact-retrieval.json`, `cors-results.json`, and the CPU/probe logs.
These files are ignored machine evidence; acceptance facts above are retained
here and in the tracked manifest/fixtures.

## Model-specific boundaries

| Source model or example | Actual capability / remaining distinction |
| --- | --- |
| s05 convolution arithmetic | Exact authored numerical workshop; separate from trained full CNN inference. |
| s05 original LeNet-5 | The existing ReLU/max-pool MNIST lab is not original LeNet's scaled-tanh/learned-subsampling/RBF model. No historical original weights or historical benchmark reproduction is claimed. |
| s08 ResNet152 | Complete released v1 model now hardware-verified as above; one inference does not reproduce paper training/benchmark tables. |
| s13 Q/K/V arithmetic | Existing WGSL kernel computes source dot-product attention. It is not by itself a full Transformer. Source rounded weights and full softmax remain distinct. |
| s14 BERT | Complete released MLM now hardware-verified as above. NSP/GLUE heads and benchmark datasets are separate tasks. |
| s14 LXMERT/wav2vec2/ViT and s16 GPT-2/CLIP | Public model families have released variants, but those distinct checkpoints, preprocessing/task heads and source inputs have not been integrated or validated here. They are not declared impossible or equivalent to BERT. |
| s16 GPT-3 175B | The original175B checkpoint was not publicly released. Float32 weights alone would be700GB. A small released GPT model cannot be relabeled as this historical model. |

No historical full-model training, full benchmark reproduction or live publication
is established by a local inference test. Publication and the complete course's
slide/lab/question acceptance remain separate checks.
