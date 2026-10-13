"""Commands are intended to run from the repository root with uv --project."""

import argparse
import json
from datetime import UTC, datetime
from importlib.metadata import version
from pathlib import Path

from .figures import plot_contacts, plot_coordinates
from .provenance import fetch_structures, sha256, write_json
from .structure import analyze_interface, heavy_atoms, read_model


def export_viewer(project: Path, interface: list):
    """Small Cα coordinate payload; chain shapes are experimental, tubes illustrative."""
    models = []
    titles = {
        "3WD5": "TNF–adalimumab Fab",
        "1TNF": "Unbound TNF trimer",
        "1B09": "CRP–phosphocholine",
        "4FM9": "TOP2A DNA-cleavage core with DNA (asymmetric unit)",
    }
    for entry in titles:
        path = project / f"data/raw/structures/{entry}.cif"
        model = read_model(path)
        chains = []
        for chain in model:
            atoms = [atom for atom in heavy_atoms(chain) if atom.name == "CA"]
            kind = "protein_ca"
            if not atoms:
                kind = "dna_phosphate"
                atoms = [
                    residue["P"]
                    for residue in chain
                    if residue.resname in {"DA", "DC", "DG", "DT"}
                    and "P" in residue
                    and (residue["P"].occupancy or 0) > 0
                ]
            if not atoms:
                continue
            chains.append(
                {
                    "id": chain.id,
                    "kind": kind,
                    "residues": [
                        {
                            "number": atom.parent.id[1],
                            "insertion": atom.parent.id[2].strip(),
                            "name": atom.parent.resname,
                            "xyz": [round(float(x), 3) for x in atom.coord],
                        }
                        for atom in atoms
                    ],
                }
            )
        models.append(
            {
                "id": entry,
                "title": titles[entry],
                "chains": chains,
                "source_url": f"https://www.rcsb.org/structure/{entry}",
                "input_sha256": sha256(path),
                "interface": interface if entry == "3WD5" else [],
            }
        )
    write_json(
        project / "data/processed/structures-view.json",
        {
            "representation": (
                "Protein C-alpha / DNA phosphate coordinates; tubes interpolate backbone traces, "
                "not molecular surfaces. No missing points are generated."
            ),
            "coordinate_units": "angstrom",
            "chain_namespace": "author",
            "structures": models,
        },
    )


def analyze(project: Path):
    path = project / "data/raw/structures/3WD5.cif"
    if not path.exists():
        raise FileNotFoundError("Run fetch-structures first; analysis requires experimental mmCIF")
    manifest_path = project / "data/metadata/structure-downloads.json"
    manifest = json.loads(manifest_path.read_text())
    expected = next(item for item in manifest["files"] if item["pdb_id"] == "3WD5")
    for coordinate in expected["coordinates"]:
        input_path = project / coordinate["path"]
        if sha256(input_path) != coordinate["sha256"]:
            raise ValueError(f"Input checksum differs from RCSB download manifest: {input_path}")
    reports = [analyze_interface(path, cutoff=cutoff) for cutoff in (4.0, 4.5, 5.0)]
    report = reports[1]
    report.update(
        {
            "pdb_id": "3WD5",
            "representation": "asymmetric unit: one TNF protomer and one Fab (H/L)",
            "source_url": "https://files.rcsb.org/download/3WD5.cif",
            "input_sha256": sha256(path),
            "analyzed_at_utc": datetime.now(UTC).isoformat(),
            "software": {name: version(name) for name in ["numpy", "biopython", "matplotlib"]},
            "sensitivity": [
                {
                    key: r[key]
                    for key in ("cutoff_angstrom", "heavy_atom_contact_count", "residue_pair_count")
                }
                for r in reports
            ],
            "limitations": [
                "A 3.10 Å crystal structure is not a molecular-dynamics trajectory.",
                "Distance contacts do not establish hydrogen bonds, binding energy or efficacy.",
                "These are author residue identifiers, not automatically mapped UniProt positions.",
                "One protomer–Fab view is not the full physiological TNF trimer or full IgG.",
                "Crystal-symmetry neighbors contributing to the complete epitope are absent.",
            ],
        }
    )
    write_json(project / "data/processed/interface-summary.json", report)
    assets = project / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    plot_contacts(report, assets / "interface-map.png")
    plot_coordinates(
        read_model(path), assets / "complex-preview.png", report["target_interface_residues"]
    )
    export_viewer(project, report["target_interface_residues"])
    # The tiny public example is an intentionally curated archive file; raw downloads stay ignored.
    pdb = project / "data/raw/structures/3WD5.pdb"
    (assets / "3wd5.pdb").write_bytes(pdb.read_bytes())
    write_json(
        project / "data/metadata/visual-assets.json",
        {
            "generated_at_utc": datetime.now(UTC).isoformat(),
            "coordinates": {
                "path": "assets/3wd5.pdb",
                "sha256": sha256(pdb),
                "source": "https://files.rcsb.org/download/3WD5.pdb",
                "license": "wwPDB archive data: CC0; retain scientific citation",
            },
            "figures": {"method": "tnf-atlas analyze", "input_sha256": sha256(path)},
        },
    )
    print(
        json.dumps(
            {
                key: report[key]
                for key in [
                    "pdb_id",
                    "residue_pair_count",
                    "heavy_atom_contact_count",
                    "chain_counts",
                ]
            },
            indent=2,
        )
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["fetch-structures", "analyze"])
    parser.add_argument("--project", type=Path, default=Path.cwd() / "structural-bioinformatics")
    args = parser.parse_args()
    project = args.project.resolve()
    if args.command == "fetch-structures":
        manifest = fetch_structures(project)
        print(f"Fetched {len(manifest['files'])} verified RCSB entries; SHA-256 manifest recorded.")
    else:
        analyze(project)


if __name__ == "__main__":
    main()
