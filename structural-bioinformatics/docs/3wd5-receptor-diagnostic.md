# 3WD5 receptor preparation diagnostic, 2026-11-06

**Status: blocked; no receptor prepared and no 3WD5 docking run.** This is a diagnostic, not a repaired structure or a binding result. The deposited asymmetric unit contains TNF chain A and Fab chains H/L, not a full antibody or TNF trimer.

The existing [deposited input](../assets/3wd5.pdb) has SHA-256 `fae6eee1b06b8cba0a466280dbc32563efaa54ec639afd921cb610d17debd216`, matching the existing local raw copy. Its source is [RCSB 3WD5 PDB](https://files.rcsb.org/download/3WD5.pdb); the original retrieval time was not established here. This audit used the existing bytes, without a download, on 2026-11-06 UTC. Its declared resolution is 3.10 Å.

The [audit script](../scripts/audit_3wd5_receptor.py) lists the zero-occupancy atoms and distances. The deposited SSBOND records include A69–A101. Their SG–SG distance is 2.049 Å, but A69 SG to A101 CB is 1.750 Å. In the installed Meeko 0.8.0 `find_inter_mols_bonds`, inter-residue pairs are inferred by distance using 1.2 times the sum of covalent radii; for C/S those radii are 0.76/1.05 Å, giving a 2.172 Å cutoff. Thus this close SG–CB pair is also classified as an inter-residue bond. The A101 CYX template reports an excess bond. This is consistent with the specific false bond; the deposited geometry itself is unusually close, so bypassing bond matching would not repair the clash.

There are 12 zero-occupancy protein atoms in H and 18 in L; some are backbone atoms, including H41 CA and L212 CA. The regular workflow rejects them before producing an output directory. Setting occupancies positive, ignoring them, deleting entire residues, or using `--forgive_extra_bonds` would not establish a valid receptor. Reconstructing unresolved coordinates and adjusting the A69/A101 geometry would require explicit modeling, choices, and independent geometry/connectivity validation. Neither PDBFixer nor OpenMM is present in the existing docking environment; no installation or large download was performed.

For diagnosis only, Bio.PDB 1.86 selected all protein residues in chains A/H/L and omitted water, leaving deposited atom coordinates and occupancies unchanged. [Selected diagnostic input](../assets/3wd5-receptor-diagnostic/3wd5-ahl-diagnostic.pdb) SHA-256 `45fed39b693c97d4949ce64c1ce6fb00c211ed62b8f10362f6f5a21d5eae48e8`; [stdout](../assets/3wd5-receptor-diagnostic/3wd5-ahl-diagnostic.stdout) SHA-256 `ddfc2f9bc2f64d05e8e091e217e18f167d0f35014753e0f1bf6724a8e4efe75e`; [stderr](../assets/3wd5-receptor-diagnostic/3wd5-ahl-diagnostic.stderr) SHA-256 `37b8c6462511081175f4fb7a07ad22ae3731224e73812a0e9829be8cb63f4f0c`. The selection is not a preparation: it retains zero-occupancy atoms and omits PDB SSBOND records. Meeko's distance inference detects the bonds independently.

The diagnostic command was `mk_prepare_receptor.py --read_pdb 3wd5-ahl-diagnostic.pdb -o 3wd5-ahl-diagnostic -p` using Meeko 0.8.0, RDKit 2026.09.1 and Python 3.12. Meeko reported no matching template for A:101 and produced no receptor. The regular `run_general_peptide_docking.py` was also invoked with `--chain A,H,L --exclude-water --sequence AC`, an arbitrary 20 Å box centered at (0,0,0), and the existing Meeko/Vina executables; it rejected zero occupancy before preparation. That arbitrary box was solely a preflight probe and has no site interpretation. Vina was not run. No scores or poses exist from this attempt.

Next work requires a reproducible, explicitly documented structure-repair method and review of reconstructed atoms, geometry, disulfides, protonation, and missing regions before selecting a justified docking box and actually running the multichain calculation. A successful calculation would remain exploratory and cannot establish binding, affinity, or biological activity.

## Follow-up: bounded disulfide sensitivity experiment

A new **geometric diagnostic**, not a prepared receptor, probes whether simply rotating the two deposited cysteine sulfur atoms could remove the severe close contact without appreciably changing the deposited structure. [Script](../scripts/scan_3wd5_disulfide.py); [recorded result](../assets/3wd5-receptor-diagnostic/disulfide-torsion-scan.json). It keeps the input intact and creates no modified coordinate file. On 2026-11-06 UTC it used the hash-checked existing 3WD5 file, Python 3.12, NumPy 2.5.4 and Biopython 1.86. Reproduce from the repository root:

```sh
/opt/anaconda3/envs/tnf-docking/bin/python structural-bioinformatics/scripts/scan_3wd5_disulfide.py
```

The experiment rotates each A69/A101 SG about its own CA–CB axis on a 2° grid (32,400 combinations), keeping all other atoms fixed. It counts combinations with SG–SG distance 1.9–2.2 Å, both CB–SG–SG angles 95–115°, and each sulfur at least 2.5 Å from other occupied protein heavy atoms in deposited A/H/L, excluding its own residue and its bonded partner SG. These broad **exploratory filters are not a force field, chemical validation, or a receptor acceptance standard**. The 59 grid points passing all filters include a minimum combined SG displacement point at rotations −90° and −10°: SG movements 2.354 and 0.285 Å, SG–SG 1.904 Å, angles 102.16° and 95.39°, and nearest other heavy atoms 2.768 and 2.867 Å. This is a mathematical sensitivity result, not a proposed model. It shows that, under these restricted choices and grid, the least-displaced passing alternative still moves an atom over 2 Å; it does not establish that a different repair is impossible.

The simple filter does not evaluate torsional energy, hydrogen bonds, clashes between unchanged atoms, waters, the full crystallographic environment, or alternate protonation; 3WD5 is 3.10 Å and has unresolved Fab atoms. More complete, independently validated modeling is needed before treating an A/H/L docking receptor as fit for interpretation. The separate chain-A-only exploratory docking and its unchanged strained geometry remain documented in `assets/3wd5-tnf-docking/`; this scan does not upgrade that preparation or support a binding claim.

## Independent angle and dihedral audit, 2026-11-06

The independent OpenCode review correctly identified that the preceding scan had **no CB–SG–SG–CB dihedral condition**. Consequently its 59 passing points passed only the stated distance, angle, and proximity filters; that count does not assess disulfide torsion or establish a chemically plausible structure. The minimum-displacement grid point is a sensitivity example, not a proposed repair. No previous result or coordinate has been overwritten.

[Independent audit script](../scripts/audit_3wd5_disulfide_angles.py) reads the original deposited PDB bytes (SHA-256 `fae6eee1b06b8cba0a466280dbc32563efaa54ec639afd921cb610d17debd216`) directly, verifies the hash and four unique, positive-occupancy, non-alternate ATOM records, and uses scalar vector operations. In author chain A, the ordered atoms are CB69, SG69, SG101, CB101, with coordinates respectively `(0.514, 12.063, 2.434)`, `(1.244, 11.739, 4.025)`, `(2.584, 13.241, 3.644)`, and `(2.939, 11.624, 4.443)` Å. The dot-product angles are **88.199°** for CB69–SG69–SG101 and **53.169°** for SG69–SG101–CB101. The signed dihedral CB69–SG69–SG101–CB101 is **−139.563°**. Its sign uses the oriented angle from normal `(SG69−CB69) × (SG101−SG69)` to normal `(SG101−SG69) × (CB101−SG101)`, about SG69→SG101, in the range −180° to 180°. The offline test independently compares all three values to `Bio.PDB`'s `calc_angle` and `calc_dihedral`; their agreement also confirms this sign convention.

```sh
python3 structural-bioinformatics/scripts/audit_3wd5_disulfide_angles.py
```

The earlier 95–115° angle window and all its other numerical cutoffs were exploratory filters, not scientific repair or acceptance criteria. No dihedral range was applied, and no re-filtered count is claimed. A torsion value alone cannot validate the side chains: a defensible model would require independent assessment of the complete local environment, stereochemistry and uncertainty. The deposited structure and earlier docking evidence remain unchanged; no new receptor or binding conclusion follows from this audit.

## Independent deposited comparator and next control

The existing [7TA3 structure](https://www.rcsb.org/structure/7TA3) is a separate TNF–α-peptide-3 complex, not a TNF–adalimumab complex. Its author chains B and D provide two deposited TNF copies with SSBOND Cys69–Cys101. The project already has its original [7TA3 PDB](../assets/tnf-peptide/7ta3.pdb) (SHA-256 `3c90d11838c88ebb5501319b367c6ac89e16c67c9a84aa22d17d5a4708052de4`; original retrieval provenance in [metadata](../data/metadata/tnf-peptide-preparation.json)) and [3WD5 PDB](../assets/3wd5.pdb) (SHA-256 `fae6eee1b06b8cba0a466280dbc32563efaa54ec639afd921cb610d17debd216`). Source records were checked 2026-11-06 UTC. [Comparison script](../scripts/compare_tnf_disulfides.py) reads those exact bytes, requires positive occupancy and unambiguous non-alternate atoms, and prints reproducible measurements in Å and degrees:

```sh
python3 structural-bioinformatics/scripts/compare_tnf_disulfides.py
```

| Deposited TNF chain | SG69–SG101 | SG69–CB101 | CB69–SG69–SG101 | SG69–SG101–CB101 | CB69–SG69–SG101–CB101 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 3WD5 A | 2.049 | 1.750 | 88.20 | 53.17 | −139.56 |
| 7TA3 B | 2.028 | 3.003 | 102.63 | 103.14 | −84.03 |
| 7TA3 D | 2.033 | 3.022 | 103.79 | 103.80 | −69.88 |

The same dihedral convention as the preceding audit is used. Both 7TA3 copies show a much longer SG69–CB101 distance and different local angles than 3WD5 A. This is a small, related-structure comparison, not a population-derived geometry standard, independent biological replicates, or evidence that either 7TA3 conformation is correct in the 3WD5 crystal environment. No coordinates were transferred. Neither these measurements nor Meeko success would validate a receptor.

A practical **positive-control strategy** is to reproduce the already documented [7TA3 known-site rigid redocking](peptide-workshop.fa.md) using its original inputs and hash-checked replay, then separately develop a flexible-peptide and negative-control benchmark before interpreting a new 3WD5 calculation. The existing reported 0.1368 Å fixed-frame heavy-atom RMSD is an easy bound-conformation, known-site result with modeled receptor side chains, not a blind or flexible-peptide validation. 7TA3 has a different ligand and biological context; success cannot certify 3WD5 A/H/L, its disulfide, Fab missing atoms, or any novel peptide. If revisiting 3WD5 preparation, evaluate alternative experimentally justified models and local electron-density/validation evidence, explicitly model missing atoms and protonation, and independently assess complete stereochemistry, connectivity, clashes, assembly and sensitivity before docking. The present comparison supplies no accepted repair, prepared multichain receptor, new docking run, affinity or biological conclusion.

## بررسی گزارش اعتبارسنجی wwPDB

گزارش XML اعتبارسنجی [3WD5](https://files.rcsb.org/pub/pdb/validation_reports/wd/3wd5/3wd5_validation.xml.gz) در `2026-11-06T15:16:48Z` دریافت شد؛ SHA-256 فایل فشرده `32b232daeab16593e270324416013a59b5924e0cb0456426e880b5e11e82ec97` است. پردازش با `scripts/inspect_3wd5_validation.py` صرفاً رکوردهای مدل ۱، زنجیرهٔ A و Cys69/Cys101 را می‌خواند؛ مختصات را تغییر نمی‌دهد. در گزارش منتشرشده، برای این دو باقی‌مانده به‌ترتیب RSCC برابر 0.841 و 0.878، RSRZ برابر 0.442 و 0.345 و EDIAm برابر 0.404 و 0.480 ثبت شده است. گزارش، وضعیت رامچاندران Cys101 را `OUTLIER` و Cys69 را `Favored` ثبت می‌کند؛ این وضعیت به هندسهٔ زوایای ستون فقرات مربوط است، نه اثبات هندسهٔ درست پیوند دی‌سولفید.

این عددها خلاصهٔ اعتبارسنجی مدل ثبت‌شده‌اند؛ به‌تنهایی تعیین نمی‌کنند کدام آرایش جایگزین گوگردها درست است. تفکیک‌پذیری ساختار [3.10 Å](https://www.rcsb.org/structure/3WD5) است. بررسی نقشهٔ چگالی و مقایسهٔ مدل‌های جایگزین با دادهٔ پراش، محیط بلور و هندسه هنوز انجام نشده و ممکن است در این تفکیک‌پذیری نتیجهٔ قطعی ندهد. بنابراین مشکل آماده‌سازی 3WD5 و داکینگ چندزنجیره‌ای همچنان باز است.

برای بازتولید، فایل XML فشرده را از نشانی بالا دریافت و هش آن را کنترل کنید؛ سپس مسیر فایل محلی را به برنامه بدهید:

```bash
python structural-bioinformatics/scripts/inspect_3wd5_validation.py PATH_TO_3WD5_VALIDATION.xml.gz
```

## ساخت فایل نقشه برای بررسی سه‌بعدی

فایل ضرایب اعتبارسنجی [2Fo−Fc ساختار 3WD5](https://files.rcsb.org/pub/pdb/validation_reports/wd/3wd5/3wd5_validation_2fo-fc_map_coef.cif.gz) در `2026-11-06T15:59:29Z` دریافت شد؛ SHA-256 فایل فشرده `4a4f2d98a9f1bdaaf9ffa70115be757d96f2e881dfef9d9b01c332c7864c0322` است. این ضرایب طبق [توضیح RCSB](https://www.rcsb.org/docs/general-help/electron-density-maps-and-coefficient-files) از داده و مدل به‌دست می‌آیند؛ نقشهٔ فازی‌شده شاهد کاملاً مستقل از مدل نیست.

با Gemmi نسخهٔ 0.7.5 و نرخ نمونه‌برداری ۳، اسکریپت `scripts/export_3wd5_density_map.py` فایل CCP4 با شبکهٔ `160 × 160 × 160` ساخت؛ ابعاد، مقادیر، سلول، گروه فضایی، ترتیب محورها، مبدأ و اندیس شروع آن پس از خواندن مجدد بررسی شد. هش ورودی، خروجی، اسکریپت و نسخه در `data/processed/3wd5-density-map-export.json` ثبت است. نقشهٔ حدود ۱۶ مگابایتی در مخزن قرار نگرفته و با فرمان زیر در یک پوشهٔ تازه ساخته می‌شود؛ آزمایش با Python 3.12.15، Gemmi 0.7.5 و NumPy 2.5.4 انجام شد؛ Gemmi وابستگی اختیاری جدا از محیط قفل‌شدهٔ درس است. برای ساخت محیطی مستقل می‌توانید `python3.12 -m venv ENV_DIR` و سپس `ENV_DIR/bin/python -m pip install gemmi==0.7.5 numpy==2.5.4` را اجرا کنید. برنامه هش ورودی را با هش ثبت‌شده مقایسه می‌کند و فایل متفاوت را رد می‌کند.

```bash
python structural-bioinformatics/scripts/export_3wd5_density_map.py \
  --coefficients PATH_TO_3WD5_COEFFICIENTS.cif.gz --output-dir NEW_OUTPUT_DIRECTORY \
  --retrieved-at-utc YOUR_UTC_RETRIEVAL_TIME \
  --coordinates structural-bioinformatics/assets/3wd5.pdb
```

زمان دریافت خود را به شکل `2026-11-06T15:59:29Z` ثبت کنید؛ این مقدار نمونه مربوط به دریافت ماست، نه زمان دریافت شما. اگر زمان را نمی‌دانید گزینهٔ آن را حذف کنید تا `null` ثبت شود. فایل حاصل را می‌توان کنار مختصات ثبت‌شده در PyMOL یا Coot باز کرد. در این اجرا پارامترهای سلول و شمارهٔ گروه فضایی با فایل `assets/3wd5.pdb` تطبیق داده و هش فایل ثبت شد؛ این کنترل به‌تنهایی جای بررسی تصویری هم‌مکانی نقشه و مختصات را نمی‌گیرد. گزینهٔ `--coordinates` برای این کنترل اختیاری است و بدون آن، هش مختصات `null` ثبت می‌شود. در این مرحله خودِ این برنامه‌ها اجرا نشدند و بررسی تصویری محل Cys69/Cys101، مقایسه با مدل‌های جایگزین و اصلاح گیرنده هنوز انجام نشده است.
# 3WD5: bounded 7TA3 sulfur-transfer experiment

**Result: neither tested candidate is an accepted repair.** No coordinates were
exported, no receptor was prepared and no docking was run. The A/B/C trimer
copies inherit the same deposited chain A disulfide geometry; this study tests
chain A only and does not validate the copies or the Fab H/L chains.

## Method and provenance

On 2026-11-06 UTC we compared two experimentally deposited human TNF
conformations in [7TA3](https://www.rcsb.org/structure/7TA3) chains B and D,
from a different peptide complex, to [3WD5](https://www.rcsb.org/structure/3WD5)
author chain A. The reported resolutions are respectively 2.50 Å and 3.10 Å;
a different structure, ligand and crystal environment do not establish a
3WD5 conformation. Existing source hashes and map provenance are in the
[previous density comparison](3wd5-local-density-comparison.md) and
[recorded output](../data/processed/3wd5-template-transfer.json).

For each 7TA3 chain, least-squares fit the six N, CA and C atoms from Cys69 and
Cys101 simultaneously to the corresponding 3WD5 atoms. Apply that single
rigid transformation to both template SG atoms only, leaving 3WD5 CB and every
other atom fixed. Record fit RMSD, SG displacement, CB–SG and SG–SG distances,
angles, dihedral, and nearest other positive-occupancy heavy atom in the
deposited A/H/L model including waters (excluding each sulfur's own residue and
the other sulfur). These are direct transfer probes, not energy minimization,
side-chain rebuilding or refinement. The deposited A/H/L coordinates do not
include the complete crystal environment. SG candidates are sampled against
the existing 2Fo−Fc validation map using the earlier 1 Å sphere method.
The map hash and coefficient hash are checked and the 160³ grid must equal a
regenerated grid; script and helper hashes are recorded. Selection of these
candidates and measures was not preregistered.

| Transfer | Backbone RMSD (Å) | SG movements 69 / 101 (Å) | CB–SG 69 / 101 (Å) | SG–SG (Å) | SG69–CB101 (Å) | Angles (°) | Dihedral (°) |
| --- | ---: | --- | --- | ---: | ---: | --- | ---: |
| 7TA3 B | 0.424 | 0.938 / 1.262 | 1.991 / 1.266 | 2.028 | 2.378 | 79.20 / 89.27 | −113.72 |
| 7TA3 D | 0.437 | 0.794 / 0.938 | 2.394 / 1.841 | 2.033 | 1.972 | 89.11 / 60.95 | −94.29 |

The fit preserves the donor SG–SG distance by construction; it does **not**
preserve bonds to the fixed target CB atoms. In both transfers at least one
CB–SG distance differs from its corresponding 7TA3 bond by more than 0.4 Å.
B's nearest other occupied heavy atom to SG69 is A101 CB at 2.378 Å; D's is
A101 CB at 1.972 Å. D also remains inside Meeko's previously documented
2.172 Å carbon–sulfur distance-inference cutoff. Geometry is thus visibly
inconsistent even before a complete stereochemistry and clash review; no
attempt was made to turn either probe into a Meeko receptor.

| Transfer | SG69 center / sphere mean (σ) | SG101 center / sphere mean (σ) | Voxels 69 / 101 |
| --- | --- | --- | --- |
| 7TA3 B | 1.513 / 1.213 | 1.575 / 1.350 | 3 / 4 |
| 7TA3 D | 1.397 / 1.598 | 0.703 / 0.891 | 3 / 4 |
| Deposited (previous study) | 2.380 / 2.086 | 1.437 / 1.514 | 4 / 4 |

The map depends on deposited model phases and is not independent evidence.
Voxel sets differ, 3–4 points are sparse and neighboring atoms contribute;
these descriptive values are neither RSCC nor a selection or acceptance test.
No omit map, full crystallographic refinement, uncertainty analysis, visual
inspection, protonation assignment, complete crystal-neighbor clash analysis,
or full all-atom validation was performed. These negative results reject only
the two specific direct-transfer choices, not all possible repairs. The
previous rotation candidate and its limitations remain in the linked report.

## Reproduction

```sh
/opt/anaconda3/envs/tnf-docking/bin/python structural-bioinformatics/scripts/compare_3wd5_template_transfer.py \
  --map PATH_TO_VALIDATION_MAP.map --coefficients PATH_TO_VALIDATION_COEFFICIENTS.cif.gz
uv run --project structural-bioinformatics pytest -q structural-bioinformatics/tests/test_3wd5_template_transfer.py
```

The map and coefficient files are external, hash-checked inputs; neither was
committed. The experiment was run on CPU with the existing Python 3.12
scientific environment. No heavy training or Kaggle job was needed. The
regular workflow guard remains in place. A defensible further attempt needs a
modeling and validation procedure that treats both cysteine side chains, local
backbone and crystal neighbors, missing regions and protonation, and tests
support from diffraction data without treating model-biased map agreement as
independent proof.


---

## 3WD5 multichain rotamer repair exploration

**Outcome: a reproducible preparation candidate, not an accepted repair or experimental validation.** This extends the earlier sulfur-rotation scan and failed 7TA3 template transfer; it does not introduce a new refinement algorithm. It tests a broader geometric screen, a controlled recovery example, the reconstructed three-chain environment, the unchanged input guard and unmodified Meeko. It does not establish the actual sulfur positions or justify docking. [Script](../scripts/explore_3wd5_rotamer_repair.py); [complete numeric record](../data/processed/3wd5-rotamer-repair-exploration.json); [previous investigation](3wd5-trimer-receptor-investigation.md); [density limitations](3wd5-local-density-comparison.md).

### Method and boundaries

On 2026-11-06 UTC, use the hash-checked deposited [3WD5](https://www.rcsb.org/structure/3WD5), reconstructed trimer/three Fab model and deposited [7TA3](https://www.rcsb.org/structure/7TA3), plus the hash-checked 3WD5 validation coefficients and derived map. The map is regenerated voxel-for-voxel from those coefficients using the same Gemmi implementation. The previously documented 3.10 Å map uses observed amplitudes and model-derived phases, so its values are model-biased and not independent evidence. See the earlier density report for provenance and sampling details.

Rotate each sulfur around its own CA–CB bond in 2° steps (32,400 pairs), preserving each original CB–SG length and CA–CB–SG angle and leaving the rest of the structure fixed. Screen SG–SG 1.9–2.2 Å, each CB–SG–SG angle 95–115°, minimum 2.5 Å to other occupied heavy atoms of the deposited A/H/L protein model (including the other cysteine's backbone), and absolute CB–SG–SG–CB torsion 60–120°. The new, intentionally broad, sign-neutral torsion window is an exploratory filter, not a complete rotamer library or acceptance criterion. Disulfide stereochemistry is conventionally described by multiple torsions and bond geometry; see the [disulfide geometry analysis](https://www.jthjournal.org/article/S1538-7836%2822%2911523-0/fulltext). The new filter and tests were chosen after the earlier scan and density results were known; they are not preregistered.

Choose the passing point with minimum sum of squared sulfur displacements from deposited positions, without using density or known 7TA3 answers to select it. Compute density only afterward. For every point, independently inspect nearest occupied protein heavy atoms in the reconstructed A/B/C/H/L/I/M/J/N model, applying the existing coordinate permutations to each candidate. This is a finite reconstructed model, not the full crystal; water and other omitted components are not checked. These nearest distances do not constitute an all-atom clashscore, stereochemical validation, or full crystal contact analysis. The sulfur pair itself is evaluated separately. The fixed backbone and coarse 2° grid exclude other conformations and possible coupled relaxation; no energy minimization or refinement was performed.

### Results and real-structure control

Ten 3WD5 grid points pass these screens. The selected point is the **same** −90°/−10° point from the prior scan, not a newly identified conformation. Its two sulfur displacements are 2.354 and 0.285 Å; SG–SG is 1.904 Å, angles are 102.16° and 95.39°, and signed dihedral is +69.05°. Its nearest other occupied heavy-atom distances in each of the three reconstructed copies are 2.768 and 2.867 Å. This comparison includes reconstructed Fab atoms, but excludes unmodeled crystal neighbors and waters. Among all ten candidates the smallest reported nearest distance is 2.750 Å. These crude thresholds are permissive: passing does not mean the local stereochemistry or environment is correct.

For the selected candidate, the Cys69 and Cys101 SG center densities are 0.438σ and 1.403σ versus deposited values 2.380σ and 1.437σ. Cys69 sphere means are 0.714σ versus 2.086σ, based on three versus four voxels respectively. These are descriptive samples from the same model-biased map, not independent sulfur observations, a formal fit score or proof against the candidate. No density-based search or cross-validation was done. The poor Cys69 support and large displacement remain serious limitations.

As a bounded real-structure exercise, take the two observed 7TA3 TNF chains B and D, artificially rotate their known sulfurs +20°/−20°, and apply the same search and minimum-displacement rule with the rest of 7TA3 fixed. Compare the selected sulfurs afterward to the withheld deposited positions. B and D yield 39 and 36 passing grid points; selected sulfur RMSDs are **0.204 Å and 0.173 Å**, respectively. These are real deposited structures with synthetic distortions, not experimental validation of a repair. The two chains are related observations, the distortions are small and chosen here, and the native coordinates and screening rules were available during method development. This control does not measure general recovery, identify the correct 3WD5 rotamer, or validate its density fit. The test suite also checks a blocking-neighbor negative control and rotation invariants.

The selected 3WD5 sulfur positions were temporarily propagated by the established symmetry permutations to A/B/C, rounded to PDB precision; all other selected ATOM records remained unchanged. The normal chain inspection returned `requires_further_validation` for each chain, and the existing close-cysteine guard passed without modification. Unmodified Meeko 0.8.0 returned exit 0 and produced a temporary rigid PDBQT, which was deleted with the temporary directory. The record captures the temporary input hash, program hash, stdout and stderr. This is a **software compatibility result**, not evidence that the candidate chemistry, protonation, missing residues, terminal chemistry, receptor preparation, or ligand binding is correct. No docking was run; no candidate coordinates or prepared receptor are published. Prior negative controls on the original coordinates remain unchanged.

### Reproduction

No files are fetched or installed by this command. Supply the original validation coefficients and the previously generated map whose SHA-256 values match the record, and a compatible pre-existing Meeko installation:

```sh
/opt/anaconda3/envs/tnf-docking/bin/python structural-bioinformatics/scripts/explore_3wd5_rotamer_repair.py \
  --map PATH_TO_3WD5_MAP --coefficients PATH_TO_3WD5_COEFFICIENTS.cif.gz \
  --meeko /opt/anaconda3/envs/tnf-docking/bin/mk_prepare_receptor.py
```

The script validates source, reconstruction, template, coefficients and map hashes and records package versions and its own hash. External map files are not committed. Repeating on another system may change floating-point details or Meeko output; verify the program and dependencies. A defensible next step would require a documented crystallographic refinement/alternative-model comparison, the appropriate experimental reflections and unbiased or carefully interpreted maps, explicit full-environment and stereochemical review, and independent controls before considering receptor use.
