"""Local Python analysis and optional browser-compatible dependencies."""

import importlib.metadata
import json
import re
from pathlib import Path


def complete_python(source, line, column):
    """Jedi analyzes the notebook without executing its cells."""
    import jedi

    if not isinstance(source, str) or len(source) > 50000:
        return []
    result = []
    for item in jedi.Script(source, path="/home/pyodide/notebook.py").complete(line, column)[:100]:
        result.append({"label": item.name, "type": {
            "function": "function", "class": "class", "module": "namespace",
            "keyword": "keyword", "param": "variable",
        }.get(item.type, "variable"), "detail": item.description[:120]})
    return result


def validate_packages(requirements):
    if not isinstance(requirements, list) or not 1 <= len(requirements) <= 12:
        raise ValueError("از یک تا دوازده نام بسته وارد کن.")
    pattern = r"[A-Za-z0-9][A-Za-z0-9_.-]*(?:==[A-Za-z0-9][A-Za-z0-9_.+!-]*)?"
    if any(not isinstance(item, str) or len(item) > 120 or not re.fullmatch(pattern, item) for item in requirements):
        raise ValueError("نام بسته یا نام==نسخه وارد کن؛ مانند numpy یا rich==14.0.0.")
    return requirements


async def install_packages(requirements):
    """Use the pinned Pyodide channel, then micropip for compatible PyPI wheels."""
    requirements = validate_packages(requirements)
    from pyodide.ffi import to_js
    from pyodide_js import loadPackage, version, _api

    if version != "0.27.7":
        raise RuntimeError("نصب بسته به محیط قفل‌شدهٔ Pyodide 0.27.7 نیاز دارد.")

    catalog = json.loads(Path(__file__).with_name("notebook-package-index.json").read_text())["packages"]
    needed = set()

    def add(name):
        if name in needed or name not in catalog:
            return
        needed.add(name)
        for dependency in catalog[name]["depends"]:
            add(dependency)

    add("micropip")
    for requirement in requirements:
        name, _, version = requirement.partition("==")
        name = re.sub(r"[-_.]+", "-", name).lower()
        if name in catalog and (not version or version == catalog[name]["version"]):
            add(name)
    base = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/"
    # In pinned 0.27.7, package URLs accept wheels but not shared-library ZIPs
    # such as OpenBLAS. Use the normal name/dependency/integrity loader with
    # its channel temporarily pointed at the matching CDN; restore on failure.
    previous_base = _api.config.indexURL
    try:
        _api.config.indexURL = base
        await loadPackage(to_js(sorted(needed)))
        import micropip

        await micropip.install(requirements)
    finally:
        _api.config.indexURL = previous_base
    return [item.split("==")[0] + "==" + importlib.metadata.version(item.split("==")[0]) for item in requirements]
