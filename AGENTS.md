# Repository Guidelines

## Project Structure & Module Organization

This checkout tracks the public `koolfox/koolfox.github.io` portfolio. Root `index.html` and `assets/` serve the homepage; `optimization/` and `stochastic-processes/` contain existing coursework. Keep research changes scoped to `structural-bioinformatics/` and its homepage link. `karpathy/` is a separate learning surface with its own `PRODUCT.md` and direction contract; changes there stay inside that folder plus the publication allow-list and the browser checks.

Inside the research project, `src/tnf_atlas/` contains Python analysis; `tests/` contains offline scientific checks; `scripts/` exports animations; `docs/` records methods and reviews; `data/metadata/` tracks provenance; `data/processed/` holds small curated outputs; `assets/` serves the molecular viewer and presentation files. Raw downloads and generated `results/` are ignored.

`karpathy/` ships a DOM-free autograd engine in `assets/js/engine.js` that is asserted against the upstream `micrograd` reference outputs on every page load. Keep the engine free of DOM access, and never let a number reach the page that the upstream engine would not produce.

## Build, Test, and Development Commands

- `python3 -m http.server 8000`: serve the static site from the repository root. Port 8000 is frequently taken by another project on this machine and a backgrounded server that cannot bind fails silently, so use a different port and confirm it answers before trusting a preview.
- `uv sync --project structural-bioinformatics --frozen`: install the locked Python 3.13+ environment.
- `uv run --project structural-bioinformatics pytest -q`: run offline tests.
- `uv run --project structural-bioinformatics ruff check structural-bioinformatics`: lint project Python.
- `uv run --project structural-bioinformatics tnf-atlas fetch-structures` then `tnf-atlas analyze` with the same prefix: download and analyze experimental coordinates.

See the research README for browser checks and optional ManimGX rendering.

## Coding Style & Naming Conventions

Use four-space Python indentation, `snake_case` functions/modules and `PascalCase` classes; format with Ruff. Preserve the site's Persian RTL behavior, Arad font and existing coursework. Separate scientific calculations from graphics and document units, identifiers and assumptions.

## Testing Guidelines

Use `tests/test_*.py` for meaningful numerical and parsing invariants. Browser checks verify real rendering, controls, fallback and mobile layout. No coverage threshold is prescribed. Tests must not need large datasets or a GPU animation export.

## Commit & Pull Request Guidelines

History uses short subjects such as `fix typo`; prefer concrete imperative messages. Use feature branches and scoped PRs describing behavior, validation, sources and limitations. The user authorized incremental Pages publication; merge tested increments and verify deployment before claiming a live update.

## Reproducibility & Data Provenance

Record source URLs, accessions, UTC retrieval, SHA-256, versions and parameters. Label hypotheses and proposals; do not infer efficacy from geometry or fabricate missing clinical measurements. Consult the project skill in `.agents/skills/tnf-structural-research/` for scientific constraints.
