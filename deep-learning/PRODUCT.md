# Deep Learning Course Surface

<!-- impeccable:product-schema 1 -->

## Approved rebuild direction — 2026-10-25

The source authority for the replacement course is Danna Gurari's official
University of Colorado Boulder course archive:
<https://dannagurari.colorado.edu/courses/>. The owner requested five independent
learning paths: Spring 2026, Spring 2025, Spring 2024, Fall 2022 and Spring 2022.
The previously supplied local slides no longer define the target curriculum.

The owner has not supplied separate permission and chose official slide links
with independently authored Persian lessons. Full visual review subsequently
found Creative Commons badges on some decks; record and verify their exact
license, version and scope per source. The earlier text-only license search was
incomplete and must not be treated as a blanket absence of source licenses.
Do not modify or publicly mirror the original slides. Every correction belongs
in a separate annotation identifying semester, PDF page, reason, evidence and
whether it is a verified error, historical update, clarification or open question.

The replacement lives under `deep-learning/`: term-specific sequence, lessons,
original exercises, Shiny/Shinylive laboratories, provenance and correction notes.
A shared concept or laboratory may be reused, but semester ordering, page
references, assignments and learner progress must stay distinct. Canvas-only
homework is unavailable; original practice must never be presented as official
homework. Historical deadlines are context, not current submission dates.

Preserve the established Arad/RTL visual system. Each lesson should connect an
objective, the original source, a clear Persian explanation, a worked example,
practice, a suitable laboratory and reflection. Small public laboratories should
execute actual Python updates through Shinylive; heavy training should use an
explicitly separate reproducible notebook/project. Never label replay as live
training or four-row Boolean fitting as held-out generalization.

Migration replaces the old curriculum and entry flow. Reuse useful tested
numerical engines where they fit the official material. Karpathy/autograd may
be a clearly attributed supplementary laboratory beneath this course, never
part of Danna's own syllabus. Preserve browser progress without converting old
completion marks into completion of the new semesters. The obsolete recorded
replay page and its links are removed at the owner's request; the live
laboratories replace it.

**Delivery state:** the five generated semester routes, source-linked Persian
companions, exercises, browser progress and live Python laboratories are
implemented and undergoing incremental publication acceptance. Reviews and lesson
coverage are computed from their evidence records. The full 8,232-page review,
remaining companions, topic laboratories and heavy reproducible experiments are
unfinished; inventory/extraction is never described as course completion. See
`data/metadata/rebuild-contract.json` and `reports/` for the execution plan.

## Current implementation milestone

The active completion scope is Spring 2022. All 23 public slide sessions now
have an independent editable Python workshop and three original questions
(numeric, multiple choice and reasoning), with source page references. Eleven
explicit classroom activity pages are retained as links to the unchanged
originals, alongside an index of teaching-question pages. Canvas-only tutorial
files remain unavailable and are not reconstructed or attributed to the teacher.
These workshops do not mark unfinished full source reviews or companions ready.

Calendar rows without public slides are compact, unlinked historical notes,
excluded from lesson numbering and previous/next navigation. This rendering
rule applies to all five existing calendars; curriculum expansion beyond
Spring 2022 remains deferred. Source calendar metadata and progress keys stay
unchanged. Workshops run only after an explicit click in a fresh Pyodide Worker,
with stop/timeout, errors, code/result downloads and native Python references.

The approved course architecture is now implemented as a generated static hub,
five semester calendars, 163 original calendar rows, per-term prerequisites and
project guides. Original Persian concept lessons are linked to independently
reviewed semester-specific page ranges and corrections. Readiness is computed;
unreviewed or missing companions remain visibly in preparation.

The neuron/XOR laboratory executes live Python in Shinylive, with bounded training,
seed/reset controls, weights, predictions and measured loss. Karpathy is an
explicitly separate supplemental course under `/deep-learning/karpathy/`, retaining
its unchanged upstream-checked engine and compatibility with the earlier URL.
The portfolio has one deep-learning
entry. Browser progress is private and scoped to semester/session.

The network playground adds four synthetic classification datasets, selectable
features, zero to three hidden layers, tanh/ReLU/sigmoid, SGD/momentum/Adam and
weight-only L1/L2 penalties. Independent seeded streams keep data and split fixed
when architecture changes. Train and validation BCE remain separate from the
penalized objective. Final test evaluation seals that run against further training;
reusing the same test after tuning is explicitly not independent evaluation.
This lab is not a CNN, dropout, augmentation or batch-normalization simulator.

The convolution operation lab computes a manually chosen 3×3 filter over a small
synthetic single-channel image. Every output cell exposes its actual nine Python
products and bias. Stride, zero padding, kernel flipping, ReLU and unpadded
max/average pooling can be compared. It does not train a filter or classify images.

This milestone does not complete the 8,232-page goal: remaining source reviews,
independent lessons, topic laboratories, heavy reproducible labs and acceptance
still need their own evidence. Publication is only claimed after a successful
Pages deployment and a live check. The historical baseline below describes the
retired surface, not current course authority.

## Workshop and local presentation refinement — 2026-10-28

Keep the approved blue/light/Arad/RTL direction. Titles of the exported Shiny
shells and embedded apps are «کارگاه آموزشی دیپ لرنینگ». Lesson links to a shared
laboratory require a documented matching topic; do not add generic laboratory
invitations. Hidden architecture controls are visible and validated only when the
chosen model actually uses them. The numerical model remains independent of UI.

Both neural labs bring the actual layer graph ahead of the decision/loss plots.
An explicit forward-pass button reveals activations derived from current Python
weights, one layer at a time. This is calculation order, not physical signal speed
or training progress. No autoplay loop. Reduced motion reveals all values at once;
state changes and page hiding cancel a sequence. All activations remain available
in a numerical table, including units omitted from a bounded visual graph.

Spring 2022 now has 23 locally served, independently authored Persian HTML decks
(207 slides), with an original course mark and supervisor «خانم دکتر نگار مجمع».
Each deck contains the topic, objectives, mechanism, formula/example, an editable
Python workshop, three questions with feedback/solutions, and limitations/sources.
The primary slide viewer is same-origin; Colorado PDFs are optional citations.
These decks are not a full translation of the source PDFs and do not certify
unfinished source reviews. Other semesters have no newly authored decks yet.

Navigation, fullscreen and print/save-PDF follow the existing structural-course
presentation's interaction pattern; no sibling code, branding, or runtime is
imported. A deterministic ZIP includes the 23 decks, their sources, own assets,
Arad and the four pinned Python core files needed for the standard-library
workshops. It is served from its extracted root with a local HTTP server.
External sources/full lessons remain online links. No original PDFs enter the ZIP.
Own code, mark and independently authored teaching content are MIT; upstream
slides, fonts and runtimes retain their own notices and licenses.

## Earlier shipped implementation (migration baseline)

## Platform

web

## Stack

Static HTML/CSS and two ES modules, no build step, framework or CDN. Python standard-library training exports reproducible JSON; JavaScript replays it and evaluates saved weights for visualization, never claims to execute Python.

## Users

Hesam studying a university deep-learning course, and Persian-speaking visitors following the exercises independently.

## Product Purpose

Keep the real course path, current gate exercise, reproducible experiments and eventually final-project evidence together. The central learning move is comparing a single perceptron's failure on XOR against a genuinely trained nonlinear network.

## Positioning

A working study notebook with a recorded scientific experiment, not a fabricated progress dashboard or a list of slide downloads.

## Operating Context

The owner is doing chapter 2 exercises and beginning chapter 3. Seven supplied source files total 446 pages/slides across chapters 1, 2, 3, 4, 5, 6 and 8. Chapter 7 is absent. Later uploaded chapters are available material, not completed work. The surface is served with the portfolio through GitHub Pages.

## Capabilities and Constraints

Select six Boolean gates and three actual Python-trained models. Replay checkpoints with play, pause, step, reset, endpoint and slider controls. Read actual outputs, loss, training accuracy, weights, biases and a derived decision surface. Download source and data. Progress is private to the browser and exportable/importable. No private course PDF publication, uploaded file leaks, account, remote telemetry or runtime service.

## Brand Commitments

Inherit root DESIGN.md: Arad, Persian RTL, one blue accent, light surfaces and clear prose without Arabic vowel marks. Technical terms and numbers remain directionally isolated. Natural Persian teaching, with scientific distinctions explained instead of hidden.

## Evidence on Hand

Fully reviewed course files described in README. Chapter 2 teaches sample-wise hard-threshold perceptron updates and a three-input majority worked example. Chapter 3 establishes XOR's nonseparability and a preset ReLU network; chapter 4 explains backpropagation. Chapter 6 covers spatial data, local connectivity and weight sharing, filters and feature maps, nonlinear activations, stacked layers, stride, padding and pooling. Python exports record actual trained parameters and losses for perceptron, sigmoid baseline and a 2–4–1 sigmoid MLP. The MLP is an educational extension, not a reproduction of the lecture's preset 2–2–1 architecture.

Absent and not fabricated: chapter 7, future assigned homework, solved submissions by the owner, final-project topic, models, datasets, evaluations, publications or results.

## Product Principles

- Course location and visitor completion are distinct.
- Recorded training is not live Python execution.
- Perceptron labels are not probabilities; its error fraction is not BCE.
- Fitting all four truth-table rows does not demonstrate held-out generalization.
- Interpolated grid colors are model behavior, not extra Boolean training examples.
- Every future project result requires a real source or artifact.

## Accessibility & Inclusion

Responsive Persian RTL, keyboard-native controls, visible focus, reduced-motion behavior, text equivalents for plotted values, robust storage/import checks and explicit missing-data recovery. No color-only distinction for network weight sign.
