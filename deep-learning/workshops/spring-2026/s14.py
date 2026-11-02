# اندازهٔ تصویر از مثال صفحهٔ ۵۴ است؛ بزرگ‌ترشدن ابعاد تعداد توکن‌ها را زیاد می‌کند.
height = 160
width = 160

# وصلهٔ ۱۶×۱۶ همان اندازهٔ منبع است؛ دوبرابرکردن ضلع، تعداد وصله‌ها را یک‌چهارم می‌کند.
patch_side = 16

# برای این مثال ساده، تصویر باید دقیقاً به وصله‌های بدون هم‌پوشانی تقسیم شود.
if any(type(value) is not int or value < 1 for value in (height, width, patch_side)):
    raise ValueError("ابعاد تصویر و ضلع وصله باید عدد صحیح مثبت باشند.")
if height % patch_side or width % patch_side:
    raise ValueError("ابعاد تصویر باید بر ضلع وصله بخش‌پذیر باشند.")

# شمار پیکسل‌ها تعداد توکن‌ها در حالتِ یک توکن برای هر پیکسل است.
pixel_tokens = height * width

# تعداد وصله‌ها از ضرب تعداد ردیف‌ها در ستون‌های وصله به دست می‌آید.
patch_rows = height // patch_side
patch_columns = width // patch_side
patch_tokens = patch_rows * patch_columns

# یک سر توجه، برای همهٔ زوج‌های مرتب توکن یک امتیاز می‌سازد؛ خودِ توکن هم شمرده می‌شود.
pixel_pairs = pixel_tokens ** 2
patch_pairs = patch_tokens ** 2

# توکن دستهٔ CLS در شکلِ ViT یک ورودی اضافه است؛ هزینهٔ آن را جدا محاسبه می‌کنیم.
with_cls_tokens = patch_tokens + 1
with_cls_pairs = with_cls_tokens ** 2

# مثال بزرگ صفحهٔ ۵۳ را مستقل از تصویر کوچک، دقیقاً با ابعاد چاپ‌شده حساب می‌کنیم.
full_hd_pairs = (1920 * 1080) ** 2

# این‌ها شمار امتیازهای توجه‌اند؛ تعداد کل عملیات یک مدل کامل را بیان نمی‌کنند.
result = {
    "pixel_tokens": pixel_tokens,
    "patch_tokens": patch_tokens,
    "pixel_pairs": pixel_pairs,
    "patch_pairs": patch_pairs,
    "reduction_factor_without_cls": pixel_pairs // patch_pairs,
    "with_cls_pairs": with_cls_pairs,
    "full_hd_pixel_pairs": full_hd_pairs,
}
print(result)
