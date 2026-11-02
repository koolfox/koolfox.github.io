# %% آماده‌سازی
# نصب در محیط پایتون: pip install torch==2.13.0 transformers==4.57.3 pillow==12.0.0
import os

import torch

# برای اجرای آفلاین، MODEL_DIR را به پوشهٔ وزن‌ها و تنظیمات همان نسخه بدهید.
from transformers import BertForMaskedLM, BertTokenizer

REVISION = "86b5e0934494bd15c9632b12f734a8a67f723594"
model_dir = os.environ.get("MODEL_DIR", "google-bert/bert-base-uncased")

# %% متن و توکن‌ها
# دو جمله، دو قطعهٔ مجزا هستند؛ [MASK] همان جای خالی اسلاید است.
text = "I arrived at the bank [MASK] crossing the river."
text_pair = "My pants were wet."
tokenizer = BertTokenizer.from_pretrained(model_dir, revision=REVISION)
inputs = tokenizer(
    text,
    text_pair,
    return_tensors="pt",
    padding="max_length",
    max_length=128,
    truncation=False,
)
if inputs["input_ids"].shape[1] > 128:
    raise ValueError("متن باید حداکثر ۱۲۸ توکن داشته باشد.")
mask_positions = (inputs["input_ids"][0] == tokenizer.mask_token_id).nonzero().flatten()
print(tokenizer.convert_ids_to_tokens(inputs["input_ids"][0]))

# %% مدل و پیش‌بینی
# eval رفتار آموزش مانند dropout را غیرفعال می‌کند؛ وزن‌ها تغییر نمی‌کنند.
model = BertForMaskedLM.from_pretrained(
    model_dir, revision=REVISION, attn_implementation="eager"
).eval()
with torch.inference_mode():
    logits = model(**inputs).logits[0]

# %% مشاهدهٔ پاسخ‌ها
# softmax امتیاز هر واژه را به احتمال نسبی در واژگان تبدیل می‌کند.
for position in mask_positions:
    probabilities = logits[position].softmax(dim=-1)
    values, indices = probabilities.topk(5)
    for value, index in zip(values, indices):
        print(tokenizer.convert_ids_to_tokens(index.item()), round(value.item(), 6))
