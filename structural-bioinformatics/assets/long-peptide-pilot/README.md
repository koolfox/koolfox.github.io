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
