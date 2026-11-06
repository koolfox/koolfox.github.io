# Offline reader prototype

This isolated experiment is not registered by the published site. It targets only the Spring 2026 session 1 reader and is not production-ready. The browser test supplies an integrity manifest generated from the exact built files observed in a successful page load; the worker writes to a candidate cache and switches its pointer only after every SHA-256 check and cache write succeeds. The existing PDF cache remains separate.

The real build must generate and version a complete dependency manifest, rather than trusting a page's observed resources: resources needed on another slide or in a later interaction may not have loaded. Atomicity across concurrent snapshot requests, storage eviction, cache cleanup, session isolation, worker upgrades, incompatible releases and all session/slide combinations require further work. A successful test does not guarantee offline availability after browser eviction or on iOS/Safari.

To run the experiment, build the site into a local directory and set `PROTOTYPE_SITE` to that directory, then run `node deep-learning/browser-tests/offline-prototype.mjs`. It temporarily copies the prototype worker into that build directory and removes it on exit; use a disposable build. No service worker is added to the production build.

## Evidence and earlier branch

On the deployed page, a cold mobile-emulated load of session 1 page 40 used 18 distinct non-PDF resources, including unversioned CSS, PDF.js and font URLs as well as versioned reader modules, translation and page index. The existing PDF reader independently validates cached PDF bytes using SHA-256.

On the earlier offline branch, Linux full-suite failures included a native Chromium `SIGSEGV`. Disabling background warming correlated with a clean diagnostic run, but disabling only cache writes did not consistently avoid a crash. A separate three-run portable comparison passed on baseline and failed once on that branch. Restoring the portable reader's direct URL loading made its package test pass in a later full run, but a different test still crashed Chromium. These observations do not establish a root cause. The separately merged page-delivery increment passed full CI without background warming.

The prototype exercises atomic activation of one observed session-1 snapshot and rejects an intentionally corrupted candidate. It does not reproduce or explain the Linux crash, and it does not yet establish that the manifest includes every resource required by any page or feature.
