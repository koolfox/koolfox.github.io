# Biological foundation and a testable TNF-α peptide-design question

Research cutoff: **2026-11-02**. Public-source checks: **2026-11-02, approximately 16:43–16:50 UTC**. This is a bounded evidence review sufficient to plan research, not an exhaustive peptide survey. The proposed outcome is an experimentally testable candidate hypothesis, not a replacement for adalimumab. No new molecular calculations, experiments or benchmark runs were performed. Only this notes file was written.

## 1. What biological and structural evidence can legitimately guide the project?

### Takeaway

Use human TNF-α and the corrected adalimumab–TNF interface as a design reference. The antibody recognizes a discontinuous surface across two TNF protomers; extracting a short sequence does not establish that it preserves this recognition. [Hu 2013](https://pmc.ncbi.nlm.nih.gov/articles/PMC3779706/); [2014 correction](https://pmc.ncbi.nlm.nih.gov/articles/PMC4118091/).

### Cited Findings

- **Target identity and biology:** reviewed human UniProt **P01375** is TNF, a 233-residue precursor; its annotated soluble chain is residues 77–233. TNF is homotrimeric and binds TNFR1/TNFRSF1A and TNFR2/TNFRSF1B. A receptor is the cell-surface protein receiving the TNF signal; binding TNF and preventing that receptor interaction are different observations. API checked **2026-11-02T16:46:14Z**, entry version 283, sequence version 1. [UniProt record](https://www.uniprot.org/uniprotkb/P01375/entry); [direct JSON](https://rest.uniprot.org/uniprotkb/P01375.json).
- **Wrong accession resolved:** **A0A7G8Z9Y8 is not adalimumab**. The API identifies an unreviewed 344-residue **Tumor necrosis factor 1**, gene **TNF1**, from the common periwinkle **Littorina littorea**, taxon 31216; EMBL protein QNL15297.1. Checked **2026-11-02T16:47:15Z**; entry version 15, sequence version 1, annotation updated 2026-09-02. Its status is a verified accession mismatch, not an unresolved identity. [UniProt JSON](https://rest.uniprot.org/uniprotkb/A0A7G8Z9Y8.json); [record](https://www.uniprot.org/uniprotkb/A0A7G8Z9Y8/entry).
- **What 3WD5 contains:** a 3.10 Å X-ray structure of TNF with an adalimumab **Fab**, not full IgG. RCSB polymer entity 2 is author chain **L**, adalimumab light chain; entity 3 is author chain **H**, heavy chain. Their deposited sequences are the appropriate starting reference for an antibody-derived motif. [3WD5](https://www.rcsb.org/structure/3WD5); [light-chain API](https://data.rcsb.org/rest/v1/core/polymer_entity/3WD5/2); [heavy-chain API](https://data.rcsb.org/rest/v1/core/polymer_entity/3WD5/3).
- **Hu 2013 supports receptor-site occlusion and measured mutation sensitivity.** TNF variants were passed over immobilized adalimumab Fab in SPR; Table 3 reports association, dissociation and equilibrium affinity. These are TNF substitutions tested against Fab, not mutations of a free peptide. The printed WT equilibrium KD is 1.152 × 10⁻¹⁰ M. [Hu, Table 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC3779706/#T3).
- **Use the published correction:** the 2014 notice replaces Table 2 and corrects epitope numbering, including Pro20/Gln21, Thr72/His73 and Lys90–Asn92. The corrected epitope still includes an adjacent protomer; contact assignments include light-chain L1/L3 and heavy-chain H2/H3, among others. It also contains a contact to light-chain Asp1, illustrating why a claim that all recognition is contained in an isolated CDR is unsafe. Do not propagate the original numbering errors or treat every atom-distance row as a measured bond energy. [Correction, DOI 10.1074/jbc.A113.491530](https://pmc.ncbi.nlm.nih.gov/articles/PMC4118091/).

The following central KD values were checked against the indexed primary Table 3. Fold ratios are **already-computed local values**, read from `hu-mutation-comparison.json`, not recalculated here. Reported experimental uncertainties are omitted from this compact transcription; consult Table 3 for them. [Primary table](https://pmc.ncbi.nlm.nih.gov/articles/PMC3779706/#T3); [local comparison](../../data/processed/hu-mutation-comparison.json).

| TNF variant | Printed KD (M) | Existing local KD/WT ratio |
|---|---:|---:|
| WT | 1.152e-10 | reference |
| P20A | 2.244e-10 | 1.9 |
| Q21A | 2.335e-8 | 202.7 |
| E23A | 1.458e-9 | 12.7 |
| K65A | 1.351e-8 | 117.3 |
| Q67A | 1.989e-8 | 172.7 |
| T72A | 1.053e-10 | 0.9 |
| K90A | 9.841e-10 | 8.5 |
| V91A | 5.593e-10 | 4.9 |
| N92A | 2.045e-9 | 17.8 |
| E110A | 1.384e-10 | 1.2 |
| P113A | 1.175e-9 | 10.2 |
| E135A | 1.183e-8 | 102.7 |
| I136A | 1.100e-10 | 1.0 |
| E146A | 1.808e-8 | 156.9 |

- **Existing project geometry, not new evidence of affinity:** `full-epitope.json`, generated 2026-10-16, restores the trimer by crystal symmetry and records 252 heavy-atom contacts to protomer A and 113 to neighbor C at 4.5 Å; neighbor B contributes none to this Fab. Six of the 14 tested positions are reached through C. The deposited view alone omits those neighboring contacts; its assembly record has an identity operator, so requesting “assembly 1” does not itself establish that the full epitope was reconstructed. These are project calculations, not Hu's measurements. [Existing epitope output](../../data/processed/full-epitope.json); [existing mutation comparison](../../data/processed/hu-mutation-comparison.json).
- **Geometry cannot substitute for energetics:** the existing comparison reports descriptive Spearman 0.82 between buried surface and log affinity-change ratio for selected sites. Its own limitations exclude causal/energetic interpretation, biological replication and clinical inference. This is not a peptide-affinity prediction or independent replication of SPR. [Existing comparison and limitations](../../data/processed/hu-mutation-comparison.json).
- **Receptor/ligand identity controls:** 3ALQ is **TNF-α–TNFR2**, not TNFR1; 1TNR is **TNF-β/lymphotoxin-α–TNFR1**, not TNF-α; 7KPB contains **TNF-α–TNFR1 with a conformation-selective antibody** and belongs to a small-molecule-stabilized, signaling-deficient conformation study. Thus 7KPB is not a clean unperturbed receptor template. Inspect ligand, receptor, construct mutations and conformational state before comparing interfaces. [3ALQ](https://www.rcsb.org/structure/3ALQ); [1TNR](https://www.rcsb.org/structure/1TNR); [7KPB](https://www.rcsb.org/structure/7KPB); [Lightwood 2021 primary study](https://doi.org/10.1038/s41467-020-20825-6).

### Inferences

- A defensible design targets a **subset of the corrected antibody-contact surface on trimeric human TNF**, with explicit acknowledgment that one short peptide may not span the entire two-protomer epitope. Mutation-sensitive TNF sites prioritize hypotheses; they do not prove which isolated CDR will bind.
- Use Q21A, K65A, Q67A, E135A and E146A as possible mechanistic comparison sites only with folding/trimer-state controls. Loss of binding to an altered target could reflect structural disruption, not direct recognition of that side chain.
- Separate the target's author residue numbering, UniProt precursor numbering, and antibody CDR numbering. Assign an eventual candidate's parent chain and exact source span before calling it adalimumab-derived.

### Gaps

- Hu and 3WD5 establish a Fab interface and Fab–TNF affinity effects. They do not validate any short adalimumab-derived peptide, its potency, or a claim of clinical superiority based on interface size.
- Some direct PMC/publisher requests were blocked. The primary indexed text yielded Table 3 and the two-protomer passage; the correction was subsequently opened successfully. No fresh full-PDF transcription was performed. The local mutation metadata records printed kinetic-cell anomalies, including P113A and V91A; retain the reported KD rather than silently repairing or recalculating it. [Local provenance/audit](../../data/metadata/hu-2013-mutations.json).
- The existing local CDR summary disagrees with the original paper's broad L2-dominance wording and uses a stated Kabat-style definition. This turn did not reannotate every residue or resolve every CDR-label inconsistency; use the corrected contact table and explicit residue spans rather than a loop-name ranking alone. [Local comparison](../../data/processed/hu-mutation-comparison.json); [published correction](https://pmc.ncbi.nlm.nih.gov/articles/PMC4118091/).

## 2. What published peptides, conformation evidence and real complexes support feasibility?

### Takeaway

There are experimental TNF-inhibitory peptide precedents, including an antibody-CDR-derived example. Their sites, chemical constraints and assay dependencies differ; none validates the Google-suggested sequences or guarantees that a free adalimumab CDR will reproduce Fab binding. [Döring 1994](https://pubmed.ncbi.nlm.nih.gov/7935497/); [Luzi 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4378371/).

### Cited Findings

Four selected primary studies are enough for this plan; they are not a complete survey. “Independent evidence” below means distinct experimental readouts within the cited studies, not an assertion of replication by an independent laboratory.

| Primary study | Verified peptide identity/sequence status | Binding or receptor-interaction evidence | Separate functional/physical evidence and limits |
|---|---|---|---|
| **Döring et al., 1994**, Molecular Immunology 31:1059–1067, DOI 10.1016/0161-5890(94)90101-5 | Light-chain CDR1 peptide from anti-TNF antibody **Di62**, not adalimumab. Exact sequence not verified from the accessible primary abstract; intentionally not supplied. | Di62–TNF competition Ki **4 μM**; inhibition of TNF binding to both p55 and p75 receptors. Ki is not a direct equilibrium peptide KD. | Protection of L929 cells, IC50 **6 μM**. This is relevant antibody-derived precedent, but not evidence for an adalimumab peptide. Abstract-level verification. [Primary record](https://pubmed.ncbi.nlm.nih.gov/7935497/); [DOI](https://doi.org/10.1016/0161-5890(94)90101-5). |
| **Luzi et al., 2015**, Protein Engineering Design and Selection 28:45–52, DOI 10.1093/protein/gzu055 | Verified M21 core **ACPPCLWQVLC**, with three Cys chemically attached to a **TBMB-methyl mesitylene core**; functional M21h is **ACPPCLWQVLCGGSGSGSG** with that bicyclic chemistry. The letters alone do not specify the compound. | Fluorescence polarization measured individual labeled variants; Table I reports **13.5 ± 2.7 nM** for labeled M21 and **5.3 ± 0.5 nM** for labeled M21h. MST corroboration reported for M9, not automatically every M21 variant. | Unlabeled M21h L929 rescue IC50 changed from **66 μM** to **4 μM** with longer reported preincubation; SEC-MALS/AUC/MS support trimer disassembly. **4TWT** captures a TNF dimer complex. [Primary study, Table I and Fig. 2](https://pmc.ncbi.nlm.nih.gov/articles/PMC4378371/); [4TWT](https://www.rcsb.org/structure/4TWT). |
| **Checco et al., 2020**, ACS Chemical Biology, DOI 10.1021/acschembio.0c00313 | Engineered **29-residue α/β-peptide 3**, derived from a Z-domain lineage, with three β residues and three Aib residues. Full chemical sequence not transcribed here. It is not an adalimumab CDR. | TNF–TNFR1 competition ELISA IC50 **9.6 nM** under the specified surfactant-assisted condition; receptor competition is not direct peptide KD. | SEC tracks trimer loss; WEHI-13VAR rescue depends strongly on time/additives. The reported no-additive, prolonged-preincubation cell IC50 is **80 nM**, expressed as peptide concentration **before dilution**, not final cellular exposure. TNFR2 blockade was not tested. [Primary study](https://pmc.ncbi.nlm.nih.gov/articles/PMC7654703/); [PubMed](https://pubmed.ncbi.nlm.nih.gov/32662976/). |
| **Niu et al., 2022**, JACS 144:9610–9617, DOI 10.1021/jacs.1c13717 | Follow-up of the same inhibitor lineage: **α/β-peptide 1** and all-α **peptide 3**. Numbering is paper-specific; 2020 peptide 3 is not 2022 peptide 3. No full chemical sequence transcribed. | X-ray complexes and solution ITC: all-α peptide 3 has apparent KD **2.1 ± 0.5 μM**, N **0.93 ± 0.09**, in the reported detergent-containing system. Do not assign this KD to α/β-peptide 1. | TNF-induced WEHI-13VAR killing/rescue assays and kinetic modification by appended groups; structures support monomer binding. This is mechanistic follow-up, not independent-laboratory replication of 2020. [Primary study, Fig. 5](https://pmc.ncbi.nlm.nih.gov/articles/PMC9749406/); [7TA3](https://www.rcsb.org/structure/7TA3); [7TA6](https://www.rcsb.org/structure/7TA6). |

- **Why CDR isolation can fail:** Timmerman et al. experimentally compared anti-gastrin antibodies with their CDR-derived binders. Parent antibodies showed nM affinity and selective recognition, whereas estimated 1:1 peptide affinities were 0.1–1 mM, with broader recognition and aggregation complicating apparent stability. This is an instructive different-target example, not a measurement of adalimumab-derived peptides. It supports checking specificity, stoichiometry and aggregation rather than transferring parent-antibody affinity to an isolated loop. [Primary study, DOI 10.1002/jmr.1017](https://pubmed.ncbi.nlm.nih.gov/21038356/).
- **Three actual protein–peptide structures suitable for prospective method checks:** **4TWT**, TNF dimer–M21, approximately 2.9 Å; **7TA3**, TNF monomer–all-α peptide 3, 2.50 Å; **7TA6**, TNF monomer–29-residue α/β-peptide 1, 2.67 Å. These are experimentally determined complexes, not invented benchmarks. 4TWT's deposited peptide entity is **12 residues, ACPPCLWQVLCG**, author chains E/F; the mesitylene-derived core is separate component **38A**. This differs from the longer M21h used in functional assays. [4TWT entities and components](https://www.rcsb.org/structure/4TWT); [7TA3](https://www.rcsb.org/structure/7TA3); [7TA6](https://www.rcsb.org/structure/7TA6).

### Inferences

- Removing a CDR removes its framework anchoring, neighboring loops and heavy/light-chain geometry; the free chain can sample nonbinding conformations and pay a larger conformational entropy cost. Constraining a loop might help, but can also fix an unsuitable geometry or obscure important groups. This is a mechanistic hypothesis consistent with the corrected Fab interface and CDR-mimic study, not an experimentally demonstrated outcome for this proposed TNF panel. [Corrected Hu contact map](https://pmc.ncbi.nlm.nih.gov/articles/PMC4118091/); [Timmerman 2010](https://pubmed.ncbi.nlm.nih.gov/21038356/).
- M21 and the α/β lineage are useful peptide-positive controls for TNF engagement/inhibition, but **their trimer-disrupting mechanism differs from adalimumab's receptor-surface occlusion**. A favorable pose at their cryptic site would answer a different question from mimicry of the antibody surface. [Luzi structure](https://www.rcsb.org/structure/4TWT); [Niu structures/mechanism](https://pmc.ncbi.nlm.nih.gov/articles/PMC9749406/).
- A practical prospective model check can attempt recovery of a deposited peptide pose and contacts using the correct monomer/dimer state, before ranking new candidates. Preserve crosslinks, noncanonical residues and termini. Recovery is a technical check under that method's assumptions, not prediction of potency or validation on the adalimumab epitope.

### Gaps

- **Google sequences remain unverified:** exact-string searches for `YQNQFQGK`, `CYQNQFQGKC`, and the hyphenated cyclic proposal `C-Y-Q-N-Q-F-Q-G-K-C`, including TNF/antibody-qualified searches, did not identify a traceable primary experimental source in this bounded review. No parent-chain/residue mapping, measured KD, receptor-blocking result, or experimental complex was established. This is **absence of a found source, not proof of nonexistence**. Do not label these as validated inhibitors, adalimumab CDRs, or positive controls.
- Merely adding terminal cysteines does not specify verified cyclization, connectivity, conformational fidelity or activity. The proposed cyclic Google compound remains an untested design claim.
- Di62's exact sequence remains blocked at abstract-level access. For the α/β family, use the paper's chemical drawings/supporting information and PDB chemistry before any sequence-level implementation. Standard one-letter strings would omit essential chemistry.
- The 2020 text contains an isolated concluding “27 residues” statement inconsistent with its repeated 29-mer description; retain the 29-mer identity supported by the main description and the later 29-residue PDB entity, and resolve chemistry from primary structural files before implementation. [2020 primary text](https://pmc.ncbi.nlm.nih.gov/articles/PMC7654703/); [7TA6](https://www.rcsb.org/structure/7TA6).
- **Benchmark status:** the entries' existence, identities and resolutions are verified. No pose-recovery benchmark was run, no performance threshold was measured, and no complete missing-atom/terminal-modification audit was done. None of these complexes establishes a validated short adalimumab-derived peptide on the intact trimeric adalimumab epitope. No such same-site positive complex was identified among the selected sources.

## 3. What research question, comparisons and evidence ladder are justified?

### Takeaway

**Proposed research question:** Can short, traceably adalimumab-interface-inspired peptides bind intact soluble human TNF-α and reduce its association with TNFR1, and does a matched conformational constraint improve those outcomes over the linear parent and scrambled controls? This is a falsifiable discovery question, not a drug-equivalence claim.

### Cited Findings

- The biological rationale is the corrected two-protomer antibody interface plus mutation-sensitive target positions; the feasibility precedent is experimental peptide inhibition, not any validated new candidate here. [Hu affinity data](https://pmc.ncbi.nlm.nih.gov/articles/PMC3779706/#T3); [corrected epitope](https://pmc.ncbi.nlm.nih.gov/articles/PMC4118091/); [Di62 precedent](https://pubmed.ncbi.nlm.nih.gov/7935497/).
- Receptor competition, direct peptide–TNF binding and cellular rescue have distinct readouts. Published TNF peptide studies show that nanomolar binding/competition and cellular inhibition can differ substantially and depend on assay conditions; these endpoints should not be combined into one “drug score.” [Luzi 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4378371/); [Niu 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9749406/).

### Inferences

The following is a **proposed conceptual design**, not a wet-lab protocol or reported result.

1. **Survey question:** Which short-peptide chemistries have separately supported TNF binding, TNFR1/TNFR2 competition, functional inhibition and an experimental complex, and which mechanisms actually overlap the corrected adalimumab epitope? The four-study evidence matrix above is a sufficient starting set; it does not establish the best peptide or exhaust the literature.
2. **Candidate definition:** select a small panel of interface-inspired source spans, provisionally around 9–20 residues as a project choice. Record exact 3WD5 parent chain/author numbering, the CDR definition and source sequence before design. Test linear parents against matched constrained analogues. No new candidate sequence or active cyclic compound is asserted in these notes.
3. **Null/alternative:** the null is no reproducible improvement in TNF binding or TNFR1 competition over matched controls, and no benefit of constraint over the linear parent. The alternative is target-dependent binding plus reproducible receptor competition, with a separately assessed constraint effect. A binder without blockade is a binder-only hit; it does not satisfy the full alternative.
4. **Comparison/control matrix:**

| Proposed comparison | What it can resolve |
|---|---|
| Inspired parent versus composition/charge-matched scrambled peptide | Whether sequence order matters; one scramble alone cannot exclude every nonspecific effect. |
| Constrained analogue versus its matched linear/constraint-disabled version | Whether the specific constraint helps, rather than merely adding cysteines, a linker or another chemical group. |
| Human TNF versus an unrelated protein; target-free and readout-only controls | Target-dependent binding versus adsorption, aggregation or detection interference. |
| Candidate versus adalimumab Fab | Functional assay positive reference for the parent recognition surface. Full IgG, if included, must be identified separately because format/valency differ. |
| Candidate versus fully specified published M21 or α/β-family comparator | Peptide-positive control for the assay; not evidence of the same binding site or mechanism. |
| WT TNF versus selected Hu-sensitive and relatively insensitive variants | Consistency with the proposed epitope, provided each target's folding and oligomeric state are checked. |
| TNFR1 competition versus a separately labeled TNFR2 measurement | Receptor-specific blockade; TNFR1 results alone do not establish TNFR2 inhibition. |
| TNF-only, peptide-only, vehicle/additive-only and TNF-plus-peptide functional comparisons | TNF-dependent protection versus toxicity, direct cellular effects or additive effects. |

5. **Evidence ladder:** first confirm identity/chemistry and suitability of the target state; use structural modeling only to prioritize. Next establish direct binding with concentration dependence and an orthogonal check of binding/stoichiometry or target engagement. Then test **TNF–TNFR1 competition** as a distinct purified-protein question, explicitly checking detection interference and recording target state, timing and additives. TNFR2 is a separate extension. Finally ask whether TNF-dependent signaling or cytotoxicity changes without a peptide-only effect. A proposed signaling readout such as an NF-κB reporter must include controls for direct downstream suppression; rescue alone does not prove receptor occlusion.
6. **Mechanism discrimination:** retain intact-trimer antibody-site competition as the intended mechanism. If a hit instead correlates with trimer loss, classify it as a possible trimer-disrupting hit and investigate separately. Competition with Fab is supportive of overlapping recognition but could also be steric/allosteric; it does not prove identical atomic contacts.
7. **Analysis and decision:** compare molar exposures under matched conditions, report independent experimental repeats rather than counting wells as independent evidence, and report uncertainty. Predefine usable solubility, assay-interference exclusions and decision thresholds before testing; do not invent a universal potency cutoff now. A constrained candidate must outperform its matched parent reproducibly to support the constraint hypothesis. Failure to bind or block is an informative negative result.
8. **Claim boundary:** successful results could justify “a TNF-binding peptide candidate” or “a TNFR1-interaction inhibitor under the tested conditions.” Drug development additionally requires stability, selectivity, exposure, safety and disease-relevant efficacy evidence; no docking pose, contact count, KD or single cell-rescue result establishes replacement of adalimumab.

### Gaps

- No new candidate has verified binding, receptor blockade, solution conformation or potency. No exact new candidate sequence is needed to accept this research plan.
- A computational method may not support a comparator's noncanonical chemistry. If unsupported, mark that comparator **outside the model's scope** rather than silently deleting its crosslinks or substituting ordinary residues. A receptor-only, antibody-only or small-molecule complex is not a protein–peptide benchmark.
- Thresholds, sample-size justification, experimental resources and assay-specific interference limits remain future design choices. Clinical efficacy and superiority are outside this question.
- Browser-tab context was supplied by the user. This researcher did not inspect personal browser content and does not claim all six public tabs were fully read. The Google suggestions were treated as claims requiring sources; no private browsing material or publisher full-text copies were saved.
- **Reproducibility record:** local files were read without rerunning calculations. SHA-256: `full-epitope.json` = `51ef365b6591a20d4df525ca9bb4e45156b72cfd083cc410b9397051659d07a2`; `hu-mutation-comparison.json` = `fcd46b3e3fbf5f19d2962b30e09d80a73ee22b675a1cdb2fd34af936b1780bf4`. API-response SHA-256: P01375 JSON = `d2f10fbfec4c92fa45eb5f71c479069fcaa05d4cce176e6c9f87c8a9ce428011`; A0A7G8Z9Y8 JSON = `494f30babaf3cfa148fc91e9bb462357560fcae66a4f2bfe04ee4262aa455c54`. These identify the responses/outputs inspected, not independent experimental validation.
