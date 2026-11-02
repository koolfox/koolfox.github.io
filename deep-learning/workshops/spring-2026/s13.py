import math

# پرس‌وجوی اول، سه کلید و سه مقدار دقیقاً از مثال صفحهٔ ۲۱ گرفته شده‌اند.
query = [1, 0, 2]
keys = [[0, 1, 1], [4, 4, 0], [2, 3, 1]]
values = [[1, 2, 3], [2, 8, 0], [2, 6, 3]]

# با True کردن این گزینه، تقسیم بر ریشهٔ بُعد کلیدِ صفحهٔ ۳۸ فعال می‌شود.
scaled = False
if not query or not keys or not values or not values[0]:
    raise ValueError("پرس‌وجو، کلیدها و مقدارها نباید خالی باشند.")
if any(len(key) != len(query) for key in keys) or len(keys) != len(values):
    raise ValueError("بُعد کلید باید با پرس‌وجو و تعداد کلیدها با مقدارها برابر باشد.")
if any(len(value) != len(values[0]) for value in values):
    raise ValueError("همهٔ بردارهای مقدار باید بُعد یکسان داشته باشند.")
if not all(math.isfinite(number) for row in [query] + keys + values for number in row):
    raise ValueError("همهٔ درایه‌های توجه باید عدد متناهی باشند.")
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
# تقریب چاپی فقط برای همان سه کلید/مقدار و پرس‌وجوی منبع تعریف شده است.
# پس از تغییر ورودی یا فعال‌کردن مقیاس، None یعنی این تقریب دیگر قابل انتساب نیست.
source_case = (
    query == [1, 0, 2]
    and keys == [[0, 1, 1], [4, 4, 0], [2, 3, 1]]
    and values == [[1, 2, 3], [2, 8, 0], [2, 6, 3]]
    and not scaled
)
slide_output = None
if source_case:
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
    # همین ورودی‌ها برای مقابلهٔ مستقلِ اجرای WebGPU استفاده می‌شوند.
    "gpu_inputs": {"query": query, "keys": keys, "values": values, "scaled": scaled},
}
print(result)
