# %% آماده‌سازی
# نصب در محیط پایتون: pip install onnxruntime==1.23.2 numpy==2.3.5 pillow==12.0.0
import hashlib
import os
from pathlib import Path
from urllib.request import urlopen

import numpy as np
import onnxruntime as ort
from PIL import Image

URL = "https://media.githubusercontent.com/media/onnx/models/c5cae0f1942c8d7727372c7b1f6b485aa39e4421/validated/vision/classification/resnet/model/resnet152-v1-7.onnx"
MODEL_SHA = "b0ec92437bf8c9d0739bf9bafdea9638e13f9e3c1e2fb766ad546cc182fd3f6d"
model_path = Path(os.environ.get("MODEL_PATH", "resnet152-v1-7.onnx"))
if not model_path.exists():
    model_path.write_bytes(urlopen(URL).read())
if hashlib.sha256(model_path.read_bytes()).hexdigest() != MODEL_SHA:
    raise ValueError("وزن‌ها با نسخهٔ انتخاب‌شده یکسان نیستند.")

# %% ورودی عددی یا تصویر
# پیش‌فرض تنسور آزمون عددی مدل است؛ این ورودی عکس نیست.
INPUT_URL = "https://raw.githubusercontent.com/koolfox/koolfox.github.io/d360150de2a01bc328846ff35c26f5b6e36bd4d5/deep-learning/models/references/resnet152-input.float32.bin"
image_path = os.environ.get("IMAGE_PATH")
if image_path:
    image = Image.open(image_path).convert("RGB")
    width, height = image.size
    scale = 256 / min(width, height)
    image = image.resize(
        (round(width * scale), round(height * scale)), Image.Resampling.BILINEAR
    )
    left, top = (image.width - 224) // 2, (image.height - 224) // 2
    pixels = (
        np.asarray(image.crop((left, top, left + 224, top + 224)), dtype=np.float32)
        / 255
    )
    pixels = (pixels - np.array([0.485, 0.456, 0.406], dtype=np.float32)) / np.array(
        [0.229, 0.224, 0.225], dtype=np.float32
    )
    tensor = pixels.transpose(2, 0, 1)[None].copy()
else:
    input_path = os.environ.get("INPUT_PATH")
    data = Path(input_path).read_bytes() if input_path else urlopen(INPUT_URL).read()
    tensor = np.frombuffer(data, dtype="<f4").reshape(1, 3, 224, 224)

# %% اجرای مدل کامل روی CPU
# این همان وزن‌های MXNet ResNet152-v1 است؛ نسخهٔ torchvision-v1.5 نیست.
session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
logits = session.run(None, {session.get_inputs()[0].name: tensor})[0][0]

# %% مشاهدهٔ خروجی‌ها
# کم‌کردن بیشینه، محاسبهٔ نمایی softmax را از نظر عددی پایدار می‌کند.
probabilities = np.exp(logits - logits.max())
probabilities /= probabilities.sum()
for index in probabilities.argsort()[-5:][::-1]:
    print("Class index:", index, "probability:", round(float(probabilities[index]), 6))
