# از صفر تا GPT — Karpathy learning surface

An interactive Persian study surface for Andréj Karpathy's
[Neural Networks: Zero to Hero](https://github.com/karpathy/micrograd) course.

The eight lectures are the curriculum; the workbench is the product. A visitor
types an expression, watches the DAG assemble, and watches the gradient travel
backwards through it — the same numbers the upstream `micrograd` produces.

## What is on the page

1. **The eight lectures** — thumbnail, duration, topic and a predict-then-run
   exercise for each session.
2. **The autograd workbench** — a faithful port of `micrograd` in
   `assets/js/engine.js`: scalar `Value` nodes, a dynamically built DAG, a
   topological `backward()` pass. Operators `+ - * / **`, functions
   `relu tanh exp log sqrt abs`, variables `a b c`.
3. **The roadmap** — the four-step study method, the research-topic ladder and
   the progress tracker.

## Integrity

`assets/js/engine.js` is checked against the reference example in the upstream
README on every page load. The engine must reproduce `24.7041`, `138.8338` and
`645.5773` for `a = -4`, `b = 2`; if it does not, the page says so instead of
showing numbers the real engine would not produce.

Every prediction answer was computed from that same source or from the
arithmetic the lecture teaches: `29`, `337`, `17`, `0`, `1`, `104`, `0.125`,
`44`.

## Progress

Reading progress and answered exercises live in the reader's own browser, under
the local-storage key `koolfox.karpathy.progress.v1`. Nothing is transmitted,
and the page offers a button to clear it.

## Files

```
karpathy/
├── index.html                     # the page
├── PRODUCT.md                     # product truth for this surface
├── README.md                      # this file
├── assets/css/karpathy.css        # surface styles
├── assets/js/engine.js            # the micrograd engine (no DOM access)
├── assets/js/karpathy-data.js     # lecture exercises and presets
└── assets/js/karpathy-lab.js      # page behaviour
```

The engine module is deliberately DOM-free so it can be exercised outside a
browser; the Playwright checks in
`structural-bioinformatics/browser-tests/karpathy.spec.js` drive the page
itself.

## Related

- [koolfox/Karpathy](https://github.com/koolfox/Karpathy) — the learning
  repository with session notes, exercises and the from-scratch
  implementations.
- [karpathy/micrograd](https://github.com/karpathy/micrograd) — the upstream
  engine this surface ports.
