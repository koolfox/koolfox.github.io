# Numerical core for the live neuron/XOR laboratory

`logic_gates.py` supplies the network, truth tables and metrics used by
`live_training.py` and the Shiny application in `../playgrounds/neuron-xor/`.
The former recorded replay interface and its public dataset have been retired.

Requires Python 3.10+ and its standard library. No packages, internet, GPU, paid
service, or account are needed.

From the repository root:

```sh
python3 -m unittest discover -s deep-learning/tests -v
```

For an optional standalone training experiment and local JSON export:

```sh
python3 deep-learning/python/logic_gates.py --gate XOR --epochs 6000 --lr 1 --seed 7 --hidden 4 --output /tmp/xor.json
```

`--gate` selects all six gates by default. Each selected gate trains three
separate models. `--epochs`, `--lr`, `--seed`, `--hidden`, and `--grid-size`
control the actual Python run; hidden width only affects the MLP.

## Threshold perceptron

The `perceptron` model follows the sample-wise learning rule:

1. Compute `z = sum(weight[i] * input[i]) + bias`.
2. Predict 1 if `z >= 0`, otherwise 0.
3. Compute `error = target - prediction`.
4. Update each weight by `learning_rate * error * input[i]`.
5. Update bias by `learning_rate * error`.

One epoch visits all four input rows in the fixed truth-table order. The
exported loss is the misclassification fraction evaluated after each sampled
epoch, **not** binary cross-entropy. Its output is a class label, not a
probability. The `probabilities` export key is retained to share a UI schema;
`config.output_kind` makes this distinction explicit.

AND, OR, NAND, and NOR are linearly separable. XOR and XNOR are not, so a
single perceptron cannot classify every row, regardless of training duration.
There is no early stopping, letting the histories show unsuccessful cycling.
`train_majority()` provides a separate three-input majority example using the
same update rule, starting from zero weights and bias.

## Sigmoid models

`linear` is a **single sigmoid neuron**, trained by full-batch gradient descent
on mean binary cross-entropy. It is a differentiable baseline, distinct from
the threshold perceptron rule. `mlp` has the architecture 2–4–1 by default and
sigmoid activations at both layers, trained by explicit backpropagation. This
is an original experiment, not a reproduction of a particular lecture example.

Initialization uses a seeded local RNG and Xavier-uniform weights; biases
start at zero. Output BCE uses the stable logit expression. Its output delta
is `probability - target`; hidden deltas multiply by `a * (1 - a)`. Gradients
are averaged across the four input rows before each simultaneous update.

There is no guarantee that arbitrary seeds, widths, learning rates, or epoch
counts will converge. The provided seed 7, width 4, learning rate 1, and 6000
epochs were actually run and tested. Default MLP training learns all six truth
tables. Linear sigmoid XOR/XNOR converge toward probability 0.5, with BCE near
ln(2); their displayed accuracy at this threshold can depend on tiny floating
point differences and is not evidence of a meaningful classifier.

## Optional local export

The CLI exports actual training results to the requested local path. This file
is not a website dependency. Metadata records the source SHA-256 and Python
version. Repeating the same command with the same source/interpreter produces
identical JSON. No generated timestamp changes the output unnecessarily.

- Inputs: `[0,0]`, `[0,1]`, `[1,0]`, `[1,1]` in that order.
- `gates[GATE].models[MODEL]` stores architecture, config, history, checkpoints,
  and final results. Available models: `perceptron`, `linear`, `mlp`.
- Weights: `[layer][output_neuron][input_neuron]`; biases: `[layer][output_neuron]`.
- `history` starts at epoch 0 and ends at the configured epoch count. Each
  value is measured from the actual model after that many full training passes.
- Each checkpoint contains complete weights, biases, and all four outputs.
- Surface coordinates lie in `[0,1]`; the probability/class grid is indexed
  `[y_index][x_index]`. Saved parameters allow exact intermediate surfaces.
- Threshold is `>= 0.5` for sigmoid models, `>= 0` on logits for perceptrons.

The four Boolean inputs are the complete domain and training set; accuracy is
training-domain accuracy, **not** held-out generalization. Surface values
between Boolean corners illustrate learned interpolation, not ground-truth
gate behavior. The live laboratory trains its own model in browser Python;
it does not load these optional exports.

## Tests

Offline tests verify all six truth tables, stable sigmoid/BCE, finite-difference
weight and bias gradients (including two hidden layers), deterministic seeds,
MLP convergence, perceptron separability and exact update equation, majority,
XOR baseline limits, zero-epoch behavior, checkpoint copies and invalid parameters.
`test_live_training.py` also checks live updates against this numerical core.
