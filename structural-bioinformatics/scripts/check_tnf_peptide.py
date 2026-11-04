"""Audit complete amidated/disulfide peptide before any docking; RDKit required."""

import hashlib
import json
from pathlib import Path

from meeko import MoleculePreparation, PDBQTWriterLegacy
from rdkit import Chem, rdBase
from rdkit.Chem import AllChem

PROJECT = Path(__file__).resolve().parents[1]
SEQUENCE = "ECGWRIGEAGTDPNLNHQQFRAKILSIWEEC"


def main():
    work = PROJECT / "results/tnf-peptide/prepared"
    model = Chem.MolFromPDBFile(str(work / "peptide.pdb"), removeHs=True)
    if model is None:
        raise ValueError("PDB chemical perception failed")
    expected = Chem.MolFromSequence(SEQUENCE)
    Chem.AssignStereochemistryFrom3D(model)
    Chem.AssignStereochemistry(expected, cleanIt=True, force=True)

    def ca_codes(molecule):
        return {
            a.GetPDBResidueInfo().GetResidueNumber(): (
                a.GetProp("_CIPCode") if a.HasProp("_CIPCode") else None
            )
            for a in molecule.GetAtoms()
            if a.GetPDBResidueInfo().GetName().strip() == "CA"
        }

    if ca_codes(model) != ca_codes(expected):
        raise ValueError("Alpha-carbon stereochemistry differs from the reference L sequence")
    actual = {
        (a.GetPDBResidueInfo().GetResidueNumber(), a.GetPDBResidueInfo().GetName().strip()): a
        for a in model.GetAtoms()
    }
    missing = [
        (a.GetPDBResidueInfo().GetResidueNumber(), a.GetPDBResidueInfo().GetName().strip())
        for a in expected.GetAtoms()
        if a.GetPDBResidueInfo().GetName().strip() != "OXT"
        and (a.GetPDBResidueInfo().GetResidueNumber(), a.GetPDBResidueInfo().GetName().strip())
        not in actual
    ]
    if missing:
        raise ValueError(f"Missing peptide heavy atoms: {missing}")
    sg1, sg2 = actual[(2, "SG")], actual[(31, "SG")]
    if model.GetBondBetweenAtoms(sg1.GetIdx(), sg2.GetIdx()) is None:
        raise ValueError("Missing disulfide bond")
    cap = actual[(32, "N")]
    if model.GetBondBetweenAtoms(actual[(31, "C")].GetIdx(), cap.GetIdx()) is None:
        raise ValueError("Missing terminal amide bond")
    if cap.GetTotalNumHs() != 2:
        raise ValueError("Terminal amide hydrogen count is incorrect")
    conf = model.GetConformer()
    cn = [
        (
            conf.GetAtomPosition(actual[(i, "C")].GetIdx())
            - conf.GetAtomPosition(actual[(i + 1, "N")].GetIdx())
        ).Length()
        for i in range(1, 31)
    ]
    if not all(1.1 <= d <= 1.6 for d in cn):
        raise ValueError("Peptide backbone fails the C-N continuity screen")
    mol = Chem.AddHs(model, addCoords=True)
    # Preserve the experimental heavy-atom conformation; optimize hydrogens only.
    ff = AllChem.UFFGetMoleculeForceField(mol)
    for i in range(model.GetNumAtoms()):
        ff.AddFixedPoint(i)
    ff.Initialize()
    convergence = ff.Minimize(maxIts=1000)
    if convergence != 0:
        raise ValueError("Hydrogen minimization did not converge")
    writer = Chem.SDWriter(str(work / "peptide-h.sdf"))
    writer.write(mol)
    writer.close()
    prep = MoleculePreparation(
        rigid_macrocycles=True,
        rigidify_bonds_smarts=["[*]~[*]"],
        rigidify_bonds_indices=[(0, 1)],
        add_index_map=True,
    )
    setup = prep.prepare(mol)[0]
    pdbqt, ok, error = PDBQTWriterLegacy.write_string(setup)
    if not ok:
        raise ValueError(error)
    if "TORSDOF 0" not in pdbqt:
        raise ValueError("Peptide is not rigid in the docking input")
    (work / "peptide.pdbqt").write_text(pdbqt)
    report = {
        "rdkit_version": rdBase.rdkitVersion,
        "sequence": SEQUENCE,
        "peptide_heavy_atoms": model.GetNumAtoms(),
        "missing_heavy_atoms": missing,
        "alpha_carbon_stereochemistry": "matches standard L sequence",
        "disulfide": "Cys2-SG to Cys31-SG verified",
        "c_terminal_amide": "NH2 connectivity and hydrogen count verified",
        "cn_distances_angstrom": cn,
        "hydrogen_minimization_code": convergence,
        "docking_model": "rigid bound-conformation peptide; zero internal torsions",
        "full_stereochemical_validation": "not_complete",
        "pdbqt_sha256": hashlib.sha256(pdbqt.encode()).hexdigest(),
    }
    (PROJECT / "data/processed/tnf-peptide-quality.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
