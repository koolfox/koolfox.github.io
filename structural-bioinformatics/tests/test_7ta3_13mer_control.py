"""Offline invariants for the 7TA3 fragment technical control."""
import importlib.util
import json
import math
from pathlib import Path

import unittest

PROJECT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('control7ta3', PROJECT / 'scripts/long_peptide_7ta3_control.py')
control = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(control)
OUT = PROJECT / 'assets/long-peptide-pilot/7ta3-13mer-control/run-20261106'


def test_deposited_mapping_and_retained_outputs():
    ref, prepared, mapping = control.build(control.SOURCE.read_text(), control.PREPARED.read_text())
    assert len(ref) == len(mapping) > 80
    assert mapping == json.loads((OUT / 'atom-map.json').read_text())
    assert ref == control.records((OUT / 'fragment.pdb').read_text())
    assert prepared == control.records((OUT / 'reference.pdbqt').read_text())
    assert len({x['source_serial'] for x in mapping}) == len(mapping)
    assert len({x['pdbqt_serial'] for x in mapping}) == len(mapping)


def test_rmsd_translation_and_atom_mismatch():
    _, ligand, _ = control.build(control.SOURCE.read_text(), control.PREPARED.read_text())
    assert control.rmsd(ligand, ligand) == 0
    assert control.rmsd(ligand, control.translate(ligand, 40)) == 40
    with unittest.TestCase().assertRaisesRegex(ValueError, 'serial mismatch'):
        control.rmsd(ligand, ligand[:-1])


def test_saved_results_and_independent_distances():
    report = json.loads((OUT / 'report.json').read_text())
    assert report['source_sha256'] == control.sha(control.SOURCE)
    assert report['receptor_sha256'] == control.sha(control.RECEPTOR)
    rec = [control.xyz(x) for x in control.records(control.RECEPTOR.read_text()) if control.heavy(x, True)]
    for offset in (0, 10, 40, -40):
        path = OUT / f'offset-{offset:+d}.pdbqt'
        lig = [control.xyz(x) for x in control.records(path.read_text()) if control.heavy(x, True)]
        distances = [math.sqrt(sum((a-b)**2 for a, b in zip(x, y))) for x in rec for y in lig]
        case = report['cases'][str(offset)]
        assert case['input_sha256'] == control.sha(path)
        assert math.isclose(case['geometry']['minimum_heavy_distance_angstrom'], min(distances), abs_tol=1e-12)
        assert case['geometry']['pairs_below_2_angstrom'] == sum(d < 2 for d in distances)
    assert report['docking']['pose_sha256'] == control.sha(OUT / 'poses.pdbqt')
    import re
    blocks = re.findall(r'^MODEL\s+\d+\s*$(.*?)^ENDMDL\s*$', (OUT / 'poses.pdbqt').read_text(), re.M | re.S)
    reference = {int(x[6:11]): control.xyz(x) for x in control.records((OUT / 'reference.pdbqt').read_text()) if control.heavy(x, True)}
    assert len(blocks) == len(report['docking']['poses'])
    for block, pose in zip(blocks, report['docking']['poses']):
        atoms = {int(x[6:11]): control.xyz(x) for x in control.records(block) if control.heavy(x, True)}
        assert atoms.keys() == reference.keys()
        independent = math.sqrt(sum(sum((a-b)**2 for a,b in zip(reference[k], atoms[k])) for k in reference) / len(reference))
        assert math.isclose(independent, pose['fixed_frame_rmsd_angstrom'], abs_tol=1e-12)
        distances = [math.dist(a, b) for a in rec for b in atoms.values()]
        assert math.isclose(min(distances), pose['geometry']['minimum_heavy_distance_angstrom'], abs_tol=1e-12)
        assert sum(d < 2 for d in distances) == pose['geometry']['pairs_below_2_angstrom']
    assert report['cases']['40']['geometry']['pairs_below_4_angstrom'] == 0
    assert report['cases']['-40']['geometry']['pairs_below_2_angstrom'] > 0


if __name__ == '__main__':
    test_deposited_mapping_and_retained_outputs()
    test_rmsd_translation_and_atom_mismatch()
    test_saved_results_and_independent_distances()
    print('3 offline tests passed')
