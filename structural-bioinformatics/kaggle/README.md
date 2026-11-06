# Private Kaggle 7TA3 rigid-fragment control

A limited, known-site **technical control**, not blind docking, flexible peptide docking, a measurement of affinity, or evidence that the isolated fragment binds. The public [RCSB 7TA3 structure](https://www.rcsb.org/structure/7TA3) and [Niu et al.](https://doi.org/10.1021/jacs.1c13717) describe a TNF monomer and an intact, cyclized 31-residue peptide. This control uses only its internal A:3–15 fragment `GWRIGEAGTDPNL`, frozen in the bound conformation. No Visman code, model, or data is included. The public, prepared receptor and peptide and the control script are pinned by SHA-256 in the builder; all bytes are embedded in the generated script, not supplied via Kaggle datasets. The original PDB was not newly retrieved during this run; original retrieval time is unknown. Public inputs and provenance are in the repository at commit `2314adcae976a8235d1c383b00bad90e2fb16da4`.

The inherited preparation includes modeled receptor side chains; the truncated peptide's artificial ends are not re-capped or reparameterized. The score and geometry are model-dependent. See [the detailed control and input limitations](../assets/long-peptide-pilot/7ta3-13mer-control/README.md). The binding site and peptide conformation are taken from the answer. The rigid single-seed search cannot establish performance on new peptides. Atom-pair distances below 2 Å are only a coarse clash indicator.

## Run contract

`build_kernel.py` fails closed if any input hash differs; it creates a new output directory and produces a self-contained script and private CPU-only Kaggle metadata. The generated job obtains the official [Vina 1.2.7 release](https://github.com/ccsb-scripps/AutoDock-Vina/releases/tag/v1.2.7), checks the version and records its executable hash, but **does not verify that hash against an independently published checksum**. Internet access is required for this download; network, release availability and Kaggle image may change. Review the generated payload and metadata before submission. Kaggle privacy is a service setting, not an offline guarantee.

Vina runs on one CPU, seed 42, exhaustiveness 2, max_evals 100000, five requested modes, fixed known-site box, and four score-only translations. Each invocation has a timeout; the wrapper has a 600 s timeout and the Kaggle CLI submission below has a 900 s platform limit. Scores, raw logs and poses, input and executable hashes, UTC execution, mapping, fixed-frame heavy-atom RMSD and clash metrics are retained in the private output. Poses may number fewer than requested. The software version, Linux runtime and generated script hash are recorded; exact outputs are not guaranteed across environments. QC verifies source-to-prepared atom identity and coordinates, sequence, pose mapping, and the 97-heavy-atom count. Passing QC does not imply scientific validation.

From the repository root (choose a **new** directory):

```sh
python3 structural-bioinformatics/kaggle/build_kernel.py /tmp/7ta3-kaggle-package
# Optional local smoke with an existing Vina 1.2.7 installation; no install.
BIOOPS_VINA=/path/to/vina BIOOPS_OUTPUT=/tmp/7ta3-smoke python3 /tmp/7ta3-kaggle-package/experiment.py
python3 -m pytest -q structural-bioinformatics/tests/test_kaggle_7ta3_contract.py structural-bioinformatics/tests/test_7ta3_13mer_control.py
kaggle kernels push -p /tmp/7ta3-kaggle-package -t 900
kaggle kernels status lakookoo/bioops-7ta3-private-control
# On completion, download only to a new private directory, inspect report and logs.
kaggle kernels output lakookoo/bioops-7ta3-private-control -p /tmp/7ta3-kaggle-output
```

The explicit Linux executable URL and hashes identify the actual run, but cross-platform binary identity and exact repeatability are not established. No unrestricted screening or GPU is requested.

## Observed private run, version 1

Kaggle returned `COMPLETE`; metadata read back `is_private: true`, no GPU, and no attached datasets, kernels or models. On 2026-11-06T20:48:08Z the Linux Vina 1.2.7 run generated five poses. Rank 1 had fixed-frame 97-heavy-atom RMSD 0.535 Å, minimum receptor distance 2.70 Å and zero heavy-atom pairs below 2 Å. The separated +40 Å negative had zero pairs within 4 Å; the -40 Å overlap control had 13 pairs below 2 Å. All five pose RMSDs and geometry were recalculated from the downloaded coordinates and matched the report; pose and docking-log hashes matched. These are computational QC observations, not biological validation. The local smoke produced rank-1 RMSD 0.513 Å and four output poses; differing platforms need not produce identical results.

The submitted script SHA-256 was `3d7ab632e420b429b1bca76cd2d7dcd46b18c2434f650057add19baed2e9e564`; Vina executable SHA-256 was `f31f774f723bba7bbe6e9d1c47577020eea9a8da16424284c043d22593570644` (not independently authenticated). The output report SHA-256 was `46a3b257fd9f647dbe3b6407b58a601508126b6752994e86d06aef75bb7633f2`. The private downloaded outputs and log total 127181 bytes. Formatting and lint-only edits to the generator/template were made after submitting version 1, so a fresh build has a different script hash; scientific inputs and runtime parameters are unchanged, and the submitted script hash above identifies the actual run. The run is a fragment control only; it does not test docking the intact cyclized 31-mer.
