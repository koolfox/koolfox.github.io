# Bounded local 3WD5 disulfide density comparison

## Predeclared protocol

Compare only deposited author chain A Cys69/Cys101 and the already recorded minimum-displacement scan point (CA–CB rotations −90°, −10°), irrespective of density. The scan was selected by distance, two angles and proximity, without a dihedral filter; it is not a repair. Rotate only the two SG coordinates in memory. Do not refine, search, generate coordinates, fit B factors or change occupancy.

For each SG and each model, use the same 2Fo−Fc map and report trilinearly interpolated density at its center and the unweighted mean, minimum, maximum and count of finite map-grid values within 1.0 Å of that center. Normalize map values by the global grid mean and population standard deviation. Spheres are centered on different positions, so their voxel sets and counts can differ; these are descriptive sampling metrics, not RSCC, likelihood, independent observations, or a formal model comparison. Report SG displacements, SG–SG distance, both CB–SG–SG angles and CB–SG–SG–CB dihedral. No thresholds or winner are defined.

Require the existing recorded SHA-256 for the deposited PDB, compressed validation coefficients and CCP4 map, validate map cell/space group against coordinates and independently regenerate the grid from the provided FWT/PHWT coefficients with sample rate 3. Compare every map voxel. The validation 2Fo−Fc coefficients use observed data and model-derived phases/calculations: the map is biased by the deposited model and cannot independently validate either model. Verify the provenance against the existing export record, not by claiming to reconstruct its refinement history. Map resolution (3.10 Å), overlap, neighboring atoms, unequal voxel sets, sampling and the unmodeled environment constrain interpretation; no omit map, refinement, visual inspection, stereochemical acceptance or receptor validation is implied.

## Results (2026-11-06)

Run from the repository root using the pre-existing environment and supplied local files:

```sh
/opt/anaconda3/envs/tnf-docking/bin/python structural-bioinformatics/scripts/compare_3wd5_local_density.py
/opt/anaconda3/envs/tnf-docking/bin/python -m unittest discover -s structural-bioinformatics/tests -p test_3wd5_local_density_comparison.py -v
```

The source PDB SHA-256 is `fae6eee1b06b8cba0a466280dbc32563efaa54ec639afd921cb610d17debd216`, coefficients `4a4f2d98a9f1bdaaf9ffa70115be757d96f2e881dfef9d9b01c332c7864c0322`, and map `9bfadd1b1f4ef8b4746129f4668ffe8c0c1e873faa206e96265646f3c3a5922d`. The original [export provenance](../data/processed/3wd5-density-map-export.json) records the RCSB source and retrieval time. Gemmi 0.7.5 and NumPy 2.5.4 independently regenerated all 160³ voxels exactly from the provided coefficients; map axes, origin, unit cell and space group matched. The global mean was 3.31×10⁻¹¹ and population standard deviation 0.191062615 in map units. Equality verifies the map/coefficient relationship, not the independence of its phases or the historical refinement pipeline.

| Model | SG69 move (Å) | SG101 move (Å) | SG–SG (Å) | CB69–SG69–SG101 / SG69–SG101–CB101 (°) | Dihedral (°) |
| --- | ---: | ---: | ---: | --- | ---: |
| Deposited | 0 | 0 | 2.049 | 88.20 / 53.17 | −139.56 |
| Fixed scan candidate | 2.354 | 0.285 | 1.904 | 102.16 / 95.39 | 69.05 |

| Model and SG | Center (σ) | Sphere mean (σ) | Sphere min–max (σ) | Voxels |
| --- | ---: | ---: | --- | ---: |
| Deposited 69 | 2.380 | 2.086 | 1.083–2.946 | 4 |
| Candidate 69 | 0.438 | 0.714 | 0.257–1.583 | 3 |
| Deposited 101 | 1.437 | 1.514 | 1.047–2.013 | 4 |
| Candidate 101 | 1.403 | 1.278 | 0.639–2.013 | 4 |

The candidate's Cys69 center and sphere mean are lower in this model-biased map; Cys101 changes less. With only 3–4 sampled voxels per sphere, differing voxel sets and potentially overlapping contributions from nearby atoms, these numbers do not isolate sulfur density or establish uncertainty. The geometry numbers are measurements, not a complete stereochemical assessment. The deposited model itself informed the phases, so these observations do not establish that the deposited conformation is correct, exclude an alternative, validate a repair, or justify accepting a receptor for docking. No coordinates were exported or modified.
