# Run from the repository root in PyMOL; this is a rigid redocking control.
load structural-bioinformatics/assets/tnf-peptide/receptor-repaired.pdb, tnf
load structural-bioinformatics/assets/tnf-peptide/peptide.pdb, experimental_peptide
load structural-bioinformatics/assets/tnf-peptide/native-pose.pdb, docked_peptide
hide everything
show cartoon, tnf
color cyan, tnf
show cartoon, experimental_peptide
color grey70, experimental_peptide
show cartoon, docked_peptide
color orange, docked_peptide
show sticks, byres (tnf within 4 of docked_peptide)
zoom docked_peptide, 12
