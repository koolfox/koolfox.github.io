"""Same small CNN and MNIST subset as the browser laboratory.

Run: python browser_train.py --download
PyTorch executes this Python file. The browser uses TensorFlow.js, not Python.
Both use the same images, pixel scale, topology, activation and Adam settings.
Their random initializers and shuffle generators differ; scores need not match.
"""

import argparse
import hashlib
import json
from pathlib import Path
import urllib.request

import torch
from torch import nn

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--data-dir", type=Path, default=Path("mnist-browser-data"))
parser.add_argument("--download", action="store_true")
parser.add_argument("--epochs", type=int, default=3)
parser.add_argument("--batch-size", type=int, choices=[16, 32, 64], default=32)
parser.add_argument("--learning-rate", type=float, default=0.001)
parser.add_argument("--activation", choices=["relu", "tanh", "sigmoid"], default="relu")
args = parser.parse_args()
if not 1 <= args.epochs <= 20 or not 0.0001 <= args.learning_rate <= 0.05:
    parser.error("Choose epochs1..20 and learning rate0.0001..0.05")

# Download only when explicitly requested. Check the same pinned image bytes.
base = "https://koolfox.github.io/deep-learning/data/processed/mnist-browser/"
expected = {
    "pixels.bin": "297ecb4f442d4af8b8ac0e8b73ded44d38b28331ee1d2ffe736a0e9a4b87d2bc",
    "labels.bin": "44fc29d5c91e0fdabebca4e826b9d450ba4e26c87b9dc0ad46e32e4c8ac88896",
}
args.data_dir.mkdir(parents=True, exist_ok=True)
files = {}
for name, checksum in expected.items():
    path = args.data_dir / name
    if not path.exists() and args.download:
        path.write_bytes(urllib.request.urlopen(base + name, timeout=120).read())
    payload = path.read_bytes()
    if hashlib.sha256(payload).hexdigest() != checksum:
        raise ValueError("Dataset checksum mismatch: " + name)
    files[name] = payload

# %% داده‌ها
# پیکسل‌ها را به بازهٔ صفر تا یک می‌بریم؛ اعتبارسنجی وارد بهینه‌ساز نمی‌شود.
x = torch.frombuffer(bytearray(files["pixels.bin"]), dtype=torch.uint8)
x = x.reshape(2500, 1, 28, 28).float() / 255
labels = torch.tensor(list(files["labels.bin"]), dtype=torch.long)
train_x, validation_x = x[:2000], x[2000:]
train_y, validation_y = labels[:2000], labels[2000:]
torch.manual_seed(7)
torch.set_num_threads(4)


# %% مدل
class CNN(nn.Module):
    def __init__(self, activation):
        super().__init__()
        # دو لایهٔ کانولوشن (Convolution) الگوهای مکانی را یاد می‌گیرند.
        self.conv1 = nn.Conv2d(1, 8, 3, padding=1)
        self.conv2 = nn.Conv2d(8, 16, 3, padding=1)
        self.pool = nn.MaxPool2d(2)
        self.activation = {"relu": nn.ReLU, "tanh": nn.Tanh, "sigmoid": nn.Sigmoid}[
            activation
        ]()
        self.classifier = nn.Linear(7 * 7 * 16, 10)

    def forward(self, images):
        values = self.pool(self.activation(self.conv1(images)))
        values = self.pool(self.activation(self.conv2(values)))
        # برای یکسان‌بودن ترتیب با مرورگر، پیش از تخت‌کردن (Flatten) به NHWC می‌رویم.
        values = values.permute(0, 2, 3, 1).reshape(-1, 7 * 7 * 16)
        return self.classifier(values)


model = CNN(args.activation)
# زیان آنتروپی متقاطع (Cross-entropy) خودش Softmax دارد؛ دوباره اعمالش نمی‌کنیم.
loss_function = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=args.learning_rate, eps=1e-7)
# %% یادگیری در یک دوره


def train_one_epoch():
    # ترتیب نمونه‌ها را عوض می‌کنیم تا آموزش به یک ترتیب ثابت وابسته نباشد.
    order = torch.randperm(2000)
    total_loss = 0.0
    for start in range(0, 2000, args.batch_size):
        indices = order[start : start + args.batch_size]
        optimizer.zero_grad()  # گرادیان‌های دستهٔ قبلی را پاک می‌کنیم.
        logits = model(train_x[indices])  # عبور روبه‌جلو (Forward pass).
        loss = loss_function(logits, train_y[indices])
        loss.backward()  # پس‌انتشار (Backpropagation)، گرادیان وزن‌ها را می‌دهد.
        optimizer.step()  # Adam با نرخ یادگیری انتخاب‌شده وزن‌ها را تغییر می‌دهد.
        total_loss += loss.item() * len(indices)
    return total_loss / 2000


# %% اجرای دوره‌ها و اعتبارسنجی
for epoch in range(args.epochs):
    training_loss = train_one_epoch()
    # این تصاویر در یادگیری شرکت نکرده‌اند؛ در این بخش وزن‌ها تغییر نمی‌کنند.
    with torch.no_grad():
        logits = model(validation_x)
        validation_loss = loss_function(logits, validation_y).item()
        accuracy = (logits.argmax(dim=1) == validation_y).float().mean().item()
    print(
        json.dumps(
            {
                "epoch": epoch + 1,
                "training_loss": training_loss,
                "validation_loss": validation_loss,
                "validation_accuracy": accuracy,
            }
        )
    )
