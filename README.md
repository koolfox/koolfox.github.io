# Hesam's projects and coursework

[Personal site](https://koolfox.github.io/) with interactive coursework and research notes.

- [Structural bioinformatics: adalimumab and TNF](structural-bioinformatics/README.md): a focused course study, verified literature, reproducible structural analysis, molecular graphics and a later TOP2A/cancer evidence comparison.
- [Deep learning](deep-learning/README.md): chapter-based coursework, a Python-trained logic-gate laboratory, reproducible model traces and browser-local study progress.
- [From zero to GPT](karpathy/README.md): an interactive Persian study surface for Karpathy's *Neural Networks: Zero to Hero* — the eight lectures, a live autograd workbench that draws the graph and runs the backward pass, predict-then-run exercises, and progress kept in the reader's own browser.
- [Stochastic processes](stochastic-processes/): inventory and Ehrenfest demonstrations.
- [Optimization](optimization/): genetic-algorithm and related coursework.

To preview the site, run `python3 -m http.server 8000` from the repository root — or `python3 scripts/serve_local.py`, which picks a free port and serves exactly what Pages publishes. Port 8000 is often already taken by another project on this machine, and a server that cannot bind fails silently in the background; check that the port answers before trusting a preview.
Scientific setup and commands are in the structural-bioinformatics README.

## Independent university projects

Each project uses its own workspace, dependencies, tests and publication path. Read [PROJECT_BOUNDARIES.md](PROJECT_BOUNDARIES.md) before editing or publishing; `scripts/project_workspace.py` creates a project-only worktree without switching another checkout.
