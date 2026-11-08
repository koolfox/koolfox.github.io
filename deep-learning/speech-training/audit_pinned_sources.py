"""Static integrity checks only; this does not execute or certify model code."""

import argparse
import ast
import hashlib
import json
from pathlib import Path


MODEL_REVISION = "bcca4112db62fccaf733772226d4f9931a088a0a"
UPSTREAM_REVISION = "07e40f5d0b03fc473635ef378654bfb581027ac3"
MODEL_FILES = {
    "configuration_arktts.py": "27fa4fd4073ef1983a48919a4562300cace84687335035a9b9a077966e1ac04e",
    "modeling_arktts.py": "b320b6c875e6a57afb9745cc98fc72c116d9df6b3bf20d092a5ad3095026911f",
    "modeling_arktts_codec.py": "e1d6b0e1ef1e9ad303dc01d45d86229cf7f2e98d06a7b426234a7e4d7e3ede68",
    "processing_arktts.py": "eba6ecb6b7f0e221bcd19c5e3fe5978e677faf6b362912ff4febc08c3dc7f9df",
    "config.json": "92e19f10edb6c79ef2ccf4aebe218baa2c12743d648d75238041eca39439f8d3",
}
UPSTREAM_FILES = {
    "audio8_tts_data.py": "7d17291f930464b72dd8a1eb0d40dccd5d6678cb8fd273fd38ecd55e0c40f5b4",
    "audio8_tts_sft.py": "b2096da46dde83049074b45ae43a3501ca15a29e46f0fa50eeca98b310365d14",
}
WEIGHTS = {
    "model.safetensors": "e0540b75b39171ace3942ddca063a0c8881a66da97ce3eecae1a5bd4aa55fa4c",
    "codec.pth": "c310505aa11fe2f6cc63b8d3130dc7e77e73227774f5c62575769b1f47a8d048",
}
BLOCKED_IMPORTS = {"subprocess", "socket", "requests", "urllib", "pickle", "importlib"}
BLOCKED_CALLS = {"exec", "eval", "__import__", "os.system", "os.popen"}


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def audit_python(path):
    findings = []
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            names = [alias.name.split(".")[0] for alias in node.names] if isinstance(node, ast.Import) else [(node.module or "").split(".")[0]]
            findings.extend(f"blocked import {name} at line {node.lineno}" for name in names if name in BLOCKED_IMPORTS)
        if not isinstance(node, ast.Call):
            continue
        name = ast.unparse(node.func)
        if name in BLOCKED_CALLS:
            findings.append(f"blocked call {name} at line {node.lineno}")
        if name == "torch.load":
            safe = any(arg.arg == "weights_only" and isinstance(arg.value, ast.Constant) and arg.value.value is True for arg in node.keywords)
            if not safe:
                findings.append(f"torch.load without weights_only=True at line {node.lineno}")
    return findings


def audit(model_dir, upstream_dir, include_weights=False):
    checked = []
    for directory, files in ((model_dir, MODEL_FILES), (upstream_dir, UPSTREAM_FILES)):
        for filename, expected in files.items():
            path = directory / filename
            if sha256(path) != expected:
                raise ValueError(f"SHA-256 mismatch: {filename}")
            issues = audit_python(path) if path.suffix == ".py" else []
            if issues:
                raise ValueError(f"{filename}: {'; '.join(issues)}")
            checked.append(filename)
    if include_weights:
        for filename, expected in WEIGHTS.items():
            if sha256(model_dir / filename) != expected:
                raise ValueError(f"SHA-256 mismatch: {filename}")
            checked.append(filename)
    return {"model_revision": MODEL_REVISION, "upstream_revision": UPSTREAM_REVISION,
            "checked_files": checked, "weights_checked": include_weights,
            "limitation": "Static checks are incomplete and do not prove code or pickle safety. No code was executed."}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-dir", required=True, type=Path)
    parser.add_argument("--upstream-dir", required=True, type=Path)
    parser.add_argument("--include-weights", action="store_true")
    args = parser.parse_args()
    print(json.dumps(audit(args.model_dir, args.upstream_dir, args.include_weights), indent=2))
