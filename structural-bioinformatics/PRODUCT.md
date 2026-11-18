# Structural Bioinformatics

## Platform

web

## Readers

A novice MSc student, classmates and readers learning structural bioinformatics. Persian RTL and Arad. Explain terms, methods and assumptions without requiring knowledge of the project.

## Two parallel paths

The user's 2026-10-25 clarification defines exactly two primary navigation choices: general education and research. `course.html` is titled سرفصل آموزشی. Its nine chapter headings and ordering follow the Sharif 40553 syllabus. General lessons teach structural bioinformatics independently; molecular docking belongs to this area. The continuous textbook and its chapter links stay in education, including legacy document URLs. The research glossary is not injected into general reading. Self-checks and mathematical examples do not rely on adalimumab, TOP2A or named project papers.

`research.html` opens the current antibody-to-peptide study with adalimumab and TNF as its worked case. The path leads to the manual example, local workbench, saved molecular results and article/evaluation plan. Project datasets, viewers, case exercises, paper reviews, library and presentations stay available by direct URL. The earlier adalimumab/TOP2A review and its optional chapter applications remain accessible as prior work.

## Content

General lesson sources live in `docs/course/`. Previous project-specific lesson explanations are preserved under `docs/research-notes/lesson-context/`. Exercise, research and speaker notes remain separate. `education-content-provenance.json` records references and source hashes. The research slide bank remains an audited source for project presentations, not the general syllabus itself.

## State and evidence

General education progress has a separate localStorage key. Existing research quiz attempts and notes are preserved. The public site runs teaching exercises and displays saved research outputs. Report the structure, chain, tool version, parameters and observed status with every research result. Claims about language model routing, docking geometry and biological activity require distinct evidence.

## Acceptance

Two clear primary choices, complete public chapter coverage, optional forward/reverse learning applications, and direct usable research resources. Check scientific controls, saved notes, failure recovery, mobile layout and publication. Verify the deployed routes before claiming a live update.

## Interactive course experiments

Relevant general lessons expose a visible laboratory section and a direct return to that topic. A single Shiny/Shinylive laboratory runs six inspected Python calculations: DNA orientation, equal-weight C-alpha geometry with Kabsch fitting, two-state populations, gradient descent, synthetic correlated sampling and contact graphs. The same engine executes natively and in browser Python; JavaScript renders its payload. Preserve this distinction when adding controls or figures.

Use the curated 1UBQ input and its byte hash for geometry and the optional protein graph. Label artificial coordinate edits, input sequences, free-energy examples and series. Do not present these as a new molecular simulation, predicted structure or drug result. Keep x/y coordinate plots at equal aspect and preserve readable plot labels at mobile widths.

Prediction/reflection notes are private, separate for each experiment and downloadable with parameters and numerical outputs. Storage failure retains download and input failure clears stale results. A static loading message retains a route back to the lesson before Python is available. Generated runtime files live under ignored results and are exported into the publication artifact; CI checks that same artifact and compares six live Python computations with native controls.

## Direct Python interaction

Each experiment exposes editable calculation code with a self-hosted CodeMirror editor, parameter names/types/units, an explicit run action, console diagnostics, plots/tables and independent reference metrics. Refreshing parameters preserves algorithm edits; ordinary control changes never overwrite the draft. Execute user code only in a fresh dedicated browser Worker, created from the same-origin exported host realm. Never send it to a Shiny `exec` endpoint. Manual stop and execution timeout terminate that Worker and leave the reference laboratory usable.

Reference metrics are computed before user code with its explicit literal parameters. Changing parameters during execution invalidates that comparison. Custom results remain labeled as user code; numerical agreement is not scientific validation. Persist drafts and three recent executions per mode, keep notes independent and export a standalone Python file or the complete run record. Keep loader/runtime versions matched, licenses vendored and data/source hashes reproducible. Editing code clears stale displayed results.
