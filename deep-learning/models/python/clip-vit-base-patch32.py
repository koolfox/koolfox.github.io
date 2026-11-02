# %% آماده‌سازی
# نصب در محیط پایتون: pip install torch==2.13.0 transformers==4.57.3 pillow==12.0.0
import io
import os
from urllib.request import urlopen

import torch
from PIL import Image

# برای اجرای آفلاین، MODEL_DIR را به پوشهٔ وزن‌ها و تنظیمات همان نسخه بدهید.
from transformers import CLIPImageProcessor, CLIPModel, CLIPTokenizerFast

REVISION = "3d74acf9a28c67741b2f4f2ea7635f0aaf6f0268"
model_dir = os.environ.get("MODEL_DIR", "openai/clip-vit-base-patch32")
# عکس مقالهٔ Radford و همکاران (۲۰۲۱)، CC BY 4.0؛ همان مثال اسلاید ۴۰.
IMAGE_URL = "https://raw.githubusercontent.com/koolfox/koolfox.github.io/0c177f460e1634454351e4c9eaedb0f9515a1c16/deep-learning/models/references/clip-source-dog.png"

# %% تصویر و چهار متن
image_path = os.environ.get("IMAGE_PATH")
image = Image.open(
    image_path if image_path else io.BytesIO(urlopen(IMAGE_URL).read())
).convert("RGB")
prompts = [
    "A photo of a plane.",
    "A photo of a car.",
    "A photo of a dog.",
    "A photo of a bird.",
]
processor = CLIPImageProcessor.from_pretrained(model_dir, revision=REVISION)
tokenizer = CLIPTokenizerFast.from_pretrained(model_dir, revision=REVISION)
# هر متن تا ۷۷ توکن پُر می‌شود؛ متن بلندتر را قطع نمی‌کنیم.
inputs = tokenizer(
    prompts, padding="max_length", max_length=77, truncation=False, return_tensors="pt"
)
if inputs["input_ids"].shape[1] > 77:
    raise ValueError("هر متن باید حداکثر ۷۷ توکن داشته باشد.")
inputs.update(processor(images=image, return_tensors="pt"))

# %% رمزگذاری تصویر و متن
# هر دو رمزگذار کامل اجرا می‌شوند؛ هیچ وزنی در این کد آموزش نمی‌بیند.
model = CLIPModel.from_pretrained(
    model_dir, revision=REVISION, attn_implementation="eager"
).eval()
with torch.inference_mode():
    output = model(**inputs)
# بردارها نرمال شده‌اند؛ ضرب داخلی آن‌ها همان شباهت کسینوسی است.
cosines = (output.image_embeds @ output.text_embeds.T)[0]
probabilities = output.logits_per_image[0].softmax(dim=-1)

# %% مشاهدهٔ پاسخ‌ها
# احتمال فقط بین همین چهار گزینه نسبی است؛ دقت بنچمارک محسوب نمی‌شود.
for prompt, cosine, probability in zip(prompts, cosines, probabilities):
    print(
        prompt,
        "cosine:",
        round(cosine.item(), 6),
        "probability:",
        round(probability.item(), 6),
    )
