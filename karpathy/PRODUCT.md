# Karpathy Learning Surface

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Inherited from the repository: static HTML/CSS/JavaScript served by GitHub Pages, no build step or framework. The autograd engine and the page behaviour are plain ES modules under `karpathy/assets/js/`, styled by `karpathy/assets/css/karpathy.css` on top of the site's shared `assets/css/styles.css`.

## Users

Any visitor who opens `koolfox.github.io/karpathy/` — including people who know nothing about neural networks and want to understand what a gradient is, and people who have already seen the lectures and want the exercises and the workbench. The site owner is a learner too: the page is his public study log, not a summary written for an audience.

Every visitor works alone and privately. The page never assumes a shared server state.

## Product Purpose

Teach Karpathy's eight-lecture *Neural Networks: Zero to Hero* course in Persian, in the way the course itself teaches: one lecture at a time, with the reader predicting an answer before running the code.

The concrete job of the page is that a visitor can type an expression, watch a real backward pass travel backwards through the graph, and see the numbers a neural network actually optimizes. Success is a visitor who can explain why the gradient of `a*b + b**3` with respect to `b` is 29, and who has watched the graph light up in reverse.

## Positioning

The autograd workbench is the product; the video catalog and the roadmap are its curriculum. A course page whose product is a list of links is the category default, and this one refuses it.

## Operating Context

The learning repository `koolfox/Karpathy` holds the upstream `micrograd` source, the session notes, the exercises and the from-scratch implementations. This page is that repository's public front door: it carries the catalog, the exercises and the workbench, and links back to the repository for the code and notes.

The visitor's progress belongs to the visitor. It is written to that browser's local storage under a namespaced key, never transmitted, and is readable and clearable on the page itself.

## Capabilities and Constraints

Persian RTL interface with the Arad font; Latin identifiers, expressions and numbers stay left-to-right inside Persian prose. The page is two columns on a desktop: the eight-lecture catalog on the right, the sticky workbench on the left, with the roadmap and progress spanning the width beneath. On a phone the columns stack, catalog first, and the section navigation jumps between them.

The workbench evaluates a real expression over the variables `a`, `b` and `c` with `+ - * / **`, the functions `relu`, `tanh`, `exp`, `log`, `sqrt` and `abs`, and constant operands. It reproduces micrograd's semantics exactly, including its scalar-only graph and its `relu` derivative of zero at zero. Numbers in the results are tabular.

No dependency on a CDN for the page's own behaviour. YouTube thumbnails and watch links are the only external references, and both degrade to text links.

## Brand Commitments

Persian first, with natural phrasing and no opaque jargon: each term is defined in the sentence that uses it. The page speaks directly to the visitor as «تو» in the teaching prompts and neutrally elsewhere. The visual identity is inherited: Arad, a single blue accent, light neutral panels, quiet surfaces, depth from spacing and type.

The eight lecture titles keep their original English wording beside the Persian translation, because those are the titles people search for.

## Evidence on Hand

The eight lectures with verified YouTube IDs, titles and durations totalling about seventeen hours. The upstream `micrograd` source at commit `c911406`, and its verified reference outputs `24.7041`, `138.8338`, `645.5773` for the README example — the ground truth the workbench's gradients are checked against.

Every prediction prompt has an answer computed from that source: `29`, `337`, `17`, `0`, `1`, `104`, `0.125`, `44`.

Absent and never fabricated: Persian transcripts of the lectures, the owner's own session notes, and any claim about what the visitor learned.

## Product Principles

- Show the mechanism working before explaining it: the graph assembles and the gradient travels before any prose about gradients.
- One lecture at a time; the page never presents the whole course at once.
- Ask before answering: the prediction comes first, the number second.
- The visitor's progress stays in the visitor's browser.
- Every number is checkable against the upstream source.

## Accessibility & Inclusion

The page is fully usable with a keyboard: the expression input, the variable fields and the run button are ordinary focusable controls, and the run button is reachable from the expression field with Enter. Focus is visible as a three-pixel blue ring. Motion — the graph assembling and the gradient wave — is skipped entirely when the visitor's system asks for reduced motion, leaving the finished result on screen. The graph's numbers are also written in text, so the animation is never the only carrier of the result.
