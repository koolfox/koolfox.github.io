import math

# بردار رمزگشا عین مثال صفحهٔ ۲۸ است؛ تغییر هر مؤلفه، امتیاز ورودی‌ها را عوض می‌کند.
query = [1, 0, 0, 2]

# چهار حالت پنهانِ ورودی را از صفحات ۲۸ تا ۳۱، به همین ترتیب، نگه می‌داریم.
inputs = [[0, 0, 1, 1], [0, 1, 0, 0], [1, 1, 0, 1], [1, 0, 0, 1]]


def dot(first, second):
    # ضرب داخلی: مؤلفه‌های متناظر را ضرب و همهٔ حاصل‌ضرب‌ها را جمع می‌کنیم.
    return sum(a * b for a, b in zip(first, second))


def softmax(scores):
    # کم‌کردن بزرگ‌ترین امتیاز از همه، نسبت احتمال‌ها را ثابت و محاسبه را پایدار می‌کند.
    largest = max(scores)
    exponentials = [math.exp(score - largest) for score in scores]
    # هر نمایی بر جمع نماها تقسیم می‌شود تا مجموع وزن‌ها برابر یک باشد.
    total = sum(exponentials)
    return [value / total for value in exponentials]


# ابتدا انتظار می‌رود امتیازها مانند صفحهٔ ۳۲ برابر [2, 0, 3, 3] باشند.
scores = [dot(query, item) for item in inputs]
weights = softmax(scores)

# فرمول صفحهٔ ۲۶: برای هر مؤلفه، مجموع وزن‌دارِ چهار حالت ورودی را می‌سازیم.
context = [
    sum(weight * item[column] for weight, item in zip(weights, inputs))
    for column in range(len(query))
]

# وزن‌های کامل را نگه می‌داریم؛ عددهای دو رقمی روی اسلاید گرد شده‌اند.
result = {
    "scores": scores,
    "weights": weights,
    "weight_sum": sum(weights),
    "context": context,
    "most_influential_inputs": [
        index + 1 for index, score in enumerate(scores) if score == max(scores)
    ],
}
print(result)
