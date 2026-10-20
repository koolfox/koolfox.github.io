# Docking scripts

The redocking of 1B09 (C-reactive protein with phosphocholine) that the course
uses to show what a docking run can and cannot say. The teaching document is
`../docs/docking-protocol.fa.md`; the recorded result is
`../data/processed/docking-redock-1b09.json`.

This folder is not part of the website build and is not published with the
notebook. The intermediate files stay in `../results/` and are not committed.

## Environment

The docking engine and the structure preparation tools are not part of the main
project environment, because the main one is locked for the site build and the
tests. Use a separate conda environment:

```bash
conda env create -f structural-bioinformatics/docking/environment.yml
```

The pinned versions of the run that produced the recorded result are AutoDock
Vina 1.2.7, Meeko 0.8.0, RDKit 2026.09.1, gemmi 0.7.5, NumPy 2.5.4, SciPy 1.18.1
and Python 3.12.

## Run

From the repository root, with the downloaded 1B09 coordinates in place
(`uv run --project structural-bioinformatics tnf-atlas fetch-structures`):

```bash
conda run -n tnf-docking python structural-bioinformatics/docking/prepare_redock.py
conda run -n tnf-docking mk_prepare_receptor.py \
  --read_pdb structural-bioinformatics/results/docking/1b09/receptor.pdb \
  -o structural-bioinformatics/results/docking/1b09/receptor \
  --write_pdbqt structural-bioinformatics/results/docking/1b09/receptor.pdbqt
conda run -n tnf-docking mk_prepare_ligand.py \
  -i structural-bioinformatics/results/docking/1b09/ligand_ideal.sdf \
  -o structural-bioinformatics/results/docking/1b09/ligand.pdbqt
conda run -n tnf-docking python structural-bioinformatics/docking/run_vina.py
conda run -n tnf-docking python structural-bioinformatics/docking/score_pose.py
```

The three scripts in order:

- `prepare_redock.py` writes the receptor, the ligand, the crystal reference
  pose and the two search boxes, and records the sources with their SHA-256.
- `run_vina.py` docks the ligand into the native pocket and into the wrong-site
  control with the same parameters and the same seed.
- `score_pose.py` measures the poses and writes the three gates into
  `../data/processed/docking-redock-1b09.json`.

The run is reproducible: the seed is fixed, so repeating it with the same
versions returns the same poses. A different engine version, a different seed or
a different preparation changes the numbers, and the document and the record
have to be regenerated together.
