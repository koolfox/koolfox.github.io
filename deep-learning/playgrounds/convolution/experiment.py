"""این کد روی تصویر مصنوعی محاسبه می‌کند؛ آموزش فیلتر انجام نمی‌شود."""

from convolution_lab import correlate, pattern, pool  # عملیات واقعی و قابل‌ویرایش

# BEGIN CONFIG
CONFIG = {  # مقدار اولیهٔ کنترل‌ها؛ با هر تغییر خروجی دوباره محاسبه می‌شود
    "pattern": "vertical",  # تصویر ۸×۸ با یک لبهٔ عمودی
    "kernel": [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]],  # همین ۹ وزن در همهٔ پنجره‌ها مشترک‌اند
    "bias": 0.0,  # عددی که به مجموع ضرب‌های هر پنجره اضافه می‌شود
    "stride": 1,  # فاصلهٔ حرکت پنجره؛ گام بیشتر معمولاً خروجی کوچک‌تر می‌دهد
    "padding": 0,  # تعداد سطر/ستون صفر در هر طرف ورودی
    "flip": False,  # True هسته را برای convolution ریاضی ۱۸۰ درجه می‌چرخاند
    "relu": False,  # True مقدارهای منفی را بعد از فیلتر صفر می‌کند
    "pooling": "none",  # none، max یا average؛ اینجا پنجرهٔ تجمیع ۲×۲ است
}
# END CONFIG


def calculate(config):  # ورودی تابع، تنظیمات فعلی کنترل‌های کنار تصویر است
    image = pattern(config["pattern"])  # جدول عددهای تصویر را می‌سازیم
    raw = correlate(  # پنجره حرکت می‌کند و در هر خانه جمع وزن‌دار واقعی حساب می‌شود
        [image],  # یک کانال ورودی داریم
        [config["kernel"]],  # یک برش هسته برای همان کانال
        config["bias"],  # بایاس پس از جمع ضرب‌ها اضافه می‌شود
        config["stride"],  # گام حرکت روی تصویر
        config["padding"],  # حاشیهٔ صفر؛ تعداد وزن‌ها را عوض نمی‌کند
        config["flip"],  # قرارداد چرخاندن هسته
    )
    activated = [  # جدول خروجیِ بعد از تابع فعال‌سازی
        [max(0, value) if config["relu"] else value for value in row]  # ReLU یا عبور بدون تغییر
        for row in raw["output"]  # for سطرهای خروجیِ پیش از فعال‌سازی را پیمایش می‌کند
    ]
    pooled = (  # تجمیع بعد از فعال‌سازی انجام می‌شود؛ ترتیب عملیات مهم است
        pool(activated, mode=config["pooling"]) if config["pooling"] != "none" else None
    )
    return {"image": image, "raw": raw, "activated": activated, "pooled": pooled}  # نتیجهٔ همین کد برای نمودارها

# «جمع ضرب‌ها»: در correlate می‌توان خود value * weight و جمع + bias را تغییر داد.
# «تجمیع»: pool بیشینه یا میانگین هر پنجره را می‌سازد؛ عوض‌کردنش خروجی آخر را تغییر می‌دهد.
