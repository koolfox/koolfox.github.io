# دفتر درس یادگیری ژرف

Persian RTL course surface, inheriting the portfolio's Arad, quiet blue and light surfaces. No framework, CDN, tracking, account, paid service or Python runtime in the browser.

## Preview and reproduce

From the repository root:

```sh
python3 -m http.server 8765
# Open http://localhost:8765/deep-learning/
python3 deep-learning/python/logic_gates.py --output deep-learning/assets/data/gates.json
python3 -m unittest discover -s deep-learning/tests -v
```

Python 3.10+ and the standard library suffice. Defaults: seed 7, 6000 epochs, learning rate 1, hidden width 4. All six gates have a hard-threshold perceptron, a single sigmoid baseline, and a sigmoid 2–4–1 MLP. See [the Python source](python/logic_gates.py) and [the numerical methods guide](python/README.md) for implementation details.

The browser loads `assets/data/gates.json`. It does not train a Python model. The slider replays stored checkpoints; displayed losses are actual recorded measurements. Decision-surface values are forward evaluations in JavaScript using the selected checkpoint's actual Python weights and matching activation. The visual grid extends from -0.25 to 1.25 in each coordinate to provide space around the four training corners. Colors outside Boolean corners are model behavior, not Boolean ground truth. Weight diagrams encode magnitude as line width and negative weights as dashed lines; exact weights and biases are available as text.

Perceptron loss is misclassification fraction; its outputs are labels, not probabilities. The differentiable baselines use mean binary cross-entropy. All four possible inputs train the network. Training-domain accuracy is not held-out generalization. A single linear boundary cannot represent XOR or XNOR. The MLP is a chapter 3–4 extension, not the source's preset 2–2–1 ReLU demonstration.

## Curriculum provenance

The seven supplied source files were fully reviewed. They total 446 pages/slides:

- `01-IntroductionFA.pptx`: 44 slides; Persian introduction, instructor دکتر نگار مجمع.
- `02-Artificial Neurons.pdf`: 65 pages; perceptron updates pp. 42–45, worked three-input majority pp. 47–61. The source example uses -1/+1; code deliberately uses consistent 0/1 Boolean labels.
- `03-FeedforwardNN.pdf`: 74 pages; XOR pp. 8–14, nonlinear activations pp. 36–55, output choices pp. 57–71. The preset XOR demo is 2–2–1 ReLU, not the trained sigmoid MLP on this page.
- `04-GradientDescent.pdf`: 82 pages; loss pp. 5–14, gradients pp. 16–28, backpropagation pp. 30–73.
- `05-NNTraining.pdf`: 53 pages; capacity pp. 11–21, validation pp. 23–39, optimizers pp. 41–50.
- `06-Convolutional_unlocked.pdf`: 76 pages; spatial data p. 5, history pp. 7–17, convolution and filters pp. 19–54, activations and stacked layers pp. 55–62, stride/padding pp. 63–66, pooling pp. 68–74. The illustrated operation is cross-correlation (no kernel flip); pooling is not perfectly invariant to every translation. This file introduces no new complete CNN project or dataset assignment.
- `08-Regularization.pdf`: 52 pages; L1/L2 pp. 5–16, early stopping pp. 18–19, augmentation pp. 21–24, dropout pp. 26–40, batch normalization pp. 42–50.

English lectures are attributed to Danna Gurari, CU Boulder, Spring 2022. Page numbers refer to PDF page order, not extracted-line numbers. Source files are not published. No public URL is invented for these private uploads. Chapter 7 was not provided. Historical deadlines and private Canvas exercises are not carried over.

Current course position comes from the owner: chapter 2 gate exercise, beginning chapter 3. The gate exercise was stated by the owner, not verified as an assignment sheet inside the PDFs. No completed assignments, future homework, project title, datasets, models or results are invented.

## Progress and future projects

Browser key: `koolfox.deep-learning.progress.v1`. Schema: `{"version":1,"completed":["chapter-2","exercise-truth"]}`. Only known completion IDs are accepted. Import is size-limited and validated before replacement, requires confirmation, and never inserts HTML. Export contains completion IDs only. Storage failure is visible; corrupt data is not silently treated as valid. Browser completions are separate from the owner's course position.

Future project records can use this schema (initial records are empty, not dummy results):

```json
{"schema_version":1,"items":[]}
```

Each future item should contain `id`, `title`, `kind` (`milestone`, `dataset`, `model`, `result`), `status` (`planned`, `in_progress`, `blocked`, `complete`), `description`, `source_links`, and optional `artifact_url`, `updated_at`. Research records should additionally document license, data split, code revision, metrics and limitations as applicable. Only real supported records should be added; do not turn a planned item into a completed result without evidence.

## Accessibility and failure handling

Keyboard-native buttons/selects/range, explicit labels, focus rings, skip link, RTL layout and isolated technical values. Canvas values have equivalent truth-table and metric text. Reduced-motion preference changes autoplay to immediate final-state display; manual stepping remains available. Playback pauses when the tab is hidden or controls switch runs. Missing or invalid trace shows an explicit error and disables lab controls without disabling study progress. Mobile layout stacks sections without fixed-width tables.

