# 7TA3 13-residue known-site technical control

This is a bound-template rigid redocking benchmark for the computational workflow, **not evidence that the isolated 13mer binds TNF**. The source is the checked-in [7TA3 PDB](https://files.rcsb.org/download/7TA3.pdb), X-ray structure at 2.50 Å, with peptide A and TNF B. The intact 31-residue peptide in that experiment has a Cys2–Cys31 disulfide and an amidated end; residues A:3–15 are an internal portion of it. The deposited source SHA-256 is `3c90d11838c88ebb5501319b367c6ac89e16c67c9a84aa22d17d5a4708052de4`. The existing provenance record `data/metadata/tnf-peptide-preparation.json` records 2026-11-02T19:44:35Z as its preparation/record time; it does not establish the original download time. Source, engine, script and prepared input hashes and execution UTC are in `run-20261106/report.json`.

The script selects occupied heavy atoms with blank or A alternate location, blank insertion code and author chain/residue A:3–15. It verifies the sequence `GWRIGEAGTDPNL`, unique atom identifiers and exact heavy-atom identity and coordinates (0.002 Å tolerance) against the existing rigid PDBQT prepared for the full peptide. `fragment.pdb` retains deposited serials; `atom-map.json` maps each of its 97 heavy atoms by author chain, residue and atom name to the PDBQT serial. Hydrogens and partial charges are inherited from the full-peptide preparation. Cutting covalent bonds changes the chemistry: the artificial cut ends were **not** re-protonated, capped, or reparameterized. The existing receptor PDBQT comes from repaired TNF B: five side chains were modeled and loops remain incomplete; protonation is not independently validated. Thus score and distances are properties of this particular prepared model, not experimental energies.

The peptide's bound conformation is frozen (`TORSDOF 0`) and the box is centered on its deposited bounding box, extending 4 Å beyond its bounding box on each face. This uses the answer to define both conformation and site. Vina 1.2.7 ran with one CPU, seed 42, exhaustiveness 2, maximum 100,000 evaluations per Monte Carlo run and five requested modes; five scored modes appear in the log, while four pose models were written to the output. The saved evidence does not establish the reason for this difference. This is a constrained known-site search, not blind docking or flexible peptide sampling. RMSD is calculated over all 97 mapped heavy-atom serials in the unchanged receptor coordinate frame, without fitting or symmetry correction. Distances are between heavy atoms of the prepared receptor and fragment; counts are atom pairs, not atoms. A 2 Å cutoff is only a crude overlap screen.

| Case | Fixed-frame RMSD (Å) | Minimum distance (Å) | Pairs <2 Å | Pairs <4 Å |
|---|---:|---:|---:|---:|
| Deposited fragment | 0 | 2.690 | 0 | 61 |
| Redock rank 1 | 0.513 | 2.699 | 0 | 62 |
| Redock rank 2 | 12.802 | 2.978 | 0 | 40 |
| Redock rank 3 | 13.796 | 3.115 | 0 | 39 |
| Redock rank 4 | 11.233 | 3.106 | 0 | 25 |
| +10 Å x translation | 10 | 6.023 | 0 | 0 |
| +40 Å x translation | 40 | 27.586 | 0 | 0 |
| -40 Å x translation | 40 | 0.582 | 13 | 60 |

The independent, score-only translations are geometric negatives, not docking searches or physical unbinding trajectories. The -40 Å translation overlaps another part of this receptor and is the clash negative, not a separated negative. Vina's score-only intermolecular values for 0, +10, +40, -40 Å were respectively -8.592, -0.035, 0.000 and +66.946 kcal/mol; rank 1's reported docking score was -8.992 kcal/mol. These approximate model scores are not measured affinities. Results show this prepared bound-template control can recover a similar pose in one bounded run; they do not validate peptide affinity, free fragment conformation, broader accuracy or a biological effect. No experimentally independent peptide binding data for the isolated 13mer is asserted.

From the checkout root, with the already installed tools, use a **new** output directory:

```sh
/opt/anaconda3/envs/tnf-docking/bin/python structural-bioinformatics/scripts/long_peptide_7ta3_control.py \
  --vina /opt/anaconda3/envs/tnf-docking/bin/vina \
  --output-dir structural-bioinformatics/assets/long-peptide-pilot/7ta3-13mer-control/NEW-RUN
python3 structural-bioinformatics/tests/test_7ta3_13mer_control.py
```

The report retains actual command arguments, raw PDBQT poses, score logs, and hashes. The offline tests re-extract and compare atom mappings, test translation and mismatched atom IDs, and independently recompute saved geometry and fixed-frame RMSDs. Reproducibility of exact Vina output across systems is not assumed. The test reads the retained run, not NEW-RUN.

**Provenance correction:** the original `run-20261106/report.json` incorrectly describes the earlier preparation timestamp as a retrieval time. It is retained unmodified as a historical run; the original source retrieval time is not established. The script now reports the distinction correctly. The report’s script hash identifies the version used in that original run, not later corrected revisions.

A second execution with the corrected, formatted script is retained in `run-20261106-corrected/`. Under the same input files, Vina executable, seed and settings, its saved pose file has the same SHA-256 as the original and the four geometry/RMSD results agree. This is repeatability on one environment and one seed, not independent validation or evidence of binding.
