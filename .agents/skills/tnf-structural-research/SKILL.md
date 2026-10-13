---
name: tnf-structural-research
description: "Advance this repository's structural-bioinformatics course study of adalimumab and TNF using verified literature, traceable structures and molecular graphics, with a later evidence-based TOP2A/cancer comparison."
---

# TNF Structural Research

Work in `structural-bioinformatics/` in `koolfox/koolfox.github.io`. Current user-confirmed sequence: learn the adalimumab antibody's structure, TNF binding and RA mechanism first; then ask whether an indirect TOP2A connection is supported in RA/cancer. The student needs explanations, authentic small RNA/protein sequence examples, labeled figures and a tabbed presentation they can learn and defend. A premature large genetics/RNA research program remains outside the course task. The instructor's TOP2A interest is context, not proof of a shared drug mechanism. The user wants visible, incremental GitHub Pages updates.

## Choose the evidence needed

Immediate course deliverable: protein selection and three paper summaries for this week's class. Use `docs/class-presentation.fa.md` for the nine-step visual/oral route. Keep supplementary numerical reports optional; MD is a future decision, not a current assignment requirement. `docs/academic-study-plan.fa.md` and `docs/paper-writing-guide.fa.md` separate proposed experiments from reported results.

The user explicitly wants explanations suitable for biology-interested high-school students, including detailed basics. Define cells, proteins, receptors, binding and new terms before using them. Start with `docs/binding-mechanism.fa.md`; use `docs/paper-explanations.fa.md` for the story of each experiment. Keep the compact class route separate from the full learning material. A drug's binding target, cellular pathway and clinical response are different steps that need explanation and their own evidence.

Start with `docs/course-guide.fa.md`, `docs/research-questions.fa.md`, `docs/connection-evidence.fa.md`, `docs/literature-selection-audit.fa.md` and the relevant `data/metadata/*.json`. The broad catalog and `research-protocol.fa.md` preserve optional future investigations. Use `docs/top2a-cancer-comparison.fa.md` for the comparison stage and `docs/sequences-primer.fa.md` for sequence interpretation.

Verify publication year and peer-review status with publisher/PubMed records. A year embedded in a DOI is not necessarily publication year; the spatial RA paper's 2025 preprint was superseded in 2026. Keep three primary reviews in `literature.json`; distinguish supplemental context. Record study design, actual selected sample counts, access restrictions and limitations.

## Preserve scientific distinctions

- Adalimumab directly targets TNF. TOP2A expression, cell-cycle activity and response association are separate hypotheses. The 2025 TOP2A study used cancer-derived cell lines and a TOP2A-directed compound, not adalimumab.
- Marguerie 2025 tested adalimumab→surface SIRPG increase and SIRPG knockout→TOP2A RNA decrease in separate activated T-cell experiments. Do not join these into proven mediation or infer a direction for adalimumab→TOP2A. Its RNA dataset has no adalimumab arm.
- CRP concentration, RNA abundance, protein geometry and clinical outcome are different measurements. DAS28-CRP is a composite and does not supply raw CRP concentration.
- RefSeq mRNA FASTA may use T; label any teaching T→U conversion. Sequence letters are not expression counts or a solved RNA fold. Preserve accession versions, lengths, CDS ranges, source URLs and byte hashes. The current PDBs contain no RNA. Adalimumab is recombinant heavy/light-chain antibody protein, not an endogenous gene named adalimumab.
- 3WD5's deposited view has one TNF protomer and Fab H/L. It lacks symmetry-neighbor epitope contacts and full IgG. 4FM9 is a TOP2A cleavage-core/DNA asymmetric unit; do not claim full enzyme or dimer without assembly reconstruction.
- 3WD5 assembly 1 has an identity operator; do not automatically explain its RCSB/trace appearance difference as an assembly difference. The optional Mol* cartoon uses the deposited model, including recorded zero-occupancy coordinates, while the analytical Cα view excludes them (573 versus 579 protein residues). Read `docs/molecular-display-audit.fa.md` before changing this policy or interpreting cartoon ribbons as an atomic surface.
- Use author chain identifiers; distinguish mmCIF label chains. Exclude unoccupied coordinates and choose alternate sites consistently for analysis, figures and animation. Break traces at missing-coordinate gaps.
- Treat donors as independent units, not cells, tissue regions, repeated timepoints or libraries. Do not pool different drugs or tissues. Correlation does not establish a causal drug mechanism.

## Produce reviewable updates

Use source URLs, UTC retrieval times, SHA-256 and locked dependencies. Stream metadata or gene rows before downloading multi-gigabyte archives. A dataset record is not evidence that its full analysis ran.

Run the documented Python and browser checks for changed behavior, including keyboard tabs and sequence states. Graphics must read the same experimental payload as numerical summaries, support reduced motion and identify schematic camera motion. Keep a measured coordinate plot distinct from a labeled pathway schematic. Keep publisher full text and patient-level records out of public commits.

The executed supplementary study is in `docs/structural-feasibility-results.fa.md` and `data/processed/structural-feasibility.json`. Its partial-interface SASA loss, sphere-point sensitivity and rigid-separation control are static geometry, not dynamics, affinity, biological replication or an adalimumab-to-TOP2A test. Preserve associated Fab H/L and check source/code/figure hashes before reusing it.

Work on a feature branch. For the user's authorized visible updates, push a concrete tested increment and publish through a checked PR merge; verify the Pages deployment and URL. Do not claim publication from a local render or a pushed feature branch alone. This skill does not schedule background updates or authorize contacting researchers.
