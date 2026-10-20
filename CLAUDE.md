# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

This checkout is the public `koolfox/koolfox.github.io` GitHub Pages site. Root `index.html`/`assets/` are the homepage; `optimization/` and `stochastic-processes/` are finished coursework — leave them alone. Active work lives in `structural-bioinformatics/` (a Persian-language course study of TNF-α / adalimumab structure, with a later TOP2A comparison) plus its homepage link. `karpathy/` is a third surface: a Persian learning hub for Karpathy's *Neural Networks: Zero to Hero*, with a live autograd workbench, predict-then-run exercises and a progress tracker kept in the reader's browser. `AGENTS.md` holds the shared repo rules; the project skill `.agents/skills/tnf-structural-research/SKILL.md` holds the scientific constraints and must be read before changing scientific content, docs or claims.

## Commands

Run everything from the repository root. Python 3.13 (`structural-bioinformatics/.python-version`), dependencies locked in `uv.lock`.

```sh
uv sync --project structural-bioinformatics --frozen
uv run --project structural-bioinformatics pytest -q
uv run --project structural-bioinformatics pytest -q structural-bioinformatics/tests/test_structure.py::test_name   # single test
uv run --project structural-bioinformatics ruff check structural-bioinformatics scripts/serve_local.py
uv run --project structural-bioinformatics ruff format --check structural-bioinformatics scripts/serve_local.py

# Science pipeline (fetch needs internet; tests do not)
uv run --project structural-bioinformatics tnf-atlas fetch-structures
uv run --project structural-bioinformatics tnf-atlas analyze
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/plot_teaching_figures.py

# Browser tests (Playwright) need a static server on :8000 in another terminal
python3 -m http.server 8000
npm ci --prefix structural-bioinformatics/browser-tests
npx --prefix structural-bioinformatics/browser-tests playwright install chromium
npm --prefix structural-bioinformatics/browser-tests test

# Port 8000 is often already taken by another project on this machine, and a
# backgrounded server that cannot bind fails silently. Pick a free port and
# point the suite at it with RESEARCH_BASE_URL.
RESEARCH_BASE_URL=http://127.0.0.1:8123 npm --prefix structural-bioinformatics/browser-tests test
# Offline preview of exactly what Pages publishes (port 8787)
python3 scripts/serve_local.py --no-browser
```

CI (`.github/workflows/`) runs pytest, `ruff check`, `ruff format --check`, then builds `dist/pages` with `scripts/build_pages.py` and runs the Playwright suite against that built artifact before deploying. A push to `main` deploys the live site.

Optional/maintenance only: ManimGX animation (`--group animation`, `scripts/animate_binding.py`, not run in CI), Markdown/KaTeX/Mermaid vendoring (`reading-tools/`, `npm run vendor`), Mol* vendoring (`scripts/vendor_molecular_viewer.py`), PDF handout export (`scripts/export_preparation_guide.mjs`, needs the server running).

## Architecture

- **Static site, no build step.** `structural-bioinformatics/index.html` loads ES modules from `assets/` (`app.js` drives the tabs; `molecular-scene.js` is the Three.js Cα viewer; `codon-lesson.js`, `binding-explainer.js`, `learning-journey.js`, `glossary-terms.js`; `reference-viewer.*` is the on-demand Mol* cartoon view). All third-party libraries are vendored in `assets/vendor/` — no CDN, the site must work offline.
- **Docs are the content source.** The in-page reader (`assets/markdown-reader.js`) renders files from `docs/*.fa.md` via a hard-coded document list (filename, Persian title, group); a new doc must be registered there to appear. `presentation.html` + `assets/presentation.js` build the slide deck by parsing `docs/class-presentation.fa.md` together with `data/metadata/presentation.json`, so slide text is edited in the Markdown, not in HTML. URLs like `?document=…&chapter=…#reading` deep-link into the reader.
- **Python package `src/tnf_atlas/`** (`tnf-atlas` CLI in `cli.py`): `structure.py` parses coordinates and computes contacts, `feasibility.py` the SASA/rigid-separation analysis, `figures.py` plotting, `provenance.py` hashes/manifests. `analyze` writes small curated outputs to `data/processed/*.json` (e.g. `structures-view.json` feeds the browser viewer) and the interface map assets. Raw downloads (`data/raw/`) and `results/` are gitignored.
- **Provenance is enforced by tests.** `data/metadata/*.json` and `assets/*-provenance.json` record source URLs, accessions, UTC retrieval times and SHA-256 of public bytes; `tests/test_public_assets.py` and others recompute these. Changing a PDB, vendored file, figure, video or sequence file requires regenerating/updating its recorded hash.
- **Publication allow-list.** `scripts/build_pages.py` copies only specific paths into the Pages artifact (structural-bioinformatics `index.html`, `presentation.html`, `README.md`, `assets/`, `docs/`, `data/metadata|processed/*.json`, `data/sequences/*.fasta|*.gb`; the karpathy `index.html`, `README.md` and `assets/`; plus the homepage, shared `assets/`, `optimization/` and `stochastic-processes/`) and fails if dev/raw directories leak in. New public file types or locations must be added there.

## Conventions

- Persian RTL UI with the Arad font; preserve RTL behavior on the homepage and project pages. Mobile layout, keyboard tab navigation, reduced motion and the no-WebGL fallback are checked by the browser tests.
- Ruff: line length 100, rules E/F/I/B, four-space indents. Keep scientific calculation separate from graphics; state units, identifiers and assumptions.
- Tests must stay offline and must not depend on large datasets or GPU animation export.
- Scientific discipline (details in the skill): use author chain IDs, exclude zero-occupancy coordinates in analysis, label hypotheses vs. reported results, never infer efficacy from geometry, never fabricate clinical measurements, keep publisher full text and patient-level data out of commits.
- Git: work on a feature branch, short imperative commit subjects, scoped PRs listing behavior, validation, sources and limitations. The user authorized incremental Pages publication — merge tested increments and verify the deployed URL before saying an update is live.
- Untracked `.pptx`/`.png` files at the repo root are the user's personal files; do not commit them.
