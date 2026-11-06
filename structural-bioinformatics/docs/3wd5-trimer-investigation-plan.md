# 3WD5 reconstructed TNF receptor: preregistered negative controls

Declared before the trimer experiments on 2026-11-06. Input is the existing
reconstructed `assets/3wd5-trimer-3fab.pdb`; A/B/C alone are the intended
receptor, while H/L, I/M and J/N are Fabs. The deposited input and the
reconstruction remain unchanged. No download or dependency installation.

Run the existing production preflight with A,B,C, and independently record
each chain's completeness, occupancy, alternatives and Cys69–Cys101 geometry.
Compare generated atom identifiers and symmetry mapping to deposited A, with
0.002 Å coordinate tolerance for PDB rounding. Count all deposited alternate
records, including records omitted by reconstruction. Evaluate missing atoms
against the existing standard-residue heavy-atom inventory, and explicitly
separate absent residues and terminal OXT from missing internal heavy atoms.

For diagnostic geometry use the already documented 1.9–2.2 Å SG–SG,
95–115° angles, and 2.5 Å other-heavy-atom distance filters; these are broad
screening cutoffs, not validation. The existing guard's 1.9 Å SG–CB and Meeko
0.8.0's 2.172 Å C–S bond-inference thresholds are recorded separately. Report
the signed disulfide dihedral without treating any single range as proof.
Run unmodified Meeko on an exact-coordinate A/B/C-only diagnostic selection;
retain stdout, stderr, exit status, and any files. This bypasses the workflow
only to expose the underlying diagnostic and is not a prepared receptor.

No candidate is accepted from geometry or Meeko success alone. A defensible
repair needs justified alternate choices, missing-atom treatment, local crystal
density and environment, all-chain chemistry, independent stereochemistry and
uncertainty. If unavailable, retain negative controls and report the gap;
do not alter occupancies, weaken the guard, dock, or claim biological validity.
