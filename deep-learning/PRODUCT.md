# Deep Learning Course Surface

<!-- impeccable:product-schema 1 -->

## Approved rebuild direction — 2026-10-25

The source authority for the replacement course is Danna Gurari's official
University of Colorado Boulder course archive:
<https://dannagurari.colorado.edu/courses/>. The owner requested five independent
learning paths: Spring 2026, Spring 2025, Spring 2024, Fall 2022 and Spring 2022.
The previously supplied local slides no longer define the target curriculum.

The owner confirmed there is no permission to translate/re-publish entire slide
decks and chose official slide links with independently authored Persian lessons.
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
part of Danna's own syllabus. Preserve old URLs and browser progress without
converting old completion marks into completion of the new semesters.

**Delivery state:** source inventories and the rebuild contract are development
artifacts. The site below is still the earlier shipped implementation. Full
slide-by-slide review, complete Persian lessons, new routes and live Python
laboratories are pending; inventory/extraction must not be described as course
completion. See `data/metadata/rebuild-contract.json` and the research report in
`reports/` for the execution plan and current evidence.

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
