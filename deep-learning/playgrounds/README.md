# Live Python laboratories

The neuron/XOR laboratory runs real Python training through Shiny. The static
release uses Shinylive/Pyodide; it does not replay precomputed training frames.
`TrainingRun` shares the numerical rules of `python/logic_gates.py` and exposes
bounded, reproducible stepping. The JavaScript canvas only evaluates published
weights to draw the surface; training and reported metrics remain in Python.

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
and mobile overflow. The October 25, 2026 browser check reproduced the direct
Python weights exactly after 137 epochs; canvas predictions differed by at most
`1.12e-16`. This is local artifact evidence, not deployment evidence.

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
