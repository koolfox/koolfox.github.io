---
version: 1
slug: "karpathy-index-html"
primary_target: "karpathy/index.html"
related_targets:
  - "karpathy/assets/css/karpathy.css"
  - "karpathy/assets/js/karpathy-lab.js"
---

# Karpathy learning surface

Mode: Operate with an Experiment laboratory. Audience: a visitor who knows nothing about neural networks, and the site owner learning alongside them. Existing authority: portfolio Arad font, light neutral backgrounds, one blue accent, Persian RTL. Confirmed static HTML/CSS/JavaScript stack and a real backward pass. The user's requests: all three blocks in order (video catalog, live autograd lab, study roadmap), every interactive feature enabled, progress kept in the browser for personal use, for a general public, with real visual appeal.

## Direction contract

THESIS: The autograd engine is not a widget on a course page; it is the page's spine. A visitor must watch a real `backward()` happen — the gradient travelling backwards through a graph of boxes in Karpathy's own `draw_dot` idiom — before any syllabus copy is read. The page refuses the course-catalogue arrangement where a list of thumbnails and a "start" button is the product.

OWN-WORLD: Arad at two densities — airy 0.95rem for teaching prose, 0.78rem for instrument labels — and a monospace for expressions, identifiers and tabular numbers. Light neutral ground #f5f5f7 with white panels, hairline #e5e7eb borders, one blue accent #2563eb carrying every action, selection and data mark. The workbench is a graph-paper worksheet: a 24px hairline grid at low ink, ink-blue results, and DAG nodes drawn as small square boxes joined by right-angle connectors — Karpathy's `draw_dot` boxes, not generic circles.

STORY: A visitor who knows nothing about neural networks leaves understanding that a gradient is a number that travels backwards through the operations that produced it. They meet the same eight lectures Karpathy teaches, in Persian, each with a question to answer before running anything.

FIRST VIEWPORT: Two columns on desktop. Right, narrower and scrolling: the eight-lecture catalog, opening on lecture 01's thumbnail. Left, wider and sticky: the workbench sheet — variable fields, the expression bar, the blue run button, then the graph-paper DAG. Beneath both, full width, the roadmap and the progress bar. On a phone the columns stack, catalog first, with section navigation jumping to the workbench.

FORM: Two-pane lesson-beside-workbench, position two of the grounded list, seed 44be2336, round resolved by the user's choice.

SIGNATURE: Pressing run assembles the DAG node by node in forward topological order, then the backward pass sweeps the boxes in reverse, each gradient counting up as the wave passes it.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
