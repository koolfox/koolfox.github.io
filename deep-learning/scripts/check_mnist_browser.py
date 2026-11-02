"""Check the browser's initial CNN against independent PyTorch inference.

The UI acceptance runner saves actual initial weights and gallery probabilities.
Map HWIO→OIHW conv kernels and IO→OI dense weights. The student model explicitly
preserves NHWC flatten order, so the same model can be compared without a hidden
feature permutation. This is inference agreement, not identical training RNGs.
"""

import argparse
import ast
import json
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument(
    "--evidence", type=Path, default=ROOT / "results/mnist-browser/ui-evidence.json"
)
args = parser.parse_args()
evidence = json.loads(args.evidence.read_text())
source = ast.parse((ROOT / "labs/cnn-mnist/browser_train.py").read_text())
classes = [
    node
    for node in source.body
    if isinstance(node, ast.ClassDef) and node.name == "CNN"
]
namespace = {"torch": torch, "nn": torch.nn}
exec(
    compile(ast.Module(body=classes, type_ignores=[]), "browser_train.py", "exec"),
    namespace,
)
model = namespace["CNN"](evidence["before"]["config"]["activation"])
weights = evidence["before"]["weights"]
with torch.no_grad():
    for layer, offset in [(model.conv1, 0), (model.conv2, 2)]:
        kernel = torch.tensor(weights[offset]["values"]).reshape(
            weights[offset]["shape"]
        )
        layer.weight.copy_(kernel.permute(3, 2, 0, 1))
        layer.bias.copy_(torch.tensor(weights[offset + 1]["values"]))
    model.classifier.weight.copy_(
        torch.tensor(weights[4]["values"]).reshape(weights[4]["shape"]).T
    )
    model.classifier.bias.copy_(torch.tensor(weights[5]["values"]))
    pixels = torch.frombuffer(
        bytearray((ROOT / "data/processed/mnist-browser/pixels.bin").read_bytes()),
        dtype=torch.uint8,
    )
    pixels = pixels.reshape(2500, 28, 28, 1)
    indices = torch.tensor([2000 + i for i in evidence["before"]["gallery"]])
    x = pixels[indices].permute(0, 3, 1, 2).float() / 255
    probabilities = torch.softmax(model(x), dim=1)
expected = torch.tensor(evidence["before"]["view"]["predictions"]).reshape(20, 10)
torch.testing.assert_close(probabilities, expected, atol=2e-6, rtol=2e-5)
report = {
    "framework": "PyTorch",
    "version": torch.__version__,
    "mapped_same_initial_weights": True,
    "compared_probabilities": probabilities.numel(),
    "max_absolute_error": (probabilities - expected).abs().max().item(),
    "parameters": sum(parameter.numel() for parameter in model.parameters()),
}
output = ROOT / "results/mnist-browser/pytorch-comparison.json"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
