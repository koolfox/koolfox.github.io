# یادگیری ژرف، بهار ۲۰۲۶

A Persian, learning-first companion to [Danna Gurari's Spring 2026 Neural Networks and Deep Learning course](https://dannagurari.colorado.edu/course/neural-networks-and-deep-learning-spring-2026/), University of Colorado Boulder.

The official schedule has **28 sessions: 21 with linked lecture PDFs and seven without slide links**. The main page follows the 21 slide-linked topics with a short goal and explanation, original Python/NumPy code, output recorded from actual execution, one suggested change and the verified official reference. Official session numbers are preserved: 1–17, 20, 21, 23 and 28. The gaps are not missing lessons. The seven remaining sessions appear separately in chronological order without invented code or completion records.

## Read and run

```sh
python3 -m http.server 8765
# http://localhost:8765/deep-learning/
python3 -m pip install numpy
# Download the selected example, then:
python3 lesson_01.py
```

The downloadable examples live in `python/spring2026/`. The page displays source and recorded stdout; it does not run Python in the browser. `assets/data/lessons.json` is produced by real execution, not by writing plausible-looking output. Examples are original educational adaptations of the official topics, not official university code, complete production systems, or verified solutions to PDF assignments. Small, deterministic inputs make mechanisms visible; each example states its limits.

From the repository checkout, regenerate the outputs and run tests:

```sh
python3 -m pip install -r deep-learning/python/requirements.txt
python3 deep-learning/python/build_lessons.py
python3 -m unittest discover -s deep-learning/tests -v
```

Visual explanations use variables from the same actual example. Labels, captions and a code reference explain what each plot or matrix represents. The graphic is not a separate invented result.

## Source verification and exercises

`assets/data/curriculum.json` preserves the live Spring 2026 schedule, all 28 session titles and exact official links. The live HTML and all nine syllabus pages were inspected. Downloads of the 21 lecture PDFs failed with server/connection errors through multiple supported routes. Therefore **PDF-specific questions and assignments have not yet been verified**. A known PDF URL is not evidence that its contents were read, and failed retrieval is not evidence that it contains no exercises.

Verified source exercises belong in a separate per-lesson section, with file, page and kind. The suggested practice we write is clearly distinguished from discussion questions, exercises or formal assignments in the official material. Public project requirements on the live course page are distinct from unavailable PDF contents. Source PDFs and classroom recordings are not republished.

The updated sequence includes residual learning, data and hardware, dense prediction, multimodal models, attention, transformers, foundation models and their post-training, sustainable and responsible learning, and current directions, in addition to the foundations. It is not the Fall 2022 sequence with a new year label.

The seven non-slide sessions are the practical Q&A, data-center impact session, ethics exercise, three industry/efficient-ML guest sessions, and final-project presentations. Historical course dates are not the visitor's personal deadlines.

## Legacy supplementary gate laboratory

`lab.html` retains the earlier detailed gate experiment as a separately labeled **2022-source supplementary tool**. It is not presented as a verified Spring 2026 assignment. The old uploaded seven-file collection (446 pages/slides) and any questions extracted from it belong to that older source context, never to the current 2026 PDF-exercise section.

The lab compares a hard-threshold perceptron, sigmoid baseline and 2–4–1 sigmoid MLP on six Boolean gates. All four rows are training data; fitting the truth table is not held-out generalization. Its real saved checkpoints, loss and weights are replayed, not retrained in the browser.

```sh
python3 deep-learning/python/logic_gates.py --output deep-learning/assets/data/gates.json
```

See [the gate implementation notes](python/README.md).

## Progress and accessibility

The 2026 path stores `{ "version": 1, "completed": ["spring2026-01"] }` under `koolfox.deep-learning.spring2026.v1`. Only the 21 actual coded-topic IDs are accepted. Backup imports are size-limited, validated and confirmed before replacement. Corrupt storage and invalid backups produce recovery messages. Nothing is transmitted.

No previous-course completion is migrated into different 2026 topics. The optional lab retains its earlier `koolfox.deep-learning.progress.v1` key unchanged. Progress represents personal study, not the owner's class status.

Local Arad, RTL layout, isolated LTR code/output, native keyboard controls, focus rings, a compact mobile selector, deep links, browser history, reduced-motion support and bounded code scrolling keep the page usable. All displayed code/output is inserted as text, never evaluated as HTML or JavaScript.
