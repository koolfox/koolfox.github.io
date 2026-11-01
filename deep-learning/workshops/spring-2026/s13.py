"""کارگاه تألیفیِ صفحات ۲۷ تا ۲۹ و ۳۸: توجه دقیق در برابر تقریب اسلاید."""
import math

# پرس‌وجوی اول، سه کلید و سه مقدار دقیقاً از مثال صفحهٔ ۲۱ گرفته شده‌اند.
query = [1, 0, 2]
keys = [[0, 1, 1], [4, 4, 0], [2, 3, 1]]
values = [[1, 2, 3], [2, 8, 0], [2, 6, 3]]

# با True کردن این گزینه، تقسیم بر ریشهٔ بُعد کلیدِ صفحهٔ ۳۸ فعال می‌شود.
scaled = False
scale = math.sqrt(len(query)) if scaled else 1.0

# ضرب داخلی ارتباط پرس‌وجو با هر کلید را می‌سنجد؛ تغییر query رتبه‌ها را عوض می‌کند.
scores = [sum(q * k for q, k in zip(query, key)) / scale for key in keys]

# کم‌کردن بیشینه، سافت‌مکس را بدون تغییر نسبت‌ها پایدار می‌کند.
exponentials = [math.exp(score - max(scores)) for score in scores]
total = sum(exponentials)
weights = [item / total for item in exponentials]

# مجموع وزن‌دار مقدارها بازنمایی تازهٔ همان یک توکن را می‌سازد.
output = [
    sum(weight * value[column] for weight, value in zip(weights, values))
    for column in range(len(values[0]))
]

# اعداد نمایشی صفحهٔ ۲۸ را جدا نگه می‌داریم؛ آن‌ها سافت‌مکس دقیق نیستند.
slide_weights = [0.0, 0.5, 0.5]
slide_output = [
    sum(weight * value[column] for weight, value in zip(slide_weights, values))
    for column in range(len(values[0]))
]

# نتیجه هم محاسبهٔ کامل و هم خروجی حاصل از تقریبِ منبع را برای مقایسه نشان می‌دهد.
result = {
    "scores": scores,
    "weights": weights,
    "weight_sum": sum(weights),
    "output": output,
    "slide_approximation_output": slide_output,
}
print(result)
