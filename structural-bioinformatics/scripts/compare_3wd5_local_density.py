#!/usr/bin/env python3
"""Predeclared, model-biased density sampling; does not write coordinates."""
import hashlib
import json
import sys
from pathlib import Path

import gemmi
import numpy as np
from Bio.PDB import PDBParser

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audit_3wd5_disulfide_angles import angle, dihedral  # noqa: E402
from scan_3wd5_disulfide import SHA, SOURCE  # noqa: E402

COEFFICIENTS = Path('/tmp/bioops-3wd5-2fofc.cif.gz')
MAP = Path('/tmp/bioops-3wd5-density-verified-v3/3wd5-validation-2fofc.map')
COEFF_SHA = '4a4f2d98a9f1bdaaf9ffa70115be757d96f2e881dfef9d9b01c332c7864c0322'
MAP_SHA = '9bfadd1b1f4ef8b4746129f4668ffe8c0c1e873faa206e96265646f3c3a5922d'


def verify(path, expected):
    actual = hashlib.sha256(Path(path).read_bytes()).hexdigest()
    if actual != expected:
        raise ValueError(f'Unexpected SHA-256 for {path}: {actual}')
    return actual


def rotate(ca, cb, sg, degrees):
    axis = (cb - ca) / np.linalg.norm(cb - ca)
    v = sg - cb
    t = np.deg2rad(degrees)
    return cb + v * np.cos(t) + np.cross(axis, v) * np.sin(t) + axis * np.dot(axis, v) * (1 - np.cos(t))


def sample(grid, center, mean, sigma, radius=1.0):
    """Enumerate local voxel centers, with periodic wrapping, in an orthogonal cell."""
    cell = grid.unit_cell
    if not np.allclose(cell.parameters[3:], [90, 90, 90], atol=1e-5):
        raise ValueError('Only orthogonal cells supported')
    dims = np.array([grid.nu, grid.nv, grid.nw])
    lengths = np.array(cell.parameters[:3])
    center = np.asarray(center, dtype=float)
    fractional = center / lengths
    nearest = np.floor(fractional * dims).astype(int)
    reach = np.ceil(radius * dims / lengths).astype(int) + 1
    values = []
    for i in range(nearest[0] - reach[0], nearest[0] + reach[0] + 1):
        for j in range(nearest[1] - reach[1], nearest[1] + reach[1] + 1):
            for k in range(nearest[2] - reach[2], nearest[2] + reach[2] + 1):
                ijk = np.array([i, j, k])
                if np.linalg.norm(ijk / dims * lengths - center) <= radius + 1e-10:
                    values.append(grid.get_value(int(i % dims[0]), int(j % dims[1]), int(k % dims[2])))
    values = np.asarray(values, dtype=float)
    if not values.size or not np.isfinite(values).all() or not np.isfinite(sigma) or sigma <= 0:
        raise ValueError('Empty/nonfinite sphere or invalid global standard deviation')
    z = (values - mean) / sigma
    center_value = grid.interpolate_value(gemmi.Position(*center))
    if not np.isfinite(center_value):
        raise ValueError('Nonfinite interpolation')
    return {'voxel_count': int(values.size), 'center_sigma': float((center_value - mean) / sigma),
            'sphere_mean_sigma': float(z.mean()), 'sphere_min_sigma': float(z.min()),
            'sphere_max_sigma': float(z.max())}


def run():
    for path, expected in [(SOURCE, SHA), (COEFFICIENTS, COEFF_SHA), (MAP, MAP_SHA)]:
        verify(path, expected)
    blocks = gemmi.as_refln_blocks(gemmi.cif.read(str(COEFFICIENTS)))
    if len(blocks) != 1 or blocks[0].entry_id.lower() != '3wd5':
        raise ValueError('Unexpected coefficient block')
    block = blocks[0]
    rebuilt = block.transform_f_phi_to_map('pdbx_FWT', 'pdbx_PHWT', sample_rate=3.0)
    ccp4 = gemmi.read_ccp4_map(str(MAP))
    grid = ccp4.grid
    structure = gemmi.read_structure(str(SOURCE))
    if (ccp4.axis_positions() != [0, 1, 2] or any(ccp4.header_i32(i) != 0 for i in (5, 6, 7))
        or any(ccp4.header_float(i) != 0 for i in (50, 51, 52))
        or grid.spacegroup != block.spacegroup or gemmi.find_spacegroup_by_name(structure.spacegroup_hm) != block.spacegroup
        or not np.allclose(grid.unit_cell.parameters, block.cell.parameters, atol=1e-3)
        or not np.allclose(structure.cell.parameters, block.cell.parameters, atol=1e-3)
        or not np.array_equal(np.asarray(grid), np.asarray(rebuilt))):
        raise ValueError('Grid, coefficients or coordinate metadata mismatch')
    array = np.asarray(grid)
    if not np.isfinite(array).all():
        raise ValueError('Nonfinite map')
    mean, sigma = float(np.mean(array, dtype=np.float64)), float(np.std(array, dtype=np.float64))
    chain = PDBParser(QUIET=True).get_structure('3wd5', SOURCE)[0]['A']
    atoms = {}
    for number in (69, 101):
        for name in ('CA', 'CB', 'SG'):
            atom = chain[number][name]
            if atom.is_disordered() or atom.occupancy is None or atom.occupancy <= 0:
                raise ValueError('Ambiguous or unoccupied atom')
            atoms[number, name] = atom.coord.astype(float)
    deposited = [atoms[n, 'SG'] for n in (69, 101)]
    candidate = [rotate(atoms[n, 'CA'], atoms[n, 'CB'], atoms[n, 'SG'], d)
                 for n, d in zip((69, 101), (-90, -10), strict=True)]
    results = {}
    for label, sulfurs in [('deposited', deposited), ('scan_candidate', candidate)]:
        a, b, c, d = atoms[69, 'CB'], sulfurs[0], sulfurs[1], atoms[101, 'CB']
        results[label] = {
            'sg_displacement_angstrom': [float(np.linalg.norm(x - y)) for x, y in zip(sulfurs, deposited, strict=True)],
            'sg_sg_angstrom': float(np.linalg.norm(b-c)),
            'cb_sg_sg_angles_degrees': [angle(a, b, c), angle(b, c, d)],
            'cb_sg_sg_cb_dihedral_degrees': dihedral(a, b, c, d),
            'density': {str(n): sample(grid, p, mean, sigma) for n, p in zip((69, 101), sulfurs, strict=True)},
        }
    for path, expected in [(SOURCE, SHA), (COEFFICIENTS, COEFF_SHA), (MAP, MAP_SHA)]:
        verify(path, expected)
    return {'input_sha256': {'pdb': SHA, 'coefficients': COEFF_SHA, 'map': MAP_SHA},
            'grid': list(array.shape), 'grid_mean': mean, 'grid_population_std': sigma,
            'all_rebuilt_voxels_equal': True, 'sample_radius_angstrom': 1.0,
            'candidate_rotations_degrees': [-90, -10], 'gemmi': gemmi.__version__,
            'numpy': np.__version__, 'models': results}


if __name__ == '__main__':
    print(json.dumps(run(), indent=2, allow_nan=False))
