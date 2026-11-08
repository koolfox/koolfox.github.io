# Exploratory manual peptide docking

Run from the checkout root with the existing RDKit, Meeko, and Vina environment; no installation is performed. Set `TOOL_DIR` to its `bin` directory, and choose a **new** output directory with an existing parent. For example:

```sh
"$TOOL_DIR/python" structural-bioinformatics/scripts/manual-adalimumab-docking.py --tool-dir "$TOOL_DIR" --output-dir /private/tmp/manual-adalimumab-docking-example-unique
"$TOOL_DIR/python" structural-bioinformatics/tests/manual-adalimumab-docking-test.py
uv run --project structural-bioinformatics ruff check structural-bioinformatics
```

The JSON report contains the exact preparation, Vina, and export argument arrays. In these arrays `<project>` means the checkout's `structural-bioinformatics` directory `<output>` means the new output directory supplied above, and `<tool-dir>` means the directory passed with `--tool-dir`. Replace each placeholder with its corresponding path as one argument. The report records input hashes, actual executable hashes and Vina version, alignment, settings, QC failures and output hashes. Each run writes a separate directory and refuses an existing one; failed runs preserve the report and available intermediate files.

The known experimental fragment determines the search box: this introduces known-site bias. One fixed protonation state, one independent sequence conformer, one seed, a small search budget, a rigid 7TA3 monomer with five modeled side chains, a mismatch and missing loops are substantial limitations. The missing TNF trimer neighbors are not modeled. Status `exploratory_no_qc_passing_poses` explicitly reports zero passing poses and exits nonzero; `exploratory_not_validated` means at least one pose passed these limited screens. Neither status asserts binding, affinity, potency, replacement, or validation. Geometry thresholds are simple screens, not proof of a physically correct conformation. Atom indices in the QC report are zero-based.
