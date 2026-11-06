# 7TA3 fragment generated from sequence: failure to recover reference

This bounded local pilot starts from the sequence `GWRIGEAGTDPNL`, not the deposited peptide conformation. It is residues A:3–15 of the checked-in 7TA3 structure (source SHA-256 `3c90d11838c88ebb5501319b367c6ac89e16c67c9a84aa22d17d5a4708052de4`), an internal fragment of a 31-residue disulfide-containing, C-terminally amidated peptide. The isolated linear fragment has free charged termini and different chemistry; no experimental binding of this isolated 13mer is established. The known experimental site defined the box. This is not blind docking or an independent binding benchmark.

A first attempt using deposited chain B was rejected before output creation because ARG31 lacks side-chain atoms. The checked-in `receptor-repaired.pdb` contains five modeled side chains and incomplete loops. It was rejected unchanged due to alternate-location labels. For this specific file all atom labels were blank or A: 11 A labels were explicitly converted to blank without changing coordinates to create `receptor-selected.pdb`. The resulting prepared receptor hash is identical to the prior rigid fragment control. Single-chain preparation, missing loops, repair, protonation and omitted assembly remain limitations. Do not generalize this alternate-location operation to other structures.

RDKit ETKDGv3 plus MMFF produced one conformer from sequence, then Meeko and Vina 1.2.7 ran seed 42, CPU 1, exhaustiveness 2, max 1000 evaluations per search. The peptide had 45 declared torsions. The actual workflow report, conformer, ligand, receptor, poses and logs are retained in `run-20261106/`; its temporary paths document the actual run and are not portable. The output status `requires_further_validation` means only that the workflow's crude clash screen passed: **the independent comparison below shows that this trial did not recover the deposited fragment**.

| Pose | Fixed-frame RMSD (Å), 97 matched heavy atoms | Minimum receptor distance (Å) | Pairs <2 Å | Heavy atoms outside box |
|---|---:|---:|---:|---:|
| 1 | 11.747 | 2.899 | 0 | 0 |
| 2 | 8.660 | 3.583 | 0 | 1 |
| 3 | 13.971 | 3.176 | 0 | 1 |

`scripts/long_peptide_sequence_audit.py` independently matches chain A deposited residue/atom names to generated PDBQT residues with the +2 residue offset. It requires all 97 identities and accepts only the additional free-terminal OXT; it computes RMSD without fitting in the receptor frame, and recomputes all receptor–ligand heavy-atom pair distances using the Python standard library. Symmetry-equivalent atom permutations are not corrected. The previous rigid bound-template control and its translation controls remain separately retained in `../7ta3-13mer-control/`; its rank-1 RMSD of 0.513 Å used the answer as a rigid input and cannot validate this sequence-generated run. The failure does not prove no conformation can bind or identify why sampling failed. A clash-free pose, Vina score, and a single very limited search do not establish affinity or biological activity. Larger and peptide-specific sampling, with multiple seeds and appropriate independent benchmarks, remains future work on Kaggle or another approved host.

To reproduce with installed dependencies, from the checkout root, choose a new unused output directory:

```sh
/opt/anaconda3/envs/tnf-docking/bin/python structural-bioinformatics/scripts/run_general_peptide_docking.py \
  --pdb structural-bioinformatics/assets/long-peptide-pilot/7ta3-sequence-control/receptor-selected.pdb \
  --chain B --sequence GWRIGEAGTDPNL --center -0.2375 -55.017 -21.6785 \
  --size 28.905 20.938 22.971 --receptor-preparer /opt/anaconda3/envs/tnf-docking/bin/mk_prepare_receptor.py \
  --vina /opt/anaconda3/envs/tnf-docking/bin/vina --max-evals 1000 --output-dir /tmp/7ta3-sequence-new
python3 structural-bioinformatics/scripts/long_peptide_sequence_audit.py --run /tmp/7ta3-sequence-new
```

This audit fails closed on missing or mismatched atom identities. A successful audit is a measurement, not an acceptance decision; exact output is environment-dependent. Retained hashes and UTC execution time are in the reports, while the original PDB download time is unknown.
