# %% آماده‌سازی
# نصب در محیط پایتون: pip install torch==2.13.0 transformers==4.57.3 pillow==12.0.0
import io
import os
from urllib.request import urlopen

import torch
from PIL import Image

# برای اجرای آفلاین، MODEL_DIR را به پوشهٔ وزن‌ها و تنظیمات همان نسخه بدهید.
from transformers import ViTForImageClassification, ViTImageProcessor

REVISION = "3f49326eb077187dfe1c2a2bb15fbd74e6ab91e3"
model_dir = os.environ.get("MODEL_DIR", "google/vit-base-patch16-224")
IMAGE_URL = "https://raw.githubusercontent.com/scikit-image/scikit-image/e8a42ba85aaf5fd9322ef9ca51bc21063b22fcae/skimage/data/astronaut.png"

# %% تصویر و پیش‌پردازش
# IMAGE_PATH اختیاری است؛ پیش‌فرض عکس عمومی ناسا است.
image_path = os.environ.get("IMAGE_PATH")
image = Image.open(
    image_path if image_path else io.BytesIO(urlopen(IMAGE_URL).read())
).convert("RGB")
processor = ViTImageProcessor.from_pretrained(model_dir, revision=REVISION)
# این نسخه کل تصویر را به ۲۲۴×۲۲۴ تغییر اندازه می‌دهد؛ برش مرکزی ندارد.
inputs = processor(images=image, return_tensors="pt")
print("Input shape:", tuple(inputs["pixel_values"].shape))

# %% مدل و پیش‌بینی
# وزن‌های آمادهٔ همین نسخه بارگیری می‌شوند؛ این مرحله آموزش نیست.
model = ViTForImageClassification.from_pretrained(
    model_dir, revision=REVISION, attn_implementation="eager"
).eval()
with torch.inference_mode():
    logits = model(**inputs).logits[0]

# %% مشاهدهٔ پاسخ‌ها
# برچسب‌های پنج امتیاز برتر از تنظیمات خود مدل خوانده می‌شوند.
values, indices = logits.softmax(dim=-1).topk(5)
for value, index in zip(values, indices):
    print(model.config.id2label[index.item()], round(value.item(), 6))
