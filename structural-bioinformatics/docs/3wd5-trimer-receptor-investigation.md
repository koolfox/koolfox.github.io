# Reconstructed 3WD5 TNF trimer receptor investigation

**Result: blocked, not repaired or validated.** This experiment addresses TNF
chains A/B/C of the existing crystallographically reconstructed complex, not
the deposited A/H/L Fab complex. The [plan and numerical filters](3wd5-trimer-investigation-plan.md)
were committed before these runs. There was no docking, candidate repair,
occupancy modification, guard change, download or installation.

The deposited 3WD5 input SHA-256 is
`fae6eee1b06b8cba0a466280dbc32563efaa54ec639afd921cb610d17debd216`;
the pre-existing reconstruction is
`260d6967b3660a014d8f238dbf1d579d7f796d46e1c4eada74b48bb1efb26974`.
Its three protomers are symmetry copies of deposited author A, not three
independent observations. The A/B/C mappings are respectively (x,y,z),
(y,z,x), (z,x,y), with no lattice translation. All 1,187 selected heavy-atom
identifiers per chain match deposited A; the maximum coordinate discrepancy is
0.000 Å after permutation. H/L, I/M and J/N are the corresponding Fab copies;
they are excluded from the receptor diagnostic. The reconstruction is a
derived crystal-symmetry model, not a new deposition or a complete crystal.

For each chain, residues 6–157 are present without internal numbering gaps,
and no heavy atoms are missing under the existing standard-residue inventory;
there are no zero-occupancy or alternate-location records in these selected
chains. This does not mean the protein is complete: deposited SEQRES and
REMARK 465 identify five unresolved N-terminal residues A1–5, inherited by
each reconstructed copy. Terminal OXT is not in the inventory and was not
counted as an internal missing atom. Deposited TNF A has no alternate-location
ATOM records, so there are no experimentally deposited alternate SG positions
to choose between. The original reconstruction selection also omits water and
other components; it cannot represent all possible alternate conformations.

| Each reconstructed chain | Cys69 SG–Cys101 SG | Cys69 SG–Cys101 CB | CB69–SG69–SG101 / SG69–SG101–CB101 | CB69–SG69–SG101–CB101 |
| --- | ---: | ---: | ---: | ---: |
| A, B and C | 2.049 Å | 1.750 Å | 88.199° / 53.169° | −139.563° |

The 1.750 Å contact is below the existing guard's 1.9 Å threshold and the
2.172 Å carbon–sulfur distance-inference cutoff documented for Meeko 0.8.0.
The SG–SG distance falls in the preregistered broad 1.9–2.2 Å screening range,
but both angles fail the 95–115° range. These ranges are exploratory screens,
not sufficient validation; the dihedral is reported without an acceptance
threshold. Independent guard tests reject **each** copy, not only A.

The production workflow with `--chain A,B,C` exited 1 on A69 SG/A101 CB and
created no output directory. The arbitrary test box and peptide sequence were
preflight arguments only: no binding site was inferred and Vina did not run.
As a separate negative control, direct, unmodified Meeko 0.8.0 on a
byte-preserving A/B/C ATOM selection exited 1: Cys101 in all three chains failed
template matching with excess inter-residue bonds. No output receptor was
produced. This bypass of the production guard was strictly diagnostic; no
forgiving or deletion flags were used. Full stdout, stderr and exit status are
in [probe.json](../assets/3wd5-trimer-investigation/probe.json), and the
measurements are in [audit.json](../assets/3wd5-trimer-investigation/audit.json).

The earlier local validation report records deposited A69/A101 RSCC 0.841/0.878
and EDIAm 0.404/0.480; see [the prior diagnostic](3wd5-receptor-diagnostic.md)
for its source and provenance. Those residue-level scores are not a comparison
of alternative sulfur models. The coefficient or density files are not present
in this checkout, so no new density fit or visual inspection was performed.
The 3.10 Å model-derived map would not be independent validation by itself.
The existing torsion scan is only a geometric sensitivity exercise; it is not a
crystal-supported candidate and was not promoted into a receptor. Without local
data and an independently verifiable repair procedure, generating a putative
repair would not resolve this ambiguity. Complete crystal surroundings,
protonation, missing residues, full stereochemistry and uncertainty remain open.

Reproduce with the existing local environment (paths may differ; no installs):

```sh
/opt/anaconda3/envs/tnf-docking/bin/python structural-bioinformatics/scripts/investigate_3wd5_trimer.py
/opt/anaconda3/envs/tnf-docking/bin/python structural-bioinformatics/scripts/probe_3wd5_trimer.py \
  --python /opt/anaconda3/envs/tnf-docking/bin/python \
  --meeko /opt/anaconda3/envs/tnf-docking/bin/mk_prepare_receptor.py \
  --vina /opt/anaconda3/envs/tnf-docking/bin/vina
```

Python 3.12, Biopython 1.86, Meeko 0.8.0, RDKit 2026.09.1 and NumPy
2.5.4 were used. The diagnostic selection is generated in a temporary
directory from original ATOM records; no receptor file resulted in this run.
