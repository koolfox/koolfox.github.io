# Batch slide browser inventory

Run against a built site served over HTTP, with the browser dependencies installed in this directory. Supply an identifier unique to the exact build; use a new output file or build ID when assets change.

```sh
node deep-learning/browser-tests/slide-audit.mjs \
  --base-url http://127.0.0.1:8000 --build-id COMMIT-AND-BUILD-ID \
  --sessions 1-3 --pages 1-5 --viewports 390x844,1440x900 \
  --output /tmp/slide-audit.jsonl
```

Sessions and pages accept comma-separated numbers and inclusive ranges. Choose valid pages for each session; nonexistent pages are recorded as errors. Each viewport/page gets a fresh browser context, and records are appended immediately. A rerun with the same build ID, origin, session, page and viewport skips completed records and retries errors. Do not run multiple writers on one output file. A truncated or malformed JSONL stops the run rather than silently losing progress. Snapshots are saved only for observed failures or measurement errors beside the output file. Keep them outside the repository.

Each JSONL record includes the browser/version, page, viewport, source identity where provided, translation payload hash where available, layout reason, font faces and visible text geometry, overflow indicators, image/canvas geometry, CSS direction and page errors. Unavailable measurements are explicitly unknown. `measured` means only that the selected checks recorded no issue; it is not visual approval. `needs_review` includes fallback layouts and unknown measurements. `fail` records a runtime failure or observed overflow, and `error` means the page could not be measured; these require investigation. Earlier error records remain in the append-only file when a retry succeeds.

Font face status does not prove which font actually drew each glyph, rectangles and scroll dimensions do not detect every clipped glyph, and CSS direction cannot establish correct bidi reading order. Canvas dimensions do not prove figures or tables are correct. Fallback layouts and source-canvas layouts can both contain visual, translation, scientific, accessibility or content defects. The scanner does not check table semantics, compare source and translation font sizes, or set `visual_reviewed`. Use source comparison and human review in addition to this inventory. Results apply only to the specified build, browser and viewports; they are not proof of deployment or physical-device behavior.
