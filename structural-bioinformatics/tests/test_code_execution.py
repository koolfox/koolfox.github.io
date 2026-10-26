"""Execute real editable recipes and verify independent scientific controls."""

import runpy
from pathlib import Path
from types import SimpleNamespace

import pytest

PROJECT = Path(__file__).resolve().parents[1]
ASSETS = PROJECT / "assets/course"
lab = SimpleNamespace(**runpy.run_path(str(ASSETS / "interactive_lab.py")))
recipes = SimpleNamespace(**runpy.run_path(str(ASSETS / "code_recipes.py")))
execution = SimpleNamespace(**runpy.run_path(str(ASSETS / "code_execution.py")))
PDB = ASSETS / "gromacs/1ubq-protein.pdb"
labels, points = lab.reference(PDB)
INPUTS = {"labels": labels, "points": points.tolist(), "source_sha256": lab.REFERENCE_SHA256}
CASES = [
    ("sequence", {"dna": "AACGT"}),
    ("geometry", {"shift": 10, "angle": 73, "deformation": 3}),
    ("energy", {"delta": 2}),
    ("minimization", {"start": 4, "rate": 0.25, "steps": 6}),
    ("sampling", {"shift": 2, "noise": 0.4, "correlation": 0.8, "seed": 17, "block": 25}),
    ("graph", {"dataset": "protein", "cutoff": 8, "exclude": 2, "selected": "A:21"}),
    ("graph", {"dataset": "toy", "cutoff": 5, "exclude": 0, "selected": "B"}),
]


def reference(mode, params):
    if mode == "sequence":
        state = lab.sequence(params["dna"])
    elif mode == "geometry":
        state = lab.geometry(PDB, **params)
    elif mode == "energy":
        state = lab.populations(**params)
    elif mode == "minimization":
        state = lab.minimize(**params)
    elif mode == "sampling":
        state = lab.sampling(**params)
    else:
        state = lab.graph(PDB, **params)
    return recipes.reference_view(state)


@pytest.mark.parametrize("mode,params", CASES)
def test_editable_recipe_reproduces_reference_with_same_parameters(mode, params):
    source = recipes.template(mode, params)
    result = execution.execute(source, INPUTS, lambda p: reference(mode, p))
    assert result["ok"], result.get("error")
    assert result["reference_error"] is None
    assert result["parameters"] == params
    assert result["result"]["metrics"] == pytest.approx(result["reference"]["metrics"], abs=1e-10)


def test_algorithm_edit_can_change_result_without_changing_reference():
    params = {"start": 4, "rate": 0.25, "steps": 3}
    source = recipes.template("minimization", params).replace("return 2 * x", "return x")
    result = execution.execute(source, INPUTS, lambda p: reference("minimization", p))
    assert result["ok"]
    assert result["reference"]["metrics"]["final_x"] == 0.5
    assert result["result"]["metrics"]["final_x"] == 4 * 0.75**3


def test_reference_uses_edited_literal_parameters_not_original_widgets():
    source = recipes.template("energy", {"delta": -2})
    result = execution.execute(source, INPUTS, lambda p: reference("energy", p))
    assert result["reference"]["metrics"]["probability_b"] > 0.8
    assert result["result"]["metrics"] == pytest.approx(result["reference"]["metrics"])


@pytest.mark.parametrize(
    "source,kind,line",
    [
        ("result = {", "SyntaxError", 1),
        ("print('before')\nraise ValueError('demonstration')", "ValueError", 2),
        ("unknown_name", "NameError", 1),
        ("raise SystemExit(2)", "SystemExit", 1),
    ],
)
def test_user_errors_report_line_and_keep_console(source, kind, line):
    result = execution.execute(source, INPUTS, lambda p: {})
    assert not result["ok"]
    assert result["error"]["type"] == kind
    assert result["error"]["line"] == line
    assert "result" not in result
    if kind == "ValueError":
        assert result["stdout"] == "before\n"


def test_dynamic_parameter_mutation_is_not_compared_to_a_stale_reference():
    source = 'parameters = {"delta":2}\nparameters["delta"] = 3\nresult = {"metrics":{"answer":42}}'
    result = execution.execute(source, INPUTS, lambda p: reference("energy", p))
    assert result["ok"] and result["reference"] is None
    assert result["parameters"] == {"delta": 3}


def test_custom_output_works_without_reference_and_prints_are_bounded():
    result = execution.execute(
        'print("a"*25000)\nresult={"metrics":{"my_metric":7}}', INPUTS, lambda p: {}
    )
    assert result["ok"] and result["reference"] is None
    assert len(result["stdout"]) == 20000
    assert result["stdout_truncated"] is True
    assert result["result"]["metrics"] == {"my_metric": 7}


@pytest.mark.parametrize(
    "value",
    [
        {"metrics": {"x": float("nan")}},
        {"metrics": {"x": "unknown"}},
        {"plot": {"series": [{"points": [[1, float("inf")]]}]}},
        {"plot": {"series": [{"points": [[1, 2, 3]]}]}},
        {"table": {"columns": ["a"], "rows": [[1, 2]]}},
    ],
)
def test_invalid_numerical_views_are_rejected(value):
    with pytest.raises((TypeError, ValueError)):
        execution.validate_result(value)


def test_download_input_matches_curated_coordinates():
    import json

    data = json.loads((ASSETS / "code-inputs.json").read_text())
    assert data == INPUTS


def test_vendored_editor_and_loader_match_recorded_sources():
    import hashlib
    import json

    record = json.loads((PROJECT / "data/metadata/code-editor-vendor.json").read_text())
    for entry in record["files"]:
        assert hashlib.sha256((PROJECT / entry["path"]).read_bytes()).hexdigest() == entry["sha256"]
    assert (
        hashlib.sha256((PROJECT / "editor-tools/editor.mjs").read_bytes()).hexdigest()
        == record["source_sha256"]
    )
