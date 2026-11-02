# Model execution audit

Audit date: 2026-11-02. This records model computation, independently from slide translation, site deployment, or hardware GPU acceptance.

## Execution available now

`assets/webgpu-attention.js` executes **one query's dot-product attention** on supplied Q/K/V with a real WGSL compute dispatch. It computes scores, stable softmax, and the weighted value sum, optionally dividing scores by `sqrt(d_k)`. It uses float32 and neither trains nor loads model weights. There is no embedding, learned Q/K/V projection, multi-head concatenation, output projection, residual/normalization/feed-forward stack, tokenizer, classifier, or autoregressive decoding loop in this kernel.

The input is the actual worked example in [Gurari, session 13](https://home.cs.colorado.edu/~DrG/Courses/2026-Spring-NN/13-Transformer-Basics.pdf), page 21, visually checked against the local PDF (SHA-256 `a475a840420824879aa29003895f15cfec4c16e35654ff5a289617d8d17b35de`):

```text
Q1 = [1, 0, 2]
Q2 = [2, 2, 2]
Q3 = [2, 1, 3]
K  = [[0, 1, 1], [4, 4, 0], [2, 3, 1]]
V  = [[1, 2, 3], [2, 8, 0], [2, 6, 3]]
```

The source notebook defaults to Q1 and unscaled scores `[2, 4, 4]`. Float64 Python gives weights `[0.06337893833303762, 0.4683105308334812, 0.4683105308334812]` and output `[1.9366210616669624, 6.683105308334811, 1.5950684074995565]`. The source slide's rounded weights `[0, 0.5, 0.5]` instead give `[2, 7, 1.5]`; these are distinct outputs and must remain distinguished. Scaled mode corresponds to the formula on page 38, rather than the unscaled arithmetic of pages 27–29.

## Correctness work and execution evidence

Fixed sparse-array validation. JavaScript `Array.every` skips missing entries; a missing entire key row formerly passed validation and produced plausible finite output. Independently reproduced before the fix with `query:[1], keys:Array(1), values:[[2]], scaled:false`: the old kernel returned scores `[2]`, weights `[1]`, output `[2]`. The fixed kernel checks every position through a dense copy and rejects sparse query vectors, matrix rows, and missing whole key/value rows before requesting an adapter. Ragged dimensions, nonfinite values, entries beyond absolute `1e6`, dimensions/counts beyond 64, and a non-boolean scaled flag are also rejected. A missing browser navigator now gives the intended WebGPU-unavailable message.

Used installed Playwright 1.58.2 / Chromium with `--enable-unsafe-webgpu --enable-unsafe-swiftshader --use-angle=swiftshader`, served the repository on confirmed localhost port 18943, imported the actual module, dispatched the actual compute shader, and read back device buffers. Adapter reported `google / swiftshader`, `fallback:true`. **This verifies software WebGPU execution; no physical GPU was verified.**

Reference values were independently calculated by CPython from dot products, stable `math.exp`, and weighted sums. The source inputs were loaded from the Python workshop and cross-checked visually against PDF page 21. Comparison threshold was `abs(actual-reference) <= 5e-5 * (1 + abs(reference))`, checking every score, weight, output component and result length.

| Case | Maximum absolute difference from Python |
| --- | ---: |
| Source Q1, unscaled | 3.164219695150905e-7 |
| Source Q1, scaled | 2.112343739923972e-7 |
| Source Q2, unscaled | 4.299710818500557e-7 |
| Source Q3, unscaled | 2.6781086059912695e-7 |
| One key, query dimension 2, value dimension 4, scaled | 9.034404335750423e-10 |
| Logits `[1000000,-1000000,0]` | 0 |
| Large negative logits `[-1000000,-999000,-998000]` | 0 |
| 64 identical maximum-magnitude keys, scaled | 5210112 on scores of about 8e12; weights and output match |
| Zero query, uniform attention | 9.934107481068821e-9 |
| Inputs of magnitude 1e-10 | 9.80897582758237e-28 |

All ten cases passed that mixed absolute/relative tolerance. Seventeen malformed-input cases were rejected, including empty/ragged/mismatched arrays, NaN, Infinity, out-of-range values, oversized dimensions/counts, invalid scaled type, and five sparse-array variants. During this audit the runner, reference cases and full results were retained at `/tmp/model-attention-check.mjs`, `/tmp/model-attention-cases.json`, `/tmp/model-attention-results.json`; these are temporary verification artifacts, not published benchmark data.

Float32 is a real limitation, not an exact-real-number guarantee: with `Q=[1e6,1]`, `K=[[1e6,0],[1e6,1]]`, `V=[[0],[1]]`, unscaled Python distinguishes logits `1e12` and `1e12+1`, giving output about `0.73105858`. The verified WebGPU run rounds both logits to `999999995904`, giving weights `[0.5,0.5]` and output `[0.5]`. Stable softmax prevents exponential overflow, but cannot recover score differences lost during float32 accumulation. The existing frontend comparison must report such cases as mismatches; it must never claim universal Python equality from a successful source example. Very small values can likewise underflow in float32.

## Full source models: missing artifacts

Inventory included ignored files beneath `deep-learning`, excluding Python environment `.pth` configuration files. No trained `.pt`, `.pth`, `.onnx`, `.safetensors`, `.ckpt`, `.npz`, or `.npy` model artifacts, original MNIST IDX files, or tokenizer model artifacts were present. The repository contains source PDFs, curated provenance and Python training code, not source-model checkpoints.

| Source surface | Existing execution | What is still required for a faithful full-model run |
| --- | --- | --- |
| Session 05 CNN worked arithmetic | Hand-specified convolution exercise and Python convolution lab | A complete trained CNN checkpoint is separate from this arithmetic. Historical LeNet-5 needs its actual architecture, parameters, preprocessing, class coding and reference input/output. |
| Session 05 historical LeNet-5 | `labs/cnn-mnist/train.py` defines a different, explicitly authored ReLU/max-pool CNN | Original LeNet uses scaled tanh, learned subsampling and RBF outputs, as recorded in the existing source review. The two 3×3 convolution layers and linear head in the lab cannot be labeled original LeNet. No verified historical trained weights are bundled. |
| Session 13 Transformer worked example | Actual source Q1/Q2/Q3 with fixed K/V, one query per call | The worked example has enough numbers for attention, but no complete trained Transformer checkpoint. Random projections would introduce an unrelated model. |
| Session 14 GPT/BERT/LXMERT/wav2vec 2.0/ViT | Slides, tables and architectural explanations | Exact variant/checkpoint, tokenizer or audio/image preprocessing, compatible task head, reference input, framework/runtime, and original-model reference output are absent. |
| Session 16 GPT-2/GPT-3/CLIP | Slides and source examples | Same missing full-model artifacts; reproducing benchmark tables additionally needs the original benchmark data/protocol, not just one inference. |

The MNIST lab can train its own declared model once its locked dependencies and verified IDX data are installed, but no accuracy/checkpoint is invented here. Its manifest records source URLs, checksums and historical retrieval, which does not establish that raw data exists in this checkout. No new dependencies, weights, or raw datasets were downloaded in this audit.

## Concrete faithful continuation

1. Select one exact source model and task, not an arbitrary smaller replacement. For example, source session 14 BERT-Base requires the matching casing/language configuration and task head; session 16 GPT-2 requires the matching released size and tokenizer. The [official BERT repository](https://github.com/google-research/bert) supplies implementation/checkpoint references and identifies its code license as Apache-2.0. The [official GPT-2 repository](https://github.com/openai/gpt-2) supplies code/model references and identifies its license as Modified MIT. Check the exact artifact's terms and retain notices before redistributing it; the slide license does not establish checkpoint or dataset permissions.
2. Pin the upstream revision, architecture/config, tokenizer or preprocessing, checkpoint URL and SHA-256; record download bytes and retrieve the matching artifact deliberately. Publicly available model variants are not interchangeable with a particular published result. For ViT, the [official repository](https://github.com/google-research/vision_transformer) distinguishes ImageNet-21k pretraining, fine-tuned and later AugReg checkpoints; do not silently use a newer AugReg checkpoint to claim the original slide result.
3. Run the original implementation on a fixed source-compatible input and save token IDs/preprocessed tensor plus intermediate/final outputs. Export or implement that same graph in the chosen browser runtime and verify its tensors against the reference before exposing prediction scores. Quantization changes must be declared and independently checked.
4. Budget actual memory on the target adapter before fetching large browser assets. Float32 parameter storage alone is `4 × parameter_count` bytes, excluding activations, copies, tokenizer and KV cache. The slide's 175B GPT-3 scale would require 700 GB for float32 weights alone; it cannot be equated to the current tiny attention shader. Runtime operator coverage and `maxBufferSize`/`maxStorageBufferBindingSize` must also be checked for the chosen full graph. No device capacity or performance result has been established here.
5. Preserve an offline CPU reference and report browser/device/precision separately. A confirmed local software-adapter result, physical GPU result, complete-model inference, benchmark reproduction and live publication are separate acceptance claims.

Primary upstream repository pages above were checked on the audit date. No full-model inference, full-model training, historical benchmark reproduction, physical GPU execution, or public deployment is claimed by this document.
