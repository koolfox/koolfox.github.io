# Thirteen-residue docking pilot: unsuccessful

The input peptide `MQIFVKTLTGKTI` is residues 1–13 of the included 1UBQ
chain A receptor; docking it to that same protein is a technical exercise, not
a known binding experiment. The input receptor is
`../course/gromacs/1ubq-protein.pdb`; the reports record its SHA-256,
software versions, UTC times, box (center 30,28,15; size 20,20,20 Å), and
workflow/model hashes. Vina 1.2.7 used seed 42, CPU 1, exhaustiveness 2.

* `initial-failure.json`: original pilot failed conformer embedding.
* `unbounded-stopped.json`: random-coordinate retry produced the conformer
  and ligand in `MQIFVKTLTGKTI/`; Vina was deliberately terminated after
  more than five minutes, before a pose. Its failure is interruption, not a
  biological result. The exact model script is in
  `../../tests/fixtures/long-peptide-pilot/build_peptide_models.py.txt`.
* `bounded-1000/` and `bounded-10000/`: Vina generated one pose each, but the
  workflow rejected each for a severe clash. The minimum receptor–ligand heavy
  atom distances are approximately 0.589 and 0.508 Å, respectively; both are
  below the 2 Å screening threshold. Reports and raw poses are retained.
* `bounded-100000/`: the full workflow returned one saved pose with a minimum
  distance of 0.861 Å and 45 heavy-atom pairs closer than 2 Å. An independent
  Vina run with the same prepared files and settings produced the identical
  pose file SHA-256. This is reproducibility on this environment, not validation.
* `bounded-1000000/`: the workflow saved two poses, with minima 0.861 and
  1.250 Å and respectively 45 and 32 heavy-atom pairs closer than 2 Å. Both
  failed the screen. The first pose is the same as the 100000-evaluation pose;
  larger limits do not guarantee a different or acceptable solution.

The revised workflow records scores, minimum distances, pair counts, and
artifact hashes even when it fails the clash screen; any failing pose still
fails the candidate and run. The exact revised workflow is retained in
`../../tests/fixtures/long-peptide-pilot/run_general_peptide_docking.py.txt`.
The new reports contain the complete inputs, settings, versions, UTC times,
and hashes; outputs and logs remain alongside each report. To reproduce a run:

```sh
/opt/anaconda3/envs/tnf-docking/bin/python structural-bioinformatics/scripts/run_general_peptide_docking.py \
  --pdb structural-bioinformatics/assets/course/gromacs/1ubq-protein.pdb \
  --chain A --sequence MQIFVKTLTGKTI --center 30 28 15 --size 20 20 20 \
  --receptor-preparer /opt/anaconda3/envs/tnf-docking/bin/mk_prepare_receptor.py \
  --vina /opt/anaconda3/envs/tnf-docking/bin/vina --max-evals 100000 \
  --output-dir /tmp/long-peptide-new-run
```

Run from the repository root with an unused output directory and the already
installed tested tools. Paths are local to this machine. Counts represent atom
pairs, not distinct atoms, and the 2 Å rule is a crude failure screen rather
than a complete stereochemical or binding assessment.

The bounded runs use `--max-evals 1000` and `--max-evals 10000`, respectively;
this limits evaluations per Vina Monte Carlo run and severely limits sampling.
The receptor and peptide are fixed to the workflow's single-chain and
single-conformer assumptions. These failed technical runs do not establish
binding, affinity or biological activity, and longer search or other methods
would need separate validation.

## Independent clash and receptor audit (2026-11-06)

An independent standard-library `math.dist` calculation on the saved PDBQT
coordinates reproduces all four runs' minima and pair counts: 0.588778 Å / 44,
0.508052 Å / 80, 0.860513 Å / 45, and 0.860513 Å / 45 plus 1.249638 Å / 32,
respectively. The last two minima are respectively peptide VAL 5 CG1 to
receptor HIS 68 ND1, and peptide THR 12 CA to receptor ILE 61 CD1. These are
distinct heavy atoms, not hydrogens or an atom compared to itself.

The receptor contains 744 PDBQT atoms: 142 `HD` hydrogens and 602 heavy atoms
(types `C`, `A`, `N`, `NA`, `OA`, `SA`). Each saved peptide pose contains 26
`HD` and 103 heavy atoms (`C`, `A`, `N`, `OA`, `SA`). The workflow excludes
`H` and `HD`; for these files the classification and fixed-column coordinates
are correct. This does not establish correctness for every possible PDBQT atom
type or malformed input. All 602 receptor heavy-atom coordinates match the
selected-chain PDB as a multiset. The terminal GLY 76 `O` and `OXT` labels
are swapped between preparation output and selected PDB; their coordinates
are both present, and neither is involved in the closest pairs above.

For each of the four runs, the stored receptor's SHA-256 equals the hash in
the report. The Vina log identifies its rigid receptor path; on 2026-11-06 the
file still at each logged path also matched that hash. The workflow passes that
path to Vina and hashes it before launch. This is corroborating provenance,
not a cryptographic record of the bytes read by Vina at execution time.

The receptor retains its own residues 1–13 even though the peptide sequence
is copied from that fragment. In the million-evaluation poses, respectively
10 of 45 and 9 of 32 close pairs involve receptor residues 1–13; the remainder
involve residues 14–76. This setup and the limited search are plausible
contributors, but the audit does not establish why Vina produced these poses.
No software defect was demonstrated in the measured distances or receptor
selection for these files; no new docking search was performed for this audit.

## Follow-up diagnostics (2026-11-06)

The two million-evaluation poses have respectively 7 and 3 ligand heavy
atoms outside the specified 20 Å box (strictly beyond its faces, using the
rounded PDBQT coordinates). This is a diagnostic, not proof of the cause of
clashes and not a binding criterion. The current workflow now records this
count for every pose; it still rejects any pose below the 2 Å distance screen.
Earlier reports and all failed poses remain unchanged.

Vina 1.2.7 `--local_only` was run on each saved pose with the same receptor,
box, seed 42 and CPU 1. The initial minima/counts were 0.860513 Å/45 and
1.249638 Å/32; after refinement they were 0.860513 Å/45 and 1.239368 Å/32.
Neither passed. `local-refinement/` retains extracted inputs, outputs and logs.

A separate sensitivity diagnostic removed all ligand torsion branches, leaving
all 129 original PDBQT atoms in a single rigid ROOT and `TORSDOF 0`. This
freezes an arbitrary generated conformer; it is not flexible peptide docking.
With seed 42, CPU 1, exhaustiveness 2 and 100000 evaluations per run, one
pose was returned per box: the 20 Å box gave 0.479010 Å/86 close pairs; a
30 Å box gave 0.670918 Å/15. Both fail. Thus neither this rigid
approximation nor enlargement in this limited experiment fixes the issue.
Changing box and flexibility changes sampling, and this one seed cannot
isolate a cause. A clash-free pose alone would not validate the model.

`diagnostic-manifest.json` records hashes for the inputs, outputs and logs.
To repeat the diagnostics with the installed Vina 1.2.7 from the repository
root, use a **new** empty directory, replace `OUT` below, and compare distances
rather than assuming identical bytes across platforms:

```sh
P=structural-bioinformatics/assets/long-peptide-pilot
OUT=/tmp/long-peptide-repeat
mkdir "$OUT"
python3 - "$P" "$OUT" <<'PY'
import re, sys
from pathlib import Path
p, out = map(Path, sys.argv[1:])
text = (p / 'bounded-1000000/MQIFVKTLTGKTI/poses.pdbqt').read_text()
for i, block in enumerate(re.findall(r'^MODEL\s+\d+\s*$(.*?)^ENDMDL\s*$', text, re.M | re.S), 1):
    (out / f'input-{i}.pdbqt').write_text(block.strip() + '\n')
text = (p / 'bounded-1000000/MQIFVKTLTGKTI/ligand.pdbqt').read_text()
atoms = [line for line in text.splitlines() if line.startswith(('ATOM  ', 'HETATM'))]
(out / 'rigid.pdbqt').write_text('ROOT\n' + '\n'.join(atoms) + '\nENDROOT\nTORSDOF 0\n')
PY
VINA=/opt/anaconda3/envs/tnf-docking/bin/vina
REC="$P/bounded-1000000/receptor.pdbqt"
for i in 1 2; do
  "$VINA" --receptor "$REC" --ligand "$OUT/input-$i.pdbqt" --out "$OUT/local-$i.pdbqt" \
    --center_x 30 --center_y 28 --center_z 15 --size_x 20 --size_y 20 --size_z 20 \
    --seed 42 --cpu 1 --local_only > "$OUT/local-$i.log" 2>&1
done
for side in 20 30; do
  "$VINA" --receptor "$REC" --ligand "$OUT/rigid.pdbqt" --out "$OUT/rigid-$side.pdbqt" \
    --center_x 30 --center_y 28 --center_z 15 --size_x "$side" --size_y "$side" --size_z "$side" \
    --seed 42 --cpu 1 --exhaustiveness 2 --num_modes 3 --max_evals 100000 > "$OUT/rigid-$side.log" 2>&1
done
```

The local-only output is a single PDBQT structure rather than a MODEL-wrapped
multi-pose file. For the distance audit, compare heavy atoms using their fixed
PDBQT coordinate columns and exclude `H` and `HD`, as in the previous audit.
The [Vina documentation](https://autodock-vina.readthedocs.io/en/stable/vina.html)
describes local optimization; these experiments do not establish affinity or a
biological interaction. Further work requires suitable peptide-specific
sampling and an independent, experimentally justified benchmark.

The updated workflow itself was also run with the original 20 Å box and
1000 evaluations per Monte Carlo run. `workflow-box-check/` retains the
complete failed run: 0.588778 Å minimum, 44 close pairs and 6 heavy atoms
outside the box. Its command matches the earlier reproduction command above
with `--max-evals 1000` and a fresh output directory. The report records the
exact workflow hash; the failure remains a failure.

## Rigid translation score controls (2026-11-06)

To check whether the independently measured overlaps are reflected in Vina's
scoring, we scored the first saved million-evaluation pose without optimization,
then scored exact rigid translations of the same PDBQT by +10, +40 and -40 Å
along x. All 129 atom coordinates were translated; the independent distance
calculation uses 103 ligand and 602 receptor heavy atoms. `--autobox` makes a
ligand-centered scoring box for each input; these are score-only controls, not
new docking searches or equivalent box-sampling experiments.

| x translation (Å) | Minimum heavy-atom distance (Å) | Pairs <2 Å | Vina intermolecular score (kcal/mol) |
|---:|---:|---:|---:|
| 0 | 0.860513 | 45 | 434.717 |
| +10 | 0.332844 | 183 | 1204.094 |
| +40 | 16.625914 | 0 | 0.000 |
| -40 | 21.919987 | 0 | 0.000 |

Vina 1.2.7 exited 0 for all four cases, using `--score_only --autobox --cpu 1
--seed 42`. The higher overlap control also scores worse, and both separated
controls report zero intermolecular score to three decimals. This verifies
behavior for these particular inputs; it does not identify why the bounded
search returned clashes, prove a software defect, validate the scoring function
for peptides, or establish biological interaction. These scores are model
outputs, not measured binding energies. The unchanged pose's 434.717 matches
the previously recorded local-only log's final intermolecular score to its
printed precision, but this is not an independent validation of optimization.

`translation-control/final/` preserves the actual translated inputs, full logs,
commands, SHA-256 hashes, environment and UTC time. The runnable script's SHA-256
is `8c6864936f2f69c2790a36735e314114d1c22b3c23eba3a37017eae76c3c8b14`.
Reproduce from the repository root with the already installed Vina and Python;
the output directory must not exist:

```sh
/opt/anaconda3/envs/tnf-docking/bin/python structural-bioinformatics/scripts/long_peptide_translation_control.py \
  --vina /opt/anaconda3/envs/tnf-docking/bin/vina --output-dir /tmp/long-peptide-translation-new
```

The original receptor includes the native 1–13 fragment and this artificial
self-derived peptide is not a benchmark; translations do not model unbinding.

## Torsion complexity diagnostic (2026-11-06)

The actual `bounded-1000000/MQIFVKTLTGKTI/ligand.pdbqt` declares
`TORSDOF 57`. A direct offline audit counts 57 `BRANCH` and 57 matching,
properly nested `ENDBRANCH` records. Its SHA-256 is
`95f77fa164dc841c0b5455cc524a1600e5f3c62fade6488e2a99ece67493aa31`.
These are distinct reported quantities: TORSDOF is a declared value; branch
records describe the torsion tree. Their equality here does not establish that
all possible PDBQT chemistry must have equal values, nor does this count
validate stereochemistry, conformer sampling, or biological activity.

The workflow now records both counts, their comparison and the ligand hash
before launching Vina, so the diagnostic survives a later docking failure.
Malformed, missing, duplicate or negative TORSDOF records and malformed or
incorrectly nested branch records produce explicit errors. A count mismatch is
reported for review, not used as an automatic rejection: format- or
chemistry-specific conventions can affect its interpretation. The diagnostic is
not a full PDBQT or chemical validator and has no optional numerical size gate.

A fresh real run with the documented 1000-evaluation command and Vina 1.2.7
recorded the same ligand hash and 57/57 counts in
`torsion-workflow-report.json`; its original clash screen still failed at
0.588778 Å and 44 heavy-atom pairs below 2 Å. This run used the revised workflow
and inspector hashes recorded in that report; its unmodified report is retained,
while its other artifacts remain in `/private/tmp/long-peptide-torsion-report-1106`.
The earlier reports are historical and were not rewritten. The new test checks
the retained report against the earlier real ligand by hash and independently
recounts its records; synthetic cases exercise invalid and inconsistent inputs.

Ravindranath et al., [AutoDockFR (2015), cross-docking experiments](https://pmc.ncbi.nlm.nih.gov/articles/PMC4667975/),
describe a hard-coded 32-rotatable-bond limit for **AutoDock**, and state that
**AutoDock Vina has no implementation limit on the number of rotatable bonds it
can search**. The number 32 is therefore not a Vina acceptance threshold here.
Greater search dimensionality is a complexity consideration, not a demonstrated
cause of the observed clashes; this diagnostic cannot determine that cause or
show that a search has sampled the pose space adequately.

## کنترل مستقل جای‌گذاری صلب داخل جعبه

برای تفکیک محدودیت جست‌وجو از هندسه، همان گیرنده و `rigid-diagnostic/ligand.pdbqt` را بدون تغییر شکل پپتید، در مرکز جعبهٔ `(30, 28, 15)` Å با ابعاد `20 × 20 × 20` Å آزمودیم. ۲۴ چرخش صلبِ ماتریس جایگشتی با دترمینان مثبت و جابه‌جایی‌های شبکه‌ای از ۹− تا ۹+ با گام ۳ Å در هر محور بررسی شد. مبنای جابه‌جایی، مرکز جعبهٔ محدودکنندهٔ پپتید پس از هر چرخش است. `scripts/long_peptide_grid_control.py` تمام ۸۲۳۲ حالت، ماتریس‌ها، هش ورودی‌ها، شمار اتم‌های خارج جعبه، کوتاه‌ترین فاصله و شمار زوج‌های زیر ۲ Å را در `grid-control/` ثبت می‌کند؛ از این پارامترها می‌توان هر جای‌گذاری را بازسازی کرد. فایل خروجی جایگاه ذخیره‌شدهٔ جدید یا نمرهٔ داکینگ نیست.

از ۸۲۳۲ حالت، ۷۲ حالت همهٔ اتم‌های سنگین پپتید را داخل جعبه داشتند. هیچ‌یک در این غربال از برخوردهای زیر ۲ Å خالی نبود؛ بالاترین حداقل فاصله در میان این ۷۲ حالت حدود ۰٫۶۷۸ Å بود و همان حالت ۱۵۸ زوج زیر ۲ Å داشت. پیاده‌سازی مستقل با SciPy `cKDTree` و نسخهٔ NumPy بر سر شمار زوج‌ها و فاصله‌ها برای همهٔ ۸۲۳۲ حالت توافق داشتند (تلورانس فاصله `1e-10` Å). این یک غربال محدود هندسی روی یک کانفورمر و چرخش‌ها و جابه‌جایی‌های گسسته است؛ ناممکن‌بودن هندسه، علت شکست Vina، اتصال یا نبود اتصال را ثابت نمی‌کند. گیرنده و پپتید از یک ساختار منشأ گرفته‌اند و این مثال کنترل فنی است، نه آزمایش اتصال مستقل.

```bash
python structural-bioinformatics/scripts/long_peptide_grid_control.py \
  --receptor structural-bioinformatics/assets/long-peptide-pilot/bounded-1000000/receptor.pdbqt \
  --ligand structural-bioinformatics/assets/long-peptide-pilot/rigid-diagnostic/ligand.pdbqt \
  --output-dir PATH_TO_NEW_OUTPUT_DIRECTORY
```

## Sequence-generated 7TA3 fragment check

A separate [sequence-generated 7TA3 check](7ta3-sequence-control/README.md) now compares every saved pose with the deposited fragment by matched heavy-atom RMSD in the receptor frame. The bounded local run passed the 2 Å clash screen but failed to recover the reference (RMSDs 8.660–13.971 Å); the earlier bound-template rigid control does not establish success from sequence. Raw outputs and the independent audit are retained.
