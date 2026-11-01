"""Execute a short notebook prefix inside the browser's existing Python worker."""

import contextlib
import hashlib
import io
import json
import sys
import traceback
from copy import deepcopy


def equivalent_configuration(lab, left, right):
    left, right = deepcopy(left), deepcopy(right)
    for config in (left, right):
        if lab == "neuron-xor" and config.get("model") != "mlp":
            config["hidden"] = 1
        if lab == "network-playground":
            if not config.get("hidden"):
                config["activation"] = "tanh"
            if config.get("regularization") == "none":
                config["regularization_rate"] = 0.0
    return left == right


def execute_cells(cells, until, namespace):
    """Restart the namespace each time so earlier edits cannot leave hidden state."""
    if not isinstance(cells, list) or not 1 <= len(cells) <= 12:
        raise ValueError("Notebook needs between one and twelve cells")
    if type(until) is not int or not 0 <= until < len(cells):
        raise ValueError("Choose a valid cell")
    if any(not isinstance(c.get("source"), str) for c in cells):
        raise ValueError("Every cell needs Python source")
    if sum(len(c["source"]) for c in cells) > 50000:
        raise ValueError("Notebook code exceeds 50000 characters")
    scope = dict(namespace)
    scope["__name__"] = "__main__"
    outputs = []
    sources = []
    for index, cell in enumerate(cells[: until + 1]):
        stream = io.StringIO()
        sources.append(cell["source"])
        try:
            with contextlib.redirect_stdout(stream), contextlib.redirect_stderr(stream):
                exec(compile(cell["source"], f"cell_{index + 1}.py", "exec"), scope)
            result = scope.get("result")
            if result is not None:
                encoded = json.dumps(result, allow_nan=False)
                if len(encoded) > 100000:
                    raise ValueError("Result exceeds 100000 characters")
            outputs.append({"index": index, "stdout": stream.getvalue()[:20000], "result": deepcopy(result)})
        except Exception:
            outputs.append({"index": index, "stdout": stream.getvalue()[:20000],
                            "error": traceback.format_exc(limit=5)[-12000:]})
            return {"ok": False, "outputs": outputs}, None
    record = {"ok": True, "outputs": outputs, "executed_cells": until + 1,
              "source_sha256": hashlib.sha256("\n".join(sources).encode()).hexdigest(),
              "python": sys.version.split()[0]}
    return record, scope


