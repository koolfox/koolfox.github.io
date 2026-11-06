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

The bounded runs use `--max-evals 1000` and `--max-evals 10000`, respectively;
this limits evaluations per Vina Monte Carlo run and severely limits sampling.
The receptor and peptide are fixed to the workflow's single-chain and
single-conformer assumptions. These failed technical runs do not establish
binding, affinity or biological activity, and longer search or other methods
would need separate validation.
