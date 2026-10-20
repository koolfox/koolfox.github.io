---
name: "Hesam's portfolio"
description: "A Persian RTL portfolio of interactive coursework and research, built on the Arad font, one blue accent and quiet light surfaces."
colors:
  accent: "#2563eb"
  accent-soft: "rgba(37, 99, 235, 0.08)"
  page: "#f5f5f7"
  surface: "#ffffff"
  raised: "#f9fafb"
  text: "#111827"
  muted: "#6b7280"
  line: "#e5e7eb"
  footer: "#636b78"
  error: "#dc2626"
  error-soft: "rgba(220, 38, 38, 0.08)"
  success: "#047857"
typography:
  display:
    fontFamily: '"arad", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(1.3rem, 2.8vw, 1.9rem)"
    fontWeight: 700
  section:
    fontFamily: '"arad", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1rem"
    fontWeight: 700
  body:
    fontFamily: '"arad", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "0.8rem"
    lineHeight: 1.7
  instrument:
    fontFamily: '"arad", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "0.78rem"
    fontWeight: 400
  mono:
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    fontSize: "0.85rem"
---

# Design System: Hesam's portfolio

## Overview

The public portfolio at `koolfox.github.io`. It is a set of independent surfaces — a homepage, three coursework projects and a research notebook — that share one visual identity rather than one layout. The identity is deliberately quiet: one Persian typeface, one blue accent, light neutral surfaces, and depth from spacing and type rather than from effects.

The site is Persian and RTL. Latin identifiers, code, expressions and sequences are isolated with `<bdi>` or an explicit `dir="ltr"` so their direction never leaks into the surrounding Persian. Numbers in tables are tabular. There is no build step and no framework: every surface is static HTML, CSS and ES modules, and the site's own assets never load from a CDN.

Surfaces:

| Surface | Directory | Purpose |
|---|---|---|
| Homepage | `index.html`, `assets/` | The index of coursework, public repositories and the owner |
| Coursework | `optimization/`, `stochastic-processes/` | Finished coursework demonstrations |
| Research | `structural-bioinformatics/` | The TNF-α / adalimumab study, with its own `PRODUCT.md` and `DESIGN.md` |
| Learning | `karpathy/` | The Karpathy course surface: an autograd workbench, exercises and a progress tracker |

A surface that needs its own product truth keeps it in its own `PRODUCT.md`; a surface with its own visual world keeps it in its own `DESIGN.md`. This file records what every surface inherits.

## Colors

The palette is inherited from `assets/css/styles.css` and is the only palette a surface may use without a recorded reason.

- **Page** `#f5f5f7` — the ground behind every panel.
- **Surface** `#ffffff` — panels, cards and the raised sheet.
- **Raised** `#f9fafb` — the second level inside a panel: list items, the progress panel, roadmap steps.
- **Accent** `#2563eb` — every action, every selected state, every data mark. It is the only saturated colour on the site.
- **Accent soft** `rgba(37, 99, 235, 0.08)` — the avatar circle, the selected node, hover fills.
- **Line** `#e5e7eb` — panel borders, table rules, the graph-paper grid at 5% ink.
- **Text** `#111827`, **muted** `#6b7280`, **footer** `#636b78`.

Every text/background pair on the site meets WCAG AA: body copy is at least 4.5:1, large text at least 3:1. `#9ca3af` was removed from the footer for exactly this reason; do not reintroduce it for small text.

## Typography

Arad is the only typeface, served from `assets/fonts/arad.woff2`. It carries headings, prose, controls and labels alike; there is no display face.

Two densities are in use, and the split is deliberate: **teaching prose** at 0.8rem with a 1.7 line height for anything a person reads, and **instrument labels** at 0.78rem for controls, captions and metadata. Anything numeric or technical — expressions, identifiers, gradients, file names — is set in the monospace stack with tabular figures.

The type ramp on a surface is: display (clamp, 1.3–1.9rem) → section heading → card heading → body → metadata. Each adjacent step changes size or weight by at least 1.25×; a heading is never smaller than the body copy it introduces.

Latin runs are isolated. A long English title inside a Persian heading keeps its own direction.

## Layout

- `.app-container` centres the page at a 1100px maximum, 1240px on the Karpathy surface.
- `.stack` lays the sections out vertically with a 16px gap; `.panel` is the card.
- `.panel h2` carries the section title and, in the muted weight, a one-line qualifier on the far side.
- `.item-list` and `.item` are the repeated-row pattern used by the homepage.
- `.details-grid` is a key/value grid; `.pill` is a status chip; `.chip` is a header link.
- Multi-column surfaces split with CSS grid and collapse to one column below 1024px.

Depth comes from a single soft shadow with an offset and a blur, `0 4px 18px rgba(15, 23, 42, 0.08)`. Hard offset shadows and coloured haloes are not part of this identity.

## Shapes

One radius language: 12px for panels, 10px for items and inner surfaces, 8px for inputs, 999px for pills and chips. Nothing else.

## Components

- **Panel** — the card. A hairline border and one soft shadow. Never nested inside another panel.
- **Button** — pill-shaped. `primary` is the filled blue action; a ghost variant is a white button with a hairline border for secondary actions.
- **Input** — 8px radius, `#f9fafb` fill, hairline border, a 1px accent outline and white fill on focus.
- **Focus ring** — 3px solid accent with a 2px offset, on every focusable element.
- **Item** — a repeated row with a head, a description and a meta line.
- **Graph sheet** — the Karpathy surface's worksheet: graph paper at 24px with a 5% ink grid, carrying a computation graph drawn in Karpathy's own `draw_dot` idiom — small square boxes, the value above the gradient, joined by right-angle connectors.
- **Progress track** — a 8px rounded rail with a blue fill that scales from the right in an RTL page.

## Do's and Don'ts

### Do:

- **Do** keep Arad as the single typeface and isolate Latin runs with `<bdi>` or `dir="ltr"`.
- **Do** keep one accent colour and let it carry actions, selection and data marks only.
- **Do** use the instrument density for controls and metadata, and the prose density for anything read.
- **Do** keep the site's own assets local; a surface may depend on a third party only with a graceful fallback.
- **Do** make every state real: hover, focus, disabled, error, empty and offline.
- **Do** honour `prefers-reduced-motion` — the Karpathy graph animation is skipped entirely, leaving the finished result on screen.

### Don't:

- **Don't** introduce a second typeface, a second accent, gradient text, glass panels or decorative shadows.
- **Don't** put a kicker above a heading, or number sections whose sequence carries no information.
- **Don't** build a page out of a uniform grid of identical icon-plus-heading cards.
- **Don't** use emoji or Unicode glyphs as icons; draw them.
- **Don't** hide a failure behind a decorative state. When something breaks, name the problem and the recovery.

## Surfaces

### Karpathy learning surface (`karpathy/`)

The eight lectures of *Neural Networks: Zero to Hero* with a live autograd workbench. Two columns on a desktop: the catalogue of lectures on the right, the workbench on the left and sticky, with the roadmap and the progress tracker spanning the width beneath. The workbench is the product and the catalogue is its curriculum.

The engine in `karpathy/assets/js/engine.js` is a faithful port of `karpathy/micrograd` and is asserted against that repository's reference outputs (`24.7041`, `138.8338`, `645.5773`) on every page load. No number reaches the page that the upstream engine would not produce.

Its signature move is the backward pass: the DAG assembles in forward topological order, then the gradient sweeps the boxes in reverse, each gradient counting up as the wave passes it. Every prediction answer was computed from the upstream source or from the arithmetic the lecture teaches.

Progress and answered exercises live in the reader's own browser under `koolfox.karpathy.progress.v1`. Nothing is transmitted.
