"""Re-run the released MXNet Gluon ResNet-v1 graph in its original framework.

On Apple Silicon, MXNet1.9.1's published macOS wheel requires a separate x86_64
Python3.9 process (Rosetta), NumPy1.23.5, ONNX1.14.1 and protobuf3.20.3.
This imports the exact verified ONNX initializers; no substitute weights or
architecture are downloaded. Run after prepare_references.py.
"""

from pathlib import Path
import hashlib
import json
import numpy as np
import mxnet as mx

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "results/model-validation/cache/resnet152-v1-7/resnet152-v1-7.onnx"
assert (
    hashlib.sha256(path.read_bytes()).hexdigest()
    == "b0ec92437bf8c9d0739bf9bafdea9638e13f9e3c1e2fb766ad546cc182fd3f6d"
)
reference = json.loads((ROOT / "models/references/resnet152.json").read_text())
x = np.fromfile(
    ROOT / "models/references/resnet152-input.float32.bin", dtype="<f4"
).reshape(1, 3, 224, 224)
symbol, arguments, auxiliary = mx.contrib.onnx.import_model(str(path))
module = mx.mod.Module(
    symbol=symbol, context=mx.cpu(), data_names=["data"], label_names=None
)
module.bind(for_training=False, data_shapes=[("data", x.shape)], label_shapes=None)
module.set_params(arguments, auxiliary, allow_missing=False, allow_extra=False)
module.forward(mx.io.DataBatch([mx.nd.array(x)]))
y = module.get_outputs()[0].asnumpy().reshape(-1)
expected = np.asarray(reference["output"])
np.testing.assert_allclose(y, expected, atol=3e-5, rtol=3e-5)
report = {
    "framework": "MXNet",
    "version": mx.__version__,
    "numpy": np.__version__,
    "context": "CPU",
    "reconstruction": "MXNet official ONNX importer, exact released initializers",
    "compared_outputs": y.size,
    "max_absolute_error": float(np.max(np.abs(y - expected))),
}
(ROOT / "results/model-validation/resnet-original-mxnet-cpu.json").write_text(
    json.dumps(report, indent=2) + "\n"
)
print(json.dumps(report, indent=2))
