# Spring 2026 Python example audit

Bounded audit of the 21 existing workshop scripts. These are inspectable teaching calculations, not reproductions of the cited papers' experiments. No missing checkpoint, dataset, trained model, GPU computation, or external evaluation was fabricated. PDFs and their printed numbers were not edited.

## Source mapping and claims

Read each workshop's mapped source-page text and translated figure-label inventory. Direct visual inspection focused on numerical figures: s03 pp73,75,76; s05 p27; s09 p52; s11 p22; s12 pp28,31; s13 pp21,28; s14 p54; s16 p13. Also checked source extracted lines for s03 pp54,57,68–84; s05 pp27–36; s12 pp28–32 and the mapped page for every other workshop. This is not a claim that every page in every PDF was visually inspected.

| Workshop | Source pages | What is actually calculated |
|---|---|---|
| s01 | 40–43 | Independently authored threshold/train/test data demonstrating source data split. |
| s02 | 26–27 | Source perceptron update rule, independently authored two-feature sample. |
| s03 | 54–57; 68–84 | Source f=a+bc at (1,−2,3), then the actual source 3→2→1 sigmoid network with all 11 source weights/biases and input [1,0,1], target 1. |
| s04 | 27 | Now uses actual source sequence [1,0,1,1], u=3, initial state +1, encoded input signs; exact tanh rather than replacing states with ±1. |
| s05 | 27–36; 42 | Independently authored 2×2 shared-weight example plus actual source 5×5 input and 3×3 filter. |
| s06 | 25 | Source training-only standardization procedure; independently authored data. Population SD is explicit. |
| s07 | 38 | Actual n=11, individual error .25, majority threshold 6; explicit independence assumption. |
| s08 | 40 | Source residual identity-loss structure, independently authored scalar parameters. Does not implement/train ResNet. |
| s09 | 52 | Actual nine source decimals and four-entry codebook, nearest-code quantization and complete bit accounting including table storage. |
| s10 | 22–23 | Actual [0,1;2,3] input/kernel; stride 1 and 2 output arrays. |
| s11 | 22 | All ten source answer strings and source leave-one-out VQA scoring. Intentionally not a full official VQA text normalizer. |
| s12 | 26; 28–32 | Actual four-vector dot products [2,0,3,3], exact softmax and context vector. |
| s13 | 21; 28; 38 | Actual first query, three keys/values; exact attention, optional dimension scaling, separately labelled source approximation. gpu_inputs retained. |
| s14 | 53–54 | Actual 160×160 image /16×16 patches; ordered pair counts, separately with CLS; actual full-HD pair count. Not total model FLOPs. |
| s16 | 13 | Source power-law exponents .050,.095,.076; algebraic relative-loss calculations, not a joint scaling fit or performance guarantee. |
| s17 | 23 | Independently authored response paths illustrating source self-consistency mechanism, explicit tie result; no model is called. |
| s18 | 16 | Source W+BA algebra, independently authored rank-one matrices; no pretrained LoRA model or training. |
| s23 | 54 | Independently authored three-expert logits/outputs illustrating source routing formula; no DeepSeek expert network or resource measurement. |
| s24 | 34 | Independently authored confusion counts, conditional fairness rates; no real population or safety conclusion. |
| s26 | 8 | Independently authored 1D farthest-first coreset illustration; does not reproduce s1 dataset/training. |
| s31 | 11; 18 | Independently authored accuracy/energy constraints and Pareto comparison; no real model measurements. |

s03 and s05 lab titles, opening source-page mappings and steps now explicitly include the newly calculated source examples. Existing quiz IDs and answers remain valid.

## Exact calculations, printed approximations, conventions

- s03 source parameters: w14=.2,w24=.4,w34=−.5,b4=−.4; w15=−.3,w25=.1,w35=.2,b5=.2; w46=−.3,w56=−.2,b6=.1. Exact forward: o4=.33181222783183395, o5=.52497918747894, o6=.47388889882398544; full squared loss=.2767928907806386.
- s03 p75 explicitly says it drops constant factor 2. Therefore source numerical backprop values are half-square gradients, not the literal full-square derivatives. The code reports both `source_scaled_gradients` and `squared_error_gradients`, and preserves printed .332,.525,.474,.277,−.1311,.0087,.0065 under `source_printed`. These printed/intermediately rounded values do not feed the calculation. Exact e6 for the half-square convention is −.1311690782143445. Halving the learning rate for full-square gradients gives the identical step. This is a source convention, not an undisclosed source correction.
- s05 source feature map: [[4,3,4],[2,4,3],[2,3,4]]. Page36 leaves the final entry as a question; 4 is calculated from the displayed arrays. Existing independent 2×2 example has four weights; source 3×3 has nine. Counts now derive from the actual kernel instead of hardcoding 4. Operation remains cross-correlation, with no kernel flip.
- s09 cost: original 288 bits; index storage 18 bits; codebook 128 bits; total146bits, ratio288/146. Exact decimal squared-error check gives .0849/9.
- s12 source .15,.02,.41,.41 is printed rounding; exact probabilities sum to1. Their printed rounded sum .99 is not imposed on the implementation.
- s13 exact first weight is .0633789…, not zero. Source [0,.5,.5] gives [2,7,1.5] and remains a separate approximation. It is now returned only for the exact original unscaled query/key/value case. Changed query, scaling, dimensions or key/value counts return None for that source approximation; the exact calculation and gpu_inputs remain valid. No fixed-length approximation is silently zipped against modified data.
- s18 rank is deliberately1. Other ranks are rejected instead of pretending the first factor row is a general BA product.
- s23 raw selected probabilities are deliberately not renormalized; this convention is explicit. Selected mass can be below1. Setting top_k to every expert reproduces the dense sum.

## Concrete editable-parameter fixes

Explicit, beginner-readable Persian errors now prevent silent shape truncation in perceptron dot products, standardization, attention, LoRA and transposed convolution. Cross-correlation supports rectangular kernels and computes its weight count. Invalid/empty/ragged matrices and nonpositive stride are rejected. Constant standardization features get an explanatory error instead of division by zero. Even/nonpositive voter counts and probabilities outside[0,1] are rejected in the tie-free ensemble example. Invalid patch size/divisibility, loss-ratio domain, negative/over-budget response paths, noninteger top_k, nonfinite attention/router inputs, and zero/invalid coreset budget are rejected. VQA leave-one-out explicitly requires the source's ten answers. These are scoped teaching-input checks, not a general numerical-array library.

## Independent validation

`python3 -m unittest discover -s deep-learning/tests -p test_workshop_numerics.py -v`:20 tests pass. Tests include all11 backprop parameter central differences (full-square gradients), zero-input gradients, learning-rate/factor2 equivalence, the source convolution grid, rectangular filters, a cross-correlation/transposed-convolution adjoint identity, transpose mass conservation, exact Fraction quantization arithmetic, attention softmax/convex-hull invariants and four-key modifications, training-statistic isolation/population variance, exhaustive Bernoulli voting outcomes, exact source VQA counts, LoRA zero-adapter recovery, routing temperature/dense identity, ViT ordered-pair counts, scaling-law inversion, tie/budget handling, parity over all16 four-bit sequences, residual closed-form recurrence, fairness conditional-rate counterexample and Pareto ties/dominance.

`python3 deep-learning/scripts/workshops.py --term spring-2026 --execute`:21 workshops /63 questions pass. Every changed script's starter_sha256 and reference were regenerated by execution on Python3.13.9. Unchanged reference provenance is retained. This reference consistency check supplements, and does not replace, the independent numerical tests. No site build, commit, push, or deployment is included in this audit.

## Source-page notebook follow-up

Added two independent, directly executable scripts for source-page notebook mapping. `s03_backprop.py` contains only the source 3→2→1 network calculation; `s05_source_convolution.py` contains only the source 5×5 input/3×3 stencil calculation. The main workshops are retained. Each main unit now has one `source_examples` entry with a unique ID, Persian title, precise page list, standalone code filename, executed SHA-256/reference, source-specific limits/prediction, and three original multiple-choice questions tied to that example.

For this follow-up, rendered and visually inspected EVERY listed source page: s03 pages68–84 and s05 pages27–36. All show the same worked network/stencil through its successive steps. The source p36 final `?` is answered by direct stencil arithmetic, not treated as a printed answer. The displayed p75 deliberate factor2 removal remains explicit in the standalone network script.

22 independent numerical tests now pass, including all11 standalone backprop central differences and standalone stencil linearity. Both standalone scripts additionally passed isolated Python execution with exact metadata SHA-256/reference matching and three valid source-page multiple-choice questions each. Site notebook publication and browser acceptance remain root integration responsibilities.
