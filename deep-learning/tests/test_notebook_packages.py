"""Optional installation must keep the offline runtime channel intact."""

import importlib.util
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch


class PackageChannelTests(unittest.IsolatedAsyncioTestCase):
    async def check_channel(self, fail):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = Path(__file__).resolve().parents[1] / "assets/notebook_support.py"
            (root / "support.py").write_bytes(source.read_bytes())
            (root / "notebook-package-index.json").write_text(json.dumps({"packages": {
                "micropip": {"depends": []}, "openblas": {"depends": []},
                "scikit-learn": {"depends": ["openblas"], "version": "1.6.1"},
            }}))
            spec = importlib.util.spec_from_file_location("package_support_test", root / "support.py")
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            config = types.SimpleNamespace(indexURL="http://localhost/offline/")
            calls = []

            async def load(names):
                calls.append((names, config.indexURL))

            async def install(requirements):
                if fail:
                    raise RuntimeError("download failed")

            bridge = types.ModuleType("pyodide_js")
            bridge._api = types.SimpleNamespace(config=config)
            bridge.version = "0.27.7"
            bridge.loadPackage = load
            ffi = types.ModuleType("pyodide.ffi")
            ffi.to_js = lambda value: value
            micropip = types.ModuleType("micropip")
            micropip.install = install
            with patch.dict(sys.modules, {"pyodide_js": bridge, "pyodide.ffi": ffi, "micropip": micropip}), patch.object(module.importlib.metadata, "version", return_value="1.6.1"):
                if fail:
                    with self.assertRaisesRegex(RuntimeError, "download failed"):
                        await module.install_packages(["scikit-learn"])
                else:
                    self.assertEqual(await module.install_packages(["scikit-learn"]), ["scikit-learn==1.6.1"])
            self.assertEqual(config.indexURL, "http://localhost/offline/")
            self.assertEqual(calls, [(["micropip", "openblas", "scikit-learn"], "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/")])

    async def test_binary_dependency_uses_pinned_channel_and_restores_offline_base(self):
        await self.check_channel(False)

    async def test_failed_install_also_restores_offline_base(self):
        await self.check_channel(True)
