# Deposited multichain receptor pipeline check

[1FCC](https://www.rcsb.org/structure/1FCC), X-ray diffraction (3.2 Å), contains author chains A and B (human IgG Fc fragments) and C and D (streptococcal protein G C2 fragments). The deposited PDB `REMARK 350` identifies all four chains, with an identity transform, as the author-assigned biological assembly 1. This is the deposited four-chain complex, not full IgG.

Source: https://files.rcsb.org/download/1FCC.pdb; retrieved 2026-11-05T11:53:23.929715+00:00; SHA-256 `76ea4cf44d886a499bd5e0ee2db17dc6ed1f24e82080df25aaefbed3eba81516`. `source-1fcc.pdb` is that file. Its 4,180 deposited atoms and coordinates are unchanged in `interface-run/selected-chain.pdb`: A and B have 1,656 atoms each; C and D 434 each. No water removal, chain duplication, translation or coordinate reconstruction was applied. Meeko adds receptor parameters and hydrogens; the PDBQT is a computationally prepared model.

The recorded run was completed on 2026-11-06 UTC using Meeko 0.8.0 and Vina 1.2.7. Its original execution used machine-local absolute paths; those paths are environment-specific and are not needed to reproduce it. The original output files and report remain unchanged as historical evidence.

To repeat from the repository root, create the environment described in `structural-bioinformatics/docking/environment.yml`, activate it so that `python`, `mk_prepare_receptor.py`, and `vina` are on `PATH`, and confirm the Vina version is 1.2.7. Run with a new output directory:

```sh
conda env create -f structural-bioinformatics/docking/environment.yml
conda activate tnf-docking
python structural-bioinformatics/scripts/run_general_peptide_docking.py \
  --pdb structural-bioinformatics/assets/multichain-1fcc-demo/source-1fcc.pdb \
  --chain A,B,C,D --sequence AC --center 19.2 -1.0 -4.5 --size 20 20 20 \
  --receptor-preparer "$(command -v mk_prepare_receptor.py)" \
  --vina "$(command -v vina)" \
  --output-dir structural-bioinformatics/results/1fcc-interface-repeat
```

Versions and operating systems may produce different results; the historical run's report records the actual dependency versions and code hashes. The output directory must not already exist.

The center approximates the mean of the midpoint coordinates for the 208 deposited A–C heavy-atom pairs under 4.5 Å. It is a geometric test box, not a validated peptide binding site. `interface-run/report.json` and the associated receptor, peptide conformer, poses, and logs preserve the result: status `requires_further_validation`, three poses, lowest Vina score -4.384 kcal/mol, minimum heavy-atom receptor distances 2.92–3.01 Å. The peptide conformer and poses are computational; the score is not a binding affinity or evidence of binding. One peptide, one conformer and charge state, rigid receptor, low exhaustiveness, no controls, no independent validation, and 3.2 Å source resolution limit interpretation.

The earlier `off-target-box-run` used center (35, 50, 40) Å, away from the protein. It produced zero scores and receptor distances above 33 Å; it is retained as an invalid setup, not evidence of docking. The report still has status `requires_further_validation`: this status means the software pipeline completed, not that the peptide contacts the receptor or binds it. The program did not flag this error automatically.

## Preserved unsuccessful 1BRS attempt

[1BRS](https://www.rcsb.org/structure/1BRS) source: https://files.rcsb.org/download/1BRS.pdb; retrieved 2026-11-05T11:52:32.726229+00:00; SHA-256 `0076aae54252706a8c8c02f7b1e71ce2394b0e928b413590b4ac12aade9e8f6c`. Its author assembly 1 comprises barnase A and barstar D. Both attempts used `--chain A,D --exclude-water`; both exited 1 before output directory creation. Original input was rejected for alternate locations. In `failures/1BRS-ser14-altA.pdb`, deposited Ser D14 CB/OG conformer A (occupancy 0.50) was chosen and its altloc label cleared, while B was removed; this input was rejected for missing Gln D58 NE2/OE1. Input files and standard output/error logs are retained in `failures/`. No 1BRS receptor preparation or docking success is claimed.

## Geometric screen added after the recorded runs

New runs label each pose by whether its minimum receptor–pose heavy-atom distance is at most 4.5 Å. This is a chosen geometric screening cutoff, not a biological binding criterion. A run or candidate containing any pose beyond the cutoff is marked `contains_poses_without_close_contact`; the pose and score remain in the original output. The original reports above remain unchanged; `geometric-screen.json` records a separate reclassification with source hashes. The exporter independently recalculates distances and refuses to export when any pose lacks proximity, including legacy reports. Batches stop and preserve their child report and pose files for review. Passing the screen does not establish binding; failing it does not prove biological nonbinding.
