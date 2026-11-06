"""Read-only recalculation of Kaggle SDF diagnostics; does not generate conformers."""

import json
import sys
from pathlib import Path

import numpy as np
from rdkit import Chem

root = Path(sys.argv[1])
seq = "ECGWRIGEAGTDPNLNHQQFRAKILSIWEEC"
template = Chem.MolFromSequence(seq)


def idx(n, name):
    return next(
        a.GetIdx()
        for a in template.GetAtoms()
        if a.GetPDBResidueInfo().GetResidueNumber() == n
        and a.GetPDBResidueInfo().GetName().strip() == name
    )


ref = {}
for line in (root / "reference.pdb").read_text().splitlines():
    if (
        line.startswith("ATOM  ")
        and line[21] == "A"
        and line[12:16].strip() == "CA"
        and line[16] in (" ", "A")
        and float(line[54:60]) > 0
    ):
        ref[int(line[22:26])] = [float(line[i : i + 8]) for i in (30, 38, 46)]
assert list(sorted(ref)) == list(range(1, 32))
for seed in (42, 43, 44, 45):
    mol = Chem.SDMolSupplier(
        str(root / f"multiconformer/{seed}/sequence-conformer.sdf"), removeHs=False
    )[0]
    assert mol is not None and mol.GetNumAtoms() == 490
    assert all(
        a.GetSymbol() == mol.GetAtomWithIdx(a.GetIdx()).GetSymbol()
        for a in template.GetAtoms()
        if a.GetIdx() != idx(31, "OXT")
    )
    assert mol.GetBondBetweenAtoms(idx(2, "SG"), idx(31, "SG"))
    xyz = np.array(mol.GetConformer().GetPositions())
    x = np.array([xyz[idx(i, "CA")] for i in range(1, 32)])
    y = np.array([ref[i] for i in range(1, 32)])
    x -= x.mean(axis=0)
    y -= y.mean(axis=0)
    u, _, vt = np.linalg.svd(x.T @ y)
    d = np.eye(3)
    d[2, 2] = np.linalg.det(u @ vt)
    rms = np.sqrt(np.mean(np.sum((x @ u @ d @ vt - y) ** 2, axis=1)))
    dist = np.linalg.norm(xyz[idx(2, "SG")] - xyz[idx(31, "SG")])
    graph = Chem.GetDistanceMatrix(mol)
    heavy = [a.GetIdx() for a in mol.GetAtoms() if a.GetAtomicNum() > 1]
    clashes = sum(
        graph[i, j] > 3 and np.linalg.norm(xyz[i] - xyz[j]) < 2
        for n, i in enumerate(heavy)
        for j in heavy[n + 1 :]
    )
    r = json.loads((root / f"multiconformer/{seed}/report.json").read_text())
    assert abs(rms - r["aligned_ca_rmsd_angstrom"]) < 0.0002
    assert abs(dist - r["disulfide_distance_angstrom"]) < 0.0002
    assert clashes == r["intrapeptide_nonlocal_heavy_pairs_below_2_angstrom"]
    print(seed, round(rms, 5), round(dist, 5), clashes)
