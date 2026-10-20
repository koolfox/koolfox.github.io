# Portfolio

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed by the repository, not a greenfield choice: static HTML/CSS/JavaScript served by GitHub Pages with no build step or framework. Python 3.13 with `uv` is used for the structural-bioinformatics research project only. Third-party libraries are vendored into `assets/` so the site works offline.

## Users

Hesam Sheini, the site owner, a senior developer and junior bioinformatician who publishes his coursework in public.

Any visitor who arrives at `koolfox.github.io` to learn something: the site's audience is Persian-speaking learners who want to understand a subject by seeing it work, plus instructors reviewing the owner's work. Learners are assumed to be starting from a conceptual beginning, so terms are defined before they are used.

## Product Purpose

A personal site that collects projects, interactive coursework and research notes. Success is a visitor finding a working, understandable demonstration, and the owner being able to point at a public artifact of what he learned.

Each project surface has its own product truth; see `structural-bioinformatics/PRODUCT.md` for the research surface and `karpathy/PRODUCT.md` for the Karpathy learning surface.

## Positioning

A working laboratory rather than a content blog. Every project page demonstrates its subject doing its job with real, verifiable material — an actual molecular structure, an actual optimization run, an actual gradient — instead of describing the subject in prose.

## Operating Context

The site is the public `koolfox/koolfox.github.io` repository. CI on a push to `main` runs offline scientific tests, lint, an allow-listed page assembly via `scripts/build_pages.py`, and Playwright browser checks against the built artifact before deploying to GitHub Pages. A local preview runs from the repository root with `python3 -m http.server 8000`, or `python3 scripts/serve_local.py` for the assembled artifact.

Learning repositories are separate public repositories under `github.com/koolfox`; site pages are their front doors and link back to the source.

## Capabilities and Constraints

Persian RTL interface throughout, with the Arad font and blue accent on light neutral surfaces. The site's own assets load without a CDN. `scripts/build_pages.py` is a publication allow-list: a new public path is not deployed until it is registered there. Browser checks run against the assembled artifact, so a new surface is expected to bring its own checks.

Visitor progress belongs to the visitor: it is stored in the visitor's own browser, with no account, no server and no tracking.

## Brand Commitments

The name is Hesam Sheini; the page is titled in his name. The voice is natural Persian: friendly but technically precise, defining basics explicitly and replacing opaque jargon with a sentence that explains the intent. Latin identifiers and sequences stay isolated and left-to-right inside Persian prose. The visual identity is the Arad font, a single blue accent, light neutral panels and quiet surfaces — depth comes from spacing and type, never from decorative effects.

The owner publishes his work in public and links every surface back to its source repository.

## Evidence on Hand

The eight lectures of Andréj Karpathy's *Neural Networks: Zero to Hero*, with verified YouTube IDs, titles and durations totalling roughly seventeen hours. The upstream `micrograd` source at commit `c911406` (April 2020), vendored in the `koolfox/Karpathy` repository, together with its verified README outputs of `24.7041`, `138.8338` and `645.5773`. The finished homepage, three coursework pages and one research surface.

Absent and therefore never to be fabricated: completed lesson notes, authored exercise solutions, Persian transcripts of the lectures, and any learner's progress.

## Product Principles

- Demonstrate, do not claim: show the mechanism working rather than describing it.
- Verified material only; every number traces to a source that a reader can check.
- One lesson per lecture; never present a whole course at once.
- The visitor's progress stays in the visitor's browser.
- Persian first, with Latin identifiers isolated and readable.

## Accessibility & Inclusion

Persian RTL layout must survive on phones. Controls are keyboard-operable with a visible focus ring. Motion respects `prefers-reduced-motion`. Body text holds at least 4.5:1 contrast, and Latin identifiers are wrapped so their direction cannot leak into the surrounding Persian.
