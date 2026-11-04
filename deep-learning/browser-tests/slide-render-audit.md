# Slide reader rendering audit

This tool opens every Spring 2026 slide in the reader at desktop (1440 × 900) and mobile (390 × 844) sizes. It records the reader's completed `data-layout` state, page identity, source PDF hash, browser exceptions, console errors, failed requests, HTTP errors and timeouts. A successful render or a `source-canvas` state is not evidence of visual fidelity, correct translation, readable content, or a visual review. Other layout values are recorded as observations, not automatically treated as errors.

Build and serve the intended Pages artifact, and use its actual commit as the target. From `deep-learning/browser-tests`:

```sh
npm ci
npx playwright install chromium
node audit-slide-render.mjs --base-url http://127.0.0.1:8000 --target-commit FULL_COMMIT_HASH --output /tmp/slide-render-audit.jsonl
```

The server must serve the Pages build, not the source checkout. `--target-commit` is an operator declaration: the script cannot verify which commit the server actually serves and the report says so. The report separately records the script checkout commit and whether it has tracked changes. It writes one JSON object per line as the audit progresses; an interrupted run has no summary. The output file is overwritten on startup. Keep audit outputs outside the repository.

For a bounded check use `--sessions s03,s04`, `--pages 1,44` and/or `--viewports desktop,mobile`. Page numbers outside a selected session are skipped. A system Chrome may be selected with `--chrome-path /path/to/chrome`. Exit status is nonzero when a page has a browser/loading error or a timeout; inspect each `layout` value separately. Runs limited with these flags are samples, not complete audits.
