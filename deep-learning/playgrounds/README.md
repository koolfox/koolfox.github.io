# Live Python laboratories

The neuron/XOR laboratory runs real Python training through Shiny. The static
release uses Shinylive/Pyodide; it does not replay precomputed training frames.
`TrainingRun` shares the numerical rules of `python/logic_gates.py` and exposes
bounded, reproducible stepping. Python evaluates the decision grid and the
forward traces used by the JavaScript canvas. Editing the Python forward function
therefore changes the actual surface and displayed activations, as well as the
training implementation. The browser does not substitute a second model.

## Code beside the experiment

The three exported labs share a full-height workspace: persistent run controls
and metrics, a settings column with contextual help, and three result/guide tabs.
On phones, settings and code replace the result panel instead of stacking below
it. Larger content scrolls within its panel; the page itself stays in view.
Existing `/playgrounds/{lab}/` links enter this workspace directly; the detailed
guide remains at `/playgrounds/{lab}/guide/`.

Open «کد کنار آزمایش» to edit the actual Python sources. The default
`experiment.py` contains Persian comments explaining configuration, functions
and execution. Topic shortcuts also open the real forward, gradient and optimizer
implementations. Opening code pauses active training. Closing the panel keeps
the draft; it does not resume training automatically.

- «تنظیمات فعلی به کد» copies the current GUI configuration into the marked
  configuration block, preserving other algorithm edits and comments.
- «اجرای کد» applies all source drafts and reloads the page into a fresh Python
  Worker. It starts a new experiment from the initial state, not the old weights.
- «کد اولیه» restores the selected file only; explicit execution is still needed.
- The file download contains the selected draft. The native experiment JSON
  instead contains the **executed** Python files and their SHA-256 under
  `source_files`, together with the numerical record.
- «توقف اجرای پایتون» unloads the Worker, including an infinite user loop, and
  preserves the draft for repair. This differs from pausing the training loop.
  Syntax errors expose the Python console and leave the editor available.

Drafts and applied sources are separate in tab-scoped `sessionStorage`; they are
not uploaded or synchronized. Storage failures block an apply/reload rather than
silently discarding edits. Editing one equation does not automatically rewrite its
derivative or loss: the code guide explains this responsibility and distinguishes
the original model labels from a custom implementation.

Neural graphs support node selection by pointer or arrow keys, with actual Python
activation, incoming weights and bias. Selecting a plotted dataset point changes
the probe to that real point. The explicit layer animation retains reduced-motion
support. Convolution keeps input/filter selection together and exposes each actual
product, activated output and pooling result in its calculation tab.

## Numerical scope

The network playground uses the dependency-free `python/network_playground.py`
engine. Four balanced synthetic classification datasets, Gaussian input noise,
seven input features, zero to three hidden layers of up to eight units,
tanh/ReLU/sigmoid and SGD/momentum/Adam expose the train/validation distinction.
The stratified split is approximately 60/20/20; generation, splitting,
initialization and batch shuffling use separate seeded streams. Finalization
reveals test points and metrics and prevents further training in that run.
This is an educational access boundary, not a claim that browser data are secret.
Reusing a revealed test split for tuning invalidates independent evaluation.

Both plotted losses are mean binary cross entropy, computed stably from logits.
The training objective additionally includes `lambda * sum(abs(w))` for L1 or
`lambda * sum(w*w)/2` for L2; biases are not penalized. Adam uses bias-corrected
moments with beta1=0.9, beta2=0.999 and epsilon=1e-8; momentum uses
`v = 0.9*v + gradient`. Browser training is explicitly bounded and pauses after
ten seconds or when the page is hidden. Dataset size is limited to 400 and the
maximum epoch budget is 3000.

```sh
uv sync --project deep-learning/playgrounds --frozen
uv run --project deep-learning/playgrounds python deep-learning/scripts/export_playgrounds.py --output deep-learning/results/shinylive
python3 -m http.server 8768
```

Open `/deep-learning/results/shinylive/neuron-xor/` on that local server. The output
directory must be empty. Export stages the shared Python modules and the existing
Arad font, then includes only the runtime packages required by the application.
Generated runtime files stay outside Git; Pages builds them from the locked tools.
The second application is `/deep-learning/results/shinylive/network-playground/`.
Both exports use the existing laboratory stylesheet and local Arad font.
The convolution application is `/deep-learning/results/shinylive/convolution/`.
It computes a single chosen filter, kernel flipping, zero padding, stride, ReLU
and unpadded pooling. Every output cell retains its input coordinates, coefficient
and product; selected inputs and zero padding are marked in the table. Displayed
numbers use three significant digits; downloaded values retain full precision.
This laboratory operates on one channel and one manually edited 3×3 filter.
It does not train a CNN. The independent numerical module also supports summed
input channels, with a separate test ensuring that the bias is added only once.

For native Shiny development, stage the same inputs first:

```sh
uv run --project deep-learning/playgrounds python deep-learning/scripts/export_playgrounds.py --stage-only --output deep-learning/results/native
uv run --project deep-learning/playgrounds shiny run --host 127.0.0.1 --port 8769 deep-learning/results/native/neuron-xor/app.py
```

Validation covers numerical parity with the recorded Python trainer, stable
reset/seed, bounded inputs, real browser execution, one-step/play/pause/reset,
and mobile overflow. Workspace acceptance also changes the real optimizer,
changes Python forward output, captures GUI settings, checks recorded source,
and recovers from syntax errors and infinite loops. See
`docs/interactive-workspace-acceptance.md` for the local acceptance boundary.

All four Boolean inputs are training data. Accuracy on them is not an estimate
of generalization. The two-input experiment is independently authored and is
distinct from the source slides' three-input signed-label majority example.

The network engine has central-difference checks for every weight and bias across
all three activations and all penalties, an independent first-step Adam check,
stable saturated-logit BCE, reproducible stepping, and an invariant that mutating
the held-out test cannot change training, validation or an unsealed download.
The browser check compares weights, train/validation loss and canvas predictions
with native Python after 13 epochs; it also verifies final-test sealing, JSON
download, reset, invalid input and mobile overflow. This is small synthetic-model
evidence, not a claim of performance on real-world data.

The convolution browser check compares every output, product and pooling window
with native Python, exercises mathematical kernel flipping, verifies click and
numeric selection bounds, checks a real experiment download, clears invalid
results, and checks mobile overflow with padding two. Shiny converts custom
array inputs to tuples; the cell-selection handler explicitly accepts them.

References: [Shinylive](https://shiny.posit.co/py/get-started/shinylive.html),
[reactive scheduling](https://shiny.posit.co/py/api/core/reactive.invalidate_later.html),
[JavaScript initialization](https://shiny.posit.co/r/articles/build/js-events/).
Optimizer reference: [Adam, Algorithm 1](https://arxiv.org/abs/1412.6980).
