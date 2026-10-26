"""Run one user recipe in the browser worker; never called by the Shiny server."""

import ast
import contextlib
import copy
import io
import json
import math
import traceback


class BoundedOutput(io.StringIO):
    def __init__(self):
        super().__init__()
        self.truncated = False

    def write(self, text):
        remaining = max(0, 20000 - self.tell())
        if len(text) > remaining:
            self.truncated = True
        super().write(text[:remaining])
        return len(text)


def literal_parameters(source):
    tree = ast.parse(source, filename="experiment.py")
    for statement in tree.body:
        if isinstance(statement, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id == "parameters"
            for target in statement.targets
        ):
            value = ast.literal_eval(statement.value)
            if not isinstance(value, dict):
                raise ValueError("parameters must be a dictionary")
            return value
    raise ValueError("A literal parameters dictionary is needed for a reference comparison")


def json_value(value):
    def convert(item):
        if hasattr(item, "tolist"):
            return item.tolist()
        raise TypeError("result must contain JSON-compatible values or NumPy arrays")

    encoded = json.dumps(value, default=convert, allow_nan=False)
    if len(encoded) > 500000:
        raise ValueError("Result exceeds the 500 KB teaching limit")
    return json.loads(encoded)


def validate_result(value):
    if value is None:
        return {"metrics": {}}
    value = json_value(value)
    if not isinstance(value, dict) or not isinstance(value.get("metrics", {}), dict):
        raise ValueError("result must be a dictionary with an optional metrics dictionary")
    metrics = value.setdefault("metrics", {})
    if len(metrics) > 32 or any(
        not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v)
        for v in metrics.values()
    ):
        raise ValueError("Use at most 32 finite numeric metrics")
    plot = value.get("plot")
    if plot is not None:
        if not isinstance(plot, dict) or not isinstance(plot.get("series", []), list):
            raise ValueError("plot.series must be a list")
        if len(plot.get("series", [])) > 6:
            raise ValueError("Use at most six plot series")
        count = 0
        for series in plot.get("series", []):
            if not isinstance(series, dict) or not isinstance(series.get("points"), list):
                raise ValueError("Each series needs a points list")
            if series.get("kind", "line") not in {"line", "bar", "scatter"}:
                raise ValueError("Plot kind must be line, bar or scatter")
            for point in series["points"]:
                if (
                    not isinstance(point, list)
                    or len(point) != 2
                    or any(
                        not isinstance(v, (int, float))
                        or isinstance(v, bool)
                        or not math.isfinite(v)
                        for v in point
                    )
                ):
                    raise ValueError("Plot points must be pairs of finite numbers")
            count += len(series["points"])
        if count > 10000:
            raise ValueError("Use at most 10000 plot points")
    table = value.get("table")
    if table is not None and (
        not isinstance(table, dict)
        or not isinstance(table.get("rows"), list)
        or not isinstance(table.get("columns"), list)
        or len(table["rows"]) > 200
        or len(table["columns"]) > 10
        or any(
            not isinstance(row, list) or len(row) != len(table["columns"]) for row in table["rows"]
        )
    ):
        raise ValueError("Use a rectangular table of at most 200 rows and 10 columns")
    return value


def execute(source, inputs, reference):
    """reference(parameters) runs BEFORE user code, on a fresh worker for each run."""
    if len(source) > 30000:
        raise ValueError("Source exceeds 30000 characters")
    parameters, baseline, reference_error = None, None, None
    try:
        parameters = literal_parameters(source)
        baseline = json_value(reference(copy.deepcopy(parameters)))
    except Exception as error:
        reference_error = str(error)
    stdout, stderr = BoundedOutput(), BoundedOutput()
    namespace = {"__name__": "__main__", "inputs": copy.deepcopy(inputs)}
    response = {
        "ok": False,
        "reference": baseline,
        "reference_error": reference_error,
        "parameters": parameters,
    }
    try:
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            exec(compile(source, "experiment.py", "exec"), namespace)
        result = validate_result(namespace.get("result"))
        actual_parameters = json_value(namespace.get("parameters"))
        response.update(ok=True, result=result, parameters=actual_parameters)
        if actual_parameters != parameters:
            response.update(reference=None, reference_error="parameters changed during execution")
    except BaseException as error:
        frames = [
            frame
            for frame in traceback.extract_tb(error.__traceback__)
            if frame.filename == "experiment.py"
        ]
        response["error"] = {
            "type": type(error).__name__,
            "message": str(error),
            "line": getattr(error, "lineno", None) or (frames[-1].lineno if frames else None),
            "traceback": "".join(traceback.format_exception(error))[-16000:],
        }
    response.update(
        stdout=stdout.getvalue(),
        stderr=stderr.getvalue(),
        stdout_truncated=stdout.truncated,
        stderr_truncated=stderr.truncated,
    )
    return response
