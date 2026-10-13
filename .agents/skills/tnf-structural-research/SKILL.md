---
name: tnf-structural-research
description: "Advance this course project's exploratory TNF, TOP2A, CRP and adalimumab research with verified literature, traceable datasets, structural analysis and molecular graphics. Use for this repository's research or evidence updates."
---

# TNF Structural Research

Work in `structural-bioinformatics/` in `koolfox/koolfox.github.io`. The student's proposal is an exploratory RA–TOP2A–TNF/adalimumab connection; the instructor's interest in TOP2A does not authorize silently replacing the proposal. The user wants a lightweight Persian graphics engine and visible, incremental GitHub Pages updates.

## Choose the evidence needed

Read `docs/research-protocol.fa.md` and the relevant `data/metadata/*.json` before changing the question or repeating discovery. The catalog separates RA, psoriasis, AS and lupus. Read `docs/scientific-context.fa.md` for terminology and biomarker roles; the original nucleic-acid term remains ambiguous.

Verify publication year and peer-review status with publisher/PubMed records. A year embedded in a DOI is not necessarily publication year; the spatial RA paper's 2025 preprint was superseded in 2026. Keep three primary reviews in `literature.json`; distinguish supplemental context. Record study design, actual selected sample counts, access restrictions and limitations.

## Preserve scientific distinctions

- Adalimumab directly targets TNF. TOP2A expression, cell-cycle activity and response association are separate hypotheses. The 2025 TOP2A study used cancer-derived cell lines and a TOP2A-directed compound, not adalimumab.
- CRP concentration, RNA abundance, protein geometry and clinical outcome are different measurements. DAS28-CRP is a composite and does not supply raw CRP concentration.
- 3WD5's deposited view has one TNF protomer and Fab H/L. It lacks symmetry-neighbor epitope contacts and full IgG. 4FM9 is a TOP2A cleavage-core/DNA asymmetric unit; do not claim full enzyme or dimer without assembly reconstruction.
- Use author chain identifiers; distinguish mmCIF label chains. Exclude unoccupied coordinates and choose alternate sites consistently for analysis, figures and animation. Break traces at missing-coordinate gaps.
- Treat donors as independent units, not cells, tissue regions, repeated timepoints or libraries. Do not pool different drugs or tissues. Correlation does not establish a causal drug mechanism.

## Produce reviewable updates

Use source URLs, UTC retrieval times, SHA-256 and locked dependencies. Stream metadata or gene rows before downloading multi-gigabyte archives. A dataset record is not evidence that its full analysis ran.

Run the documented Python and browser checks for changed behavior. Graphics must read the same experimental payload as numerical summaries, support reduced motion and identify schematic camera motion. Keep publisher full text and patient-level records out of public commits.

Work on a feature branch. For the user's authorized visible updates, push a concrete tested increment and publish through a checked PR merge; verify the Pages deployment and URL. Do not claim publication from a local render or a pushed feature branch alone. This skill does not schedule background updates or authorize contacting researchers.
