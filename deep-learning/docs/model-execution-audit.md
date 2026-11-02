# Model execution audit

Validated 2026-11-02. This records actual inference, independently of publication,
slide coverage, training and historical benchmark reproduction.

## Complete released models executed on hardware WebGPU

All four models ran through the production `assets/model-runtime.js` API using ONNX
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
| Full ViT-B/16-224, s14 pp47,56 | Exact released PyTorch checkpoint, NASA photograph | All1,000 logits | 5.2452087e-6 WebGPU |
| Same ViT external-data graph | Same PyTorch CPU reference | All1,000 logits | 5.4836273e-6 native ONNX CPU |
| Full CLIP ViT-B/32, s16 pp25,40 | Original released PyTorch CLIPModel, exact source dog and four prompts | All2,568 image/text embedding, cosine and logit values | Logits1.7166138e-5, cosine1.6391277e-7 WebGPU |

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

## ViT: full vision Transformer with original external weights

The full released [Google ViT-B/16 checkpoint](https://huggingface.co/google/vit-base-patch16-224/tree/3f49326eb077187dfe1c2a2bb15fbd74e6ab91e3)
uses12blocks/12heads/hidden768,16×16patches, and224×224RGB input (196patches
plus CLS). It has86,567,656parameters. Its published lineage is JAX→timm→
Hugging Face Transformers; the independent reference uses this exact released
PyTorch conversion, including its pinned layer-normalization epsilon1e-12.
It is ImageNet-21k pretrained and ImageNet-1k fine-tuned. It is not the private
JFT303M checkpoint or a reproduction of the source benchmark points.

`models/export_vit.py` exports a1,021-node graph and verifies all200initializer
byte ranges against the original346,293,852byte safetensors file. All346,270,624
parameter bytes remain unchanged. The small246,427byte ONNX graph points directly
into the safetensors file, including its header offset. The browser verifies both
files, mounts the original weights with ONNX Runtime's externalData API, and
creates a strict-GPU session. No huge converted checkpoint is published.

The fixed input is a real NASA public-domain photograph from scikit-image, with
attribution, immutable source revision, hash and preprocessing recorded in
`vit-image-source.json`. All1,000GPU logits agree with PyTorch to5.2452087e-6.
This is numerical inference validation, not a claim that the predicted class
is ground truth or that a benchmark accuracy was measured. Reference and uploaded
photos both work in the existing interface; edited input does not receive a false
reference-agreement label.

ViT's preprocessing differs from ResNet: **resize the entire RGB image to224×224**
using Pillow-compatible bilinear filtering, without a center crop, then normalize
with mean/std`[.5,.5,.5]`. Four independent Pillow preview fixtures match every
pixel. The source reader maps this full-model tool to architecture/fine-tuning
pages47and56, preserving the160px arithmetic exercise and private-JFT discussion.

Local graph/reference downloads carry their SHA-256 as a cache key; the catalog
revalidates, and model entry scripts include content-derived module versions.
Immutable remote checkpoint URLs remain unchanged.

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
browser artifacts are241,816,206bytes ResNet ONNX,532,091,246bytes BERT ONNX,
and346,293,852bytes ViT safetensors plus its246,427byte graph.
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
| s14 LXMERT/wav2vec2 and s16 GPT-2/CLIP | Public model families have released variants, but those distinct checkpoints, preprocessing/task heads and source inputs have not been integrated or validated here. They are not declared impossible or equivalent to BERT. |
| s14 ViT | Complete released B/16-224 classifier hardware-verified above; the private JFT checkpoint and source training benchmarks remain distinct. |
| s16 GPT-3 175B | The original175B checkpoint was not publicly released. Float32 weights alone would be700GB. A small released GPT model cannot be relabeled as this historical model. |

No historical full-model training, full benchmark reproduction or live publication
is established by a local inference test. Publication and the complete course's
slide/lab/question acceptance remain separate checks.

## Full CLIP image/text inference

The pinned official `openai/clip-vit-base-patch32` revision is
`3d74acf9a28c67741b2f4f2ea7635f0aaf6f0268`. Its original605,247,071-byte
PyTorch ZIP SHA256 is
`a63082132ba4f97a80bea76823f544493bffa8082296d62d71581a4feff1576f`.
Both complete12-layer learned towers, both512-dimensional projections, L2
normalization and learned logit scale run on strict WebGPU. The2036-node graph
mounts original ZIP storage bytes as external initializers: shared Q/K/V storage
offsets are preserved, and the two transposed projection views use graph
Transpose nodes. Every referenced tensor byte was checked during export; no
converted large checkpoint is hosted. The tiny graph's pinned digest is recorded
in the catalog. The model contains151,277,313 parameters.

The source-page40 dog photograph is the exact embedded RGB image X16 from page2
of Radford et al., PMLR139,2021; `clip-image-source.json` records paper/image hashes
and attribution. It is separately CC-BY4.0 under the PMLR publication agreement,
not the site's MIT code license. `extract_clip_source.py` reproduces extraction
from the checksum-verified original paper. The four source prompts compare a
plane, car, dog and bird. Actual dog relative probability is0.99738596; this is
relative only to these four prompts, not calibrated certainty or a benchmark.

The official Hugging Face pure-JavaScript tokenizer0.2.0 is pinned and vendored
with Apache2 license and archive integrity. All source and Unicode token fixtures
match the independent official Rust tokenizer. Four Pillow bicubic image fixtures
match byte-for-byte; input normalization uses the exact published CLIP mean/std.
Host tokenization selects the first EOT and supplies a one-hot mask; GPU
multiply/reduce performs equivalent EOT pooling without int64 GPU indices.
Exactly four candidate strings are supported in this fixed graph; over77tokens
is rejected without silent truncation.

Independent original PyTorch forward and CPU exported graph agree across all
2568outputs (maximum logit error1.7166138e-5). Actual Apple Metal WebGPU through
the production API agrees to the same logit bound; image/text embedding errors
are4.656613e-7/2.384186e-7. UI acceptance checks explicit download, source-order
cosines/probabilities, uploaded photograph preprocessing, edited prompts, no
false reference comparisons, length validation and mobile overflow. Default
reference comparisons are shown only for the exact default tensor and prompts.
Evidence is retained in ignored `results/model-validation/clip-*` files.

Reproduction: run `models/fetch_artifacts.py` explicitly; extract the source image
with `models/extract_clip_source.py` (pypdf/Pillow), run
`models/prepare_clip_fixtures.py` and `models/export_clip.py` in the pinned model
validation environment, then `node models/validate_webgpu.mjs clip-vit-base-patch32`.
No training, historical paper benchmark, largest CLIP variant or CPU fallback is
claimed by this inference demonstration.

## Readable Python reference cells

Each of the four model pages offers an optional code view: four stacked cells,
syntax highlighting, Persian operation comments, a folded environment setup and
a complete downloadable `.py` file pinned by SHA256. The ordinary model view
remains the default. These scripts execute in an external Python environment;
there is no simulated Python browser execution button. ResNet uses native ONNX
Runtime CPU with the exact released MXNet checkpoint; BERT, ViT and CLIP use the
pinned official PyTorch/Transformers checkpoint and eager attention. The teaching
code does not expose the advanced ONNX storage/export machinery as student code.

All four scripts were actually executed against the exact cached checkpoints and
default source inputs. BERT mask logits, ViT1,000 logits and CLIP four logits match
the independent Python reference exactly; ResNet1,000 logits differ by at most
2.861023e-6 from the released golden tensor. Evidence is in ignored
`results/model-validation/student-python-code.json`. A real browser check covers
all four pages: optional code loading, four highlighted cells, external Python
label, download hash, scrollable code area, mobile overflow and return to model.
