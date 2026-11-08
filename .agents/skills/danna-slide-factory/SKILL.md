---
name: danna-slide-factory
description: Inventory, generate, and verify source-linked Persian deep-learning slides and per-page artifacts for the Danna Spring 2026 course.
---

# Danna slide production

Work from the current repository state, the source PDF and the user's current scope. The default target is Spring 2026. Preserve source order, media, colors and emphasis; keep Persian RTL and formulas/code LTR where appropriate. Preserve the existing visual design and the user's spelling preferences. A successful render does not establish translation or scientific accuracy.

## Inventory

Run `python3 deep-learning/scripts/inventory_spring_2026.py --output /tmp/spring26-inventory` in a fresh output directory. Add `--artifact /path/to/built/deep-learning` to verify generated page files. JSONL describes each source page; the summary records source commit, hashes, translation/layout metadata, PDF policy and artifact verification. Treat `not_observed` as unknown. Confirm the script and its options on the current branch before invoking it; if absent, find the corresponding implementation.

## Batch page data

Run `python3 deep-learning/scripts/build_slide_pages.py --output /tmp/slide-page-stage` to build every session, or add `--session s01` for a narrow run. Use a fresh output directory. Each record is hash-verified after writing; the summary reports the number of page-data files. This is a staging build of reader JSON, not a rendered slide, PDF build, visual comparison or scientific approval. Prefer the remote runner for the full course.

## Batch triage

Generate candidates with `python3 deep-learning/scripts/propose_slide_segments.py --root deep-learning --output /tmp/slide-proposals.jsonl`, then combine them with a scanner report using `python3 deep-learning/scripts/triage_slide_batch.py --scan deep-learning/browser-tests/slide-inventory-2026-11-08.json --proposals /tmp/slide-proposals.jsonl --output /tmp/slide-triage.json`. Use fresh output paths. Group repeated findings before fixing shared renderer behavior. The checked-in scan is historical: it is not evidence that the current commit still fails or passes. Confirm representative cases on the current build, preserve collision and readability guards, and rerun affected batches. Candidates require review and never change slides by themselves.

## Build and inspect

- For each page keep a machine-readable plan separating **content** (source page and hash, mapped text lines, translation, numbers, formulas and media identities) from **presentation** (source page size, bounding boxes, reading order, font emphasis and colors). Use existing source-layout records rather than inventing a second source of truth. Keep traceable page and line identifiers in proposals.
- Classify existing regions as text, list, table, code, formula, chart, diagram or image to select the appropriate renderer. Reproduce the source structure and media; never replace a source diagram with a generative illustration or infer missing cells, labels or data. Leave uncertain mappings unchanged and record a reason in the review queue.
- Generate candidates deterministically in batches, then compare mapped line coverage, order, values, media retention and bounds against the source. A candidate is not an approved slide. Run browser measurement at mobile and desktop widths and prioritize failed or uncertain pages without reopening already unchanged pages unnecessarily. Key results by source and translation hashes so changed inputs trigger fresh checks.
- Use `deep-learning/scripts/build_course.py`, existing per-page PDF and source-layout generators, and the current page-data schema. Generate independent, hash-addressed page data incrementally. Retain full-PDF fallbacks where extraction has not been verified. A PDF page, Persian text data and a rendered Persian page are separate artifacts.
- Preserve source and translation hashes. Never fabricate translations, image contents, formulas or numerical examples. Keep licensing and attribution of source, translations and code distinct.
- Automate segmentation and layout only where source mapping and geometry are supported by evidence. Send ambiguous lines, tables, image text and clipped or overlapping content to a review queue. Do not weaken renderer guards to inflate coverage.
- Record actual load/render timings with source commit, browser, viewport, cold/warm cache and fallback reasons. Separate machine checks from scientific and visual review. Do not set human-review flags based only on automated results.
- Use the project's Python tests and browser tests; batch narrow and desktop checks against the built artifact. Check tables, figure retention, RTL/LTR, readable fonts, overflow and page-specific data. Emulation does not establish physical-device behavior.

The separation of content analysis and layout is informed by [baoyu-infographic](https://github.com/NousResearch/hermes-agent/tree/main/skills/creative/baoyu-infographic). Its creative layout and image-generation defaults do not apply to source-faithful course slides.

## Delivery

Make scoped incremental commits and follow current user instructions on push, merge and publication. Distinguish code pushed, CI, merge, Pages deployment and live checks. List unresolved pages; metadata flags alone cannot prove completion. Preserve unrelated work and avoid retaining large rebuildable output longer than needed.
