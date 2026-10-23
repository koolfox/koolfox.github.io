"""Independent FreeSASA implementation check, with the project's exact atom/radius policy.

uv run --project structural-bioinformatics --group validation python \
    structural-bioinformatics/scripts/crosscheck_surface.py

No network access or PISA service is used. This checks software implementations on the
same fixed coordinates, not biological validity or the unpublished settings of Hu 2013.
"""

import hashlib
import importlib.util
import json
import platform
from datetime import UTC, datetime
from importlib.metadata import version
from pathlib import Path

import freesasa

from tnf_atlas.feasibility import VDW_RADII_ANGSTROM, selected_model

PROJECT = Path(__file__).resolve().parents[1]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def area(atoms, parameters, shift=None):
    coordinates = []
    radii = []
    for atom in atoms:
        xyz = [float(value) for value in atom.coord]
        if shift and atom.get_parent().get_parent().id in {"H", "L"}:
            xyz[0] += shift
        coordinates.extend(xyz)
        radii.append(VDW_RADII_ANGSTROM[atom.element])
    return freesasa.calcCoord(coordinates, radii, parameters).totalArea()


def calculate(model, target, algorithm):
    atoms = [atom for chain in target for atom in model[chain].get_atoms()]
    fab = [atom for chain in "HL" for atom in model[chain].get_atoms()]
    parameters = freesasa.Parameters(
        {
            "algorithm": algorithm,
            "probe-radius": 1.4,
            "n-points": 960,
            "n-slices": 100,
            "n-threads": 1,
        }
    )
    left, right = area(atoms, parameters), area(fab, parameters)
    complex_area = area(atoms + fab, parameters)
    separated = area(atoms + fab, parameters, shift=150.0)
    return {
        "target_atom_count": len(atoms),
        "fab_atom_count": len(fab),
        "isolated_target_angstrom2": round(left, 6),
        "isolated_fab_angstrom2": round(right, 6),
        "complex_angstrom2": round(complex_area, 6),
        "total_delta_sasa_angstrom2": round(left + right - complex_area, 6),
        "half_delta_sasa_angstrom2": round((left + right - complex_area) / 2, 6),
        "separated_total_delta_sasa_angstrom2": round(left + right - separated, 6),
    }


def main():
    assembly_script = PROJECT / "scripts/analyze_full_epitope.py"
    spec = importlib.util.spec_from_file_location("full_epitope", assembly_script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    source = PROJECT / "assets/3wd5.pdb"
    model, _ = module.build_assembly(selected_model(source))
    published = json.loads((PROJECT / "data/processed/full-epitope.json").read_text())
    # The full-epitope record explicitly labels both conventions; retain the sum here.
    references = {
        "deposited": published["buried_surface"]["single_protomer_total_delta_sasa_angstrom2"],
        "trimer": published["buried_surface"]["full_epitope_total_delta_sasa_angstrom2"],
    }
    results = {}
    for name, algorithm in (
        ("shrake_rupley", freesasa.ShrakeRupley),
        ("lee_richards", freesasa.LeeRichards),
    ):
        results[name] = {}
        for scope, chains in (("deposited", "A"), ("trimer", "ABC")):
            result = calculate(model, chains, algorithm)
            reference = references[scope]
            result["biopython_reference_total_angstrom2"] = reference
            result["relative_difference_from_biopython"] = round(
                (result["total_delta_sasa_angstrom2"] - reference) / reference, 6
            )
            results[name][scope] = result
    record = {
        "schema_version": 1,
        "status": "executed_independent_implementation_check_same_coordinates",
        "executed_at_utc": datetime.now(UTC).isoformat(),
        "software": {"python": platform.python_version(), "freesasa": version("freesasa")},
        "parameters": {
            "probe_radius_angstrom": 1.4,
            "shrake_rupley_points": 960,
            "lee_richards_slices": 100,
            "threads": 1,
            "radii_angstrom": VDW_RADII_ANGSTROM,
        },
        "provenance": {
            "input": "assets/3wd5.pdb",
            "input_sha256": digest(source),
            "reference": "data/processed/full-epitope.json",
            "reference_sha256": digest(PROJECT / "data/processed/full-epitope.json"),
            "assembly_script_sha256": digest(assembly_script),
            "generator_sha256": digest(Path(__file__)),
            "binary_sha256": digest(Path(freesasa.__file__)),
            "documentation": "https://freesasa.github.io/python/functions.html#freesasa.calcCoord",
        },
        "results": results,
        "limits": [
            "Coordinates, chain mapping and radii are shared with the primary analysis.",
            "FreeSASA is a separate SASA implementation; this is not an independent experiment.",
            "PISA was not run, and the area convention used by Hu remains undocumented.",
            "SASA is geometric, not affinity, free energy or therapeutic efficacy.",
        ],
    }
    output = PROJECT / "data/processed/surface-crosscheck.json"
    output.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
