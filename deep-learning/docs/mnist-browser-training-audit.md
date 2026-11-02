# Live MNIST training acceptance

Verified locally2026-11-02; publication is a separate check.

## Real data and computation

The page `/playgrounds/cnn-mnist/train/` trains a small authored CNN from seeded
initial weights. It is not a pretrained inference demo, historical LeNet-5,
or a replay of saved metrics. The current training batch, held-out gallery,
probabilities, first-layer feature maps and3×3weights come from actual data and
the current model. Plots use actual completed gradient updates and epoch-end
validation. Model/data initialization begins only on the explicit button.

The fixed balanced subset has2,000training images and500validation images,
all from MNIST's official60,000-image training partition. Every original IDX
index is retained. Train/validation indices are disjoint and contain200/50images
per digit. The official10,000-image test partition is not opened. This is
image-level separation; writer independence is not claimed. The manifest pins
the original archive bytes, MD5/SHA-256, retrieval/verification time and generated
artifact hashes. The actual publisher dataset card declaresMIT; its exact
revision/hash and author attribution are retained with the data.

Preprocessing is grayscale uint8→float32/255, NHWC `[N,28,28,1]`. The model is
Conv3×3/same/8→activation→MaxPool2→Conv3×3/same/16→activation→MaxPool2→Flatten→
Dense10/softmax,9,098parameters. Activation choices ReLU/tanh/sigmoid actually
change both convolution layers. Adam uses the selected learning rate,
beta1=.9/beta2=.999/epsilon=1e-7; batch size16/32/64 is real. Browser kernels use
float32, with explicitly seeded Glorot initializers and deterministic seeded
shuffle order. Repeated reset restores the same initial weights on this runtime.

## Hardware training evidence

TensorFlow.js4.22.0 and its matching WebGPU backend are vendored from official
NPM archives, whose SHA-512SRI was checked. File hashes, archive sources and
Apache2license are retained. Dynamic scripts also carry SHA-256SRI.

An isolated Chromium145 session used a GPUDevice requested from the actual
Apple/metal-3 hardware adapter (`fallback:false`). That same device is passed
to the TensorFlow.js WebGPUBackend constructor. `WEBGPU_CPU_FORWARD=false`
disables its optional small-operation CPU forwarding. The active backend must
match the explicit selection. Unsupported GPU execution raises an error; CPU
is a separate visible user choice. A missing-WebGPU probe raised the intended
error; separately selecting CPU performed a real finite-loss gradient update
and changed weights (loss2.2885144). Host image conversion, shuffle, metric
aggregation and chart rendering remain host work.

A real63-update epoch at batch32 on the2,000-image training subset produced:

| Measurement | Value |
| --- | ---: |
| Initial validation cross-entropy | 2.3134215125 |
| Initial validation accuracy | 8.4% |
| Epoch1 online training cross-entropy | 1.7924300041 |
| Epoch1 online training accuracy | 47.95% |
| Epoch1 validation cross-entropy | 1.0058831474 |
| Epoch1 validation accuracy | 70.4% |

These are one run's500-image validation measurements, not official test accuracy
or a benchmark claim. The final smaller batch has16images; all2,000training
images contribute exactly once per epoch. Online training loss/accuracy are
sample-weighted and measured before each update. Validation is evaluated with
the final epoch weights; the two measurements have different meanings.

## Python correctness

The code tab shows four stacked highlighted cells (data/model/one-epoch learning/
execution and validation), with environment/download plumbing folded separately.
Meaningful Persian comments explain forward pass, gradient clearing, backpropagation
and Adam updates. No Python run button is implied.

The downloadable `labs/cnn-mnist/browser_train.py` is short commented PyTorch
code using the same frozen subset, pixel scale, topology, activation, batch size
choices, cross-entropy and Adam settings. Its forward method explicitly permutes
NCHW→NHWC before flattening, matching the browser feature order. Softmax is
included inside PyTorch's cross-entropy rather than applied twice.

Independent random initializers/shuffle generators differ between libraries;
the UI and Python file state that their fresh training scores need not match.
The Python script actually ran one epoch, measuring validation loss0.8290082
and accuracy73.8%. Separately, the exact browser initial weights were mapped
HWIO→OIHW/IO→OI into this same Python CNN. All200gallery probabilities match
the real WebGPU output to maximum absolute error2.9802322e-8. This verifies
inference equivalence for identical weights; it does not claim identical random
training trajectories. `scripts/check_mnist_browser.py` reproduces that check.

## Interaction and design evidence

The actual-GPU browser acceptance script checks no automatic image download,
real32-image current batch,20held-out gallery samples, single-batch weight
changes, pause with no additional updates after the current batch, resume to
one epoch,63real curve points,8feature maps/8filters, highlighted Python code,
mobile overflow and exact seeded reset. The exported run includes configuration,
actual weights/metrics, current view, baseline and source index/hash manifest.
Page teardown aborts loading and releases the model after any active batch.

Desktop1080×800 and mobile390×780 were inspected together, then mobile axis
labels received one readability correction and a confirmation capture. The
existing light blue/Arad/RTL world remains intact; no replacement logo or design
system was added. The Impeccable detector returned no non-advisory findings.
This is a bounded local interface review, not independent whole-course approval.

`browser-tests/mnist-training.mjs` reproduces the complete UI/GPU check against
a built site (`MODEL_VALIDATION_URL`). `tests/test_mnist_browser.py` checks frozen
data integrity, class balance, original-index disjointness, source scope and
output-only/lazy page generation without downloading data. Local detailed
snapshots, captures and PyTorch comparison are ignored under
`results/mnist-browser/`. No weights or accuracy are invented when training fails.
