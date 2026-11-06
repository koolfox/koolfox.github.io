# Offline reader prototype

This isolated experiment is not registered by the published site. The build manifest tool scans the assembled Spring 2026 reader pages, their static module imports and a conservative set of PDF.js and KaTeX support files. It generates content-hashed candidate manifests for 21 sessions. It is not part of the production build and does not establish complete coverage of dynamically loaded assets, slide-specific media, tools, notebooks or other course terms.

The prototype worker is restricted to a single session and accepts a SHA-256-addressed manifest. It verifies every downloaded file before writing a candidate cache, then changes the active pointer only after all entries were saved. Concurrent snapshot requests are rejected and an active snapshot cannot be overwritten. The existing PDF cache remains separate. Incomplete candidates are deleted on handled errors; cleanup following abrupt worker termination, old versions, eviction, upgrade and manifest provenance remain open. A successful test does not guarantee offline availability after browser eviction or on iOS/Safari.

For a local experiment, build the site into a disposable directory, then run:

```
python3 deep-learning/offline-prototype/build_manifests.py BUILT_SITE OUTPUT_DIRECTORY
PROTOTYPE_SITE=BUILT_SITE PROTOTYPE_MANIFEST=OUTPUT_DIRECTORY/s01.json node deep-learning/browser-tests/offline-prototype.mjs
```

The test temporarily copies the experimental worker into the disposable build and removes it afterward. It checks that assets observed on session 1 page 40 are listed, validates a snapshot, rejects a corrupt entry halfway through, tests simulated quota and interruption after ten entries, and reloads page 40 offline from the prior intact snapshot. Quota and interruption are injected exceptions, not browser quota exhaustion or an actual process crash. No production service worker is added.

## Evidence and earlier branch

On the deployed page, a cold mobile-emulated load of session 1 page 40 used 18 distinct non-PDF resources, including unversioned CSS, PDF.js and font URLs as well as versioned reader modules, translation and page index. The existing PDF reader independently validates cached PDF bytes using SHA-256.

On the earlier offline branch, Linux full-suite failures included a native Chromium `SIGSEGV`. Disabling background warming correlated with a clean diagnostic run, but disabling only cache writes did not consistently avoid a crash. A separate three-run portable comparison passed on baseline and failed once on that branch. Restoring the portable reader's direct URL loading made its package test pass in a later full run, but a different test still crashed Chromium. These observations do not establish a root cause. The separately merged page-delivery increment passed full CI without background warming.
