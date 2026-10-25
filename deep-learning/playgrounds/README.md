# Live Python laboratories

The neuron/XOR laboratory runs real Python training through Shiny. The static
release uses Shinylive/Pyodide; it does not replay precomputed training frames.
`TrainingRun` shares the numerical rules of `python/logic_gates.py` and exposes
bounded, reproducible stepping. The JavaScript canvas only evaluates published
weights to draw the surface; training and reported metrics remain in Python.

```sh
uv sync --project deep-learning/playgrounds --frozen
uv run --project deep-learning/playgrounds python deep-learning/scripts/export_playgrounds.py --output deep-learning/results/shinylive
python3 -m http.server 8768
```

Open `/deep-learning/results/shinylive/neuron-xor/` on that local server. The output
directory must be empty. Export stages the shared Python modules and the existing
Arad font, then includes only the runtime packages required by the application.
Generated runtime files stay outside Git; Pages builds them from the locked tools.

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

References: [Shinylive](https://shiny.posit.co/py/get-started/shinylive.html),
[reactive scheduling](https://shiny.posit.co/py/api/core/reactive.invalidate_later.html),
[JavaScript initialization](https://shiny.posit.co/r/articles/build/js-events/).
