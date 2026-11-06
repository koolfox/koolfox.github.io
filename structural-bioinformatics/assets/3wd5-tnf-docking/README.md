# 3WD5 TNF monomer: exploratory graph correction and docking

This is a separate, limited follow-up to `docs/3wd5-receptor-diagnostic.md`. The latter's blocked A/H/L attempt remains accurate for that attempt. Here **only chain A** (TNF monomer) was prepared and docked; no Fab or multichain preparation is claimed. The coordinates still contain the unusually close A69 SG–A101 CB contact, so this is a computational demonstration, not a geometrically repaired or validated receptor.

The existing `assets/3wd5.pdb` is the unchanged [RCSB deposition](https://files.rcsb.org/download/3WD5.pdb), SHA-256 `fae6eee1b06b8cba0a466280dbc32563efaa54ec639afd921cb610d17debd216`; its original retrieval time is not established. The deposited SSBOND A69–A101 and SG–SG distance (2.049 Å) support the disulfide connection. The 1.750 Å A69 SG–A101 CB distance also falls inside Meeko's inter-residue distance cutoff, producing an additional graph edge and template failure. See the separate diagnostic for the 3.10 Å source and full analysis.

The source-specific script checks the source hash, Meeko version and bond identities, then removes exactly the inferred SG–CB graph edge and retains the SG–SG edge; it does not move atoms or claim to fix the strained geometry. It does not use `--forgive_extra_bonds` or delete residues. It excludes deposited waters and selects chain A. All 1,187 selected protein heavy-atom coordinates remain in the receptor; Meeko exchanges the names O and OXT at residue A157 while retaining both positions. Hydrogens and parameters are model-derived. The script is not a general repair method, and its change to Meeko internals is version-specific.

The actual run used Meeko 0.8.0, RDKit 2026.09.1, Biopython 1.86, Vina 1.2.7; AC, one ETKDGv3 conformer and charge state, rigid receptor, seed 42, CPU 1, exhaustiveness 2, three poses. The arbitrary 20 × 20 × 20 Å box is centered at (0, 12, 5) Å, near the problematic cysteines; it is not a validated peptide binding site. Scores are -3.505, -3.371 and -3.341 kcal/mol and minimum receptor–pose heavy-atom distances are 3.157, 2.976 and 2.950 Å. The report, receptor, input selection, ligand, poses and logs are retained here. Proximity is a geometric screen, not evidence of binding; scores are not affinity, efficacy, or activity. No negative control, peptide benchmark, ensemble, geometry repair, or independent validation was performed.

To repeat in the existing docking environment with its executable directory on PATH, from the repository root:

```sh
PATH="/opt/anaconda3/envs/tnf-docking/bin:$PATH" \
  /opt/anaconda3/envs/tnf-docking/bin/python \
  structural-bioinformatics/scripts/run_3wd5_tnf_docking.py \
  structural-bioinformatics/results/3wd5-tnf-repeat-new
```

The output directory must not exist. A separate repeat on 2026-11-06 UTC produced identical receptor SHA-256 `c027f12009cabc83c8e623c5feea4725d20168a1de1381aaa0aeabf343541814` and pose SHA-256 `c3002498b9952d616b783b1eb30f790d2eeae4caaa0221cbb2068e4336681189`. The final repeat script SHA-256 was `e1d9dfc3cf1d281fd5b29957ed95ea914082e984dd97bc80d68542880faece69`. The original stored report records the general workflow hashes; this README identifies the separate graph-correction script.
