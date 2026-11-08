---
name: danna-slide-factory
description: Inventory, generate, and verify source-linked Persian deep-learning slides and per-page artifacts for the Danna Spring 2026 course.
---

# Danna slide production

Work from the current repository state, the source PDF and the user's current scope. The default target is Spring 2026. Preserve source order, media, colors and emphasis; keep Persian RTL and formulas/code LTR where appropriate. Preserve the existing visual design and the user's spelling preferences. A successful render does not establish translation or scientific accuracy.

## Inventory

Run `python3 deep-learning/scripts/inventory_spring_2026.py --output /tmp/spring26-inventory` in a fresh output directory. Add `--artifact /path/to/built/deep-learning` to verify generated page files. JSONL describes each source page; the summary records source commit, hashes, translation/layout metadata, PDF policy and artifact verification. Treat `not_observed` as unknown. Confirm the script and its options on the current branch before invoking it; if absent, find the corresponding implementation.

## Build and inspect

- Use `deep-learning/scripts/build_course.py`, existing per-page PDF and source-layout generators, and the current page-data schema. Generate independent, hash-addressed page data incrementally. Retain full-PDF fallbacks where extraction has not been verified. A PDF page, Persian text data and a rendered Persian page are separate artifacts.
- Preserve source and translation hashes. Never fabricate translations, image contents, formulas or numerical examples. Keep licensing and attribution of source, translations and code distinct.
- Automate segmentation and layout only where source mapping and geometry are supported by evidence. Send ambiguous lines, tables, image text and clipped or overlapping content to a review queue. Do not weaken renderer guards to inflate coverage.
- Record actual load/render timings with source commit, browser, viewport, cold/warm cache and fallback reasons. Separate machine checks from scientific and visual review. Do not set human-review flags based only on automated results.
- Use the project's Python tests and browser tests; batch narrow and desktop checks against the built artifact. Check tables, figure retention, RTL/LTR, readable fonts, overflow and page-specific data. Emulation does not establish physical-device behavior.

## Delivery

Make scoped incremental commits and follow current user instructions on push, merge and publication. Distinguish code pushed, CI, merge, Pages deployment and live checks. List unresolved pages; metadata flags alone cannot prove completion. Preserve unrelated work and avoid retaining large rebuildable output longer than needed.
