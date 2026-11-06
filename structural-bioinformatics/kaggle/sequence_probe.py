"""Kaggle-only feasibility probe: generate 7TA3 peptide from sequence, not coordinates."""

import hashlib
import json
import platform
import subprocess
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

SEQUENCE = "ECGWRIGEAGTDPNLNHQQFRAKILSIWEEC"


def main():
    out = Path("/kaggle/working/sequence-probe")
    out.mkdir(parents=True, exist_ok=True)
    report = {
        "utc": datetime.now(timezone.utc).isoformat(),
        "sequence": SEQUENCE,
        "status": "failed",
        "stage": "initialization",
        "python": sys.version,
        "platform": platform.platform(),
        "kernel_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "limitations": [
            "Known experimental sequence and disulfide; no receptor docking",
            "A single conformer cannot establish sampling quality or binding",
            "RMSD is peptide-only CA aligned, not receptor-frame docking RMSD",
        ],
    }
    started = time.monotonic()
    try:
        report["stage"] = "install_rdkit"
        install = subprocess.run(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "--no-cache-dir",
                "--only-binary=:all:",
                "rdkit==2025.9.6",
            ],
            capture_output=True,
            text=True,
            timeout=180,
        )
        report["install_returncode"] = install.returncode
        report["install_log_tail"] = (install.stdout + install.stderr)[-4000:]
        if install.returncode:
            raise RuntimeError("RDKit installation failed")
        import numpy as np
        import rdkit
        from rdkit import Chem
        from rdkit.Chem import AllChem

        report["rdkit_version"] = rdkit.__version__
        report["stage"] = "construct_graph"
        m = Chem.RWMol(Chem.MolFromSequence(SEQUENCE))

        def atom(residue, name):
            matches = [
                a.GetIdx()
                for a in m.GetAtoms()
                if a.GetPDBResidueInfo()
                and a.GetPDBResidueInfo().GetResidueNumber() == residue
                and a.GetPDBResidueInfo().GetName().strip() == name
            ]
            if len(matches) != 1:
                raise ValueError(f"atom mapping {residue} {name}: {matches}")
            return matches[0]

        s1, s2 = atom(2, "SG"), atom(31, "SG")
        m.AddBond(s1, s2, Chem.BondType.SINGLE)
        # Change the C-terminal hydroxyl to amide NH2, without changing atom indices.
        terminal = m.GetAtomWithIdx(atom(31, "OXT"))
        terminal.SetAtomicNum(7)
        terminal.SetNoImplicit(False)
        mol = m.GetMol()
        Chem.SanitizeMol(mol)
        mol = Chem.AddHs(mol)
        report["graph"] = {
            "atoms_with_hydrogens": mol.GetNumAtoms(),
            "disulfide_bond": bool(mol.GetBondBetweenAtoms(s1, s2)),
            "terminal_nitrogen_hydrogens": mol.GetAtomWithIdx(terminal.GetIdx()).GetTotalNumHs(
                includeNeighbors=True
            ),
        }
        if report["graph"]["terminal_nitrogen_hydrogens"] != 2:
            raise ValueError("terminal amidation incorrect")
        report["stage"] = "embed"
        params = AllChem.ETKDGv3()
        params.randomSeed = 42
        params.numThreads = 1
        params.maxIterations = 10
        params.timeout = 180
        result = AllChem.EmbedMolecule(mol, params)
        report["embed_result"] = int(result)
        if result != 0:
            raise ValueError("ETKDG did not generate a conformer within the bounded attempt")
        report["stage"] = "minimize"
        props = AllChem.MMFFGetMoleculeProperties(mol)
        if props is None:
            raise ValueError("MMFF parameters unavailable")
        report["minimization_status"] = int(AllChem.MMFFOptimizeMolecule(mol, maxIters=200))
        conf = mol.GetConformer()
        coords = np.array(conf.GetPositions())
        report["disulfide_distance_angstrom"] = float(np.linalg.norm(coords[s1] - coords[s2]))
        distances = Chem.GetDistanceMatrix(mol)
        heavy = [a.GetIdx() for a in mol.GetAtoms() if a.GetAtomicNum() > 1]
        close = [
            (i, j)
            for n, i in enumerate(heavy)
            for j in heavy[n + 1 :]
            if distances[i, j] > 3 and np.linalg.norm(coords[i] - coords[j]) < 2.0
        ]
        report["intrapeptide_nonlocal_heavy_pairs_below_2_angstrom"] = len(close)
        # Reference is used only after generation; align matched CA atoms, not a docking pose.
        pdb = Path("/kaggle/working/reference.pdb").read_text().splitlines()
        ref = {}
        for line in pdb:
            if (
                line.startswith("ATOM  ")
                and line[21] == "A"
                and line[12:16].strip() == "CA"
                and line[16] in (" ", "A")
                and float(line[54:60]) > 0
            ):
                ref[int(line[22:26])] = [float(line[i : i + 8]) for i in (30, 38, 46)]
        common = [i for i in range(1, 32) if i in ref]
        if len(common) < 20:
            raise ValueError("insufficient observed reference CA atoms")
        x = np.array([coords[atom(i, "CA")] for i in common])
        y = np.array([ref[i] for i in common])
        x -= x.mean(axis=0)
        y -= y.mean(axis=0)
        u, _, vt = np.linalg.svd(x.T @ y)
        correction = np.eye(3)
        correction[-1, -1] = np.linalg.det(u @ vt)
        report["aligned_ca_rmsd_angstrom"] = float(
            np.sqrt(np.mean(np.sum((x @ u @ correction @ vt - y) ** 2, axis=1)))
        )
        report["matched_ca_residues"] = common
        report["stage"] = "completed"
        report["status"] = "feasibility_only"
        Chem.MolToMolFile(mol, str(out / "sequence-conformer.sdf"))
    except Exception as exc:
        report["error"] = str(exc)
        report["traceback"] = traceback.format_exc()
    finally:
        report["elapsed_seconds"] = round(time.monotonic() - started, 3)
        (out / "report.json").write_text(json.dumps(report, indent=2) + "\n")
        print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
