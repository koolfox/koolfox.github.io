"""Independent perceptron update; source pages 25–30 explain this rule.

All data here are a deliberately small synthetic example. No third-party
framework is needed. Modify target and learning_rate to inspect one update.
"""

# وزن‌های اولیه صفرند؛ یکی را تغییر بده و اثرش را بر امتیاز اولیه ببین.
weights = [0.0, 0.0]
# بایاس مستقل از ورودی به امتیاز اضافه می‌شود.
bias = 0.0
# دو ویژگیِ یک نمونهٔ ساختگی؛ هدف، خروجی درست همین نمونه است.
sample = [1.0, 2.0]
# target را به 1 تغییر بده؛ در نسخهٔ اولیه دیگر خطایی رخ نمی‌دهد.
target = -1
# نرخ یادگیری اندازهٔ گام است؛ دوبرابرکردنش delta را دوبرابر می‌کند.
learning_rate = 0.1


def predict(values, coefficients, intercept):
    # ضرب هر ویژگی در وزنش، جمع آن‌ها و سپس افزودن بایاس.
    score = sum(x * w for x, w in zip(values, coefficients)) + intercept
    # مطابق قرارداد منبع، امتیاز صفر هم +1 پیش‌بینی می‌کند؛ >= را با > مقایسه کن.
    return 1 if score >= 0 else -1


# ابتدا پیش‌بینی را با پارامترهای قدیمی حساب کن.
before = predict(sample, weights, bias)
# فقط اختلاف هدف و پیش‌بینی، علامت و مقدار تصحیح را تعیین می‌کند.
delta = learning_rate * (target - before)
# وزن‌های اولیه صفرند؛ یکی را تغییر بده و اثرش را بر امتیاز اولیه ببین.
# هر وزن به نسبت ویژگیِ متناظر تغییر می‌کند.
weights = [w + delta * x for w, x in zip(weights, sample)]
# بایاس مانند وزنی با ورودی همیشگی 1 به‌روزرسانی می‌شود.
bias += delta
# خروجی را قبل و بعد از تصحیح مقایسه کن.
result = {
    "before": before,
    "delta": delta,
    "weights": weights,
    "bias": bias,
    "after": predict(sample, weights, bias),
}
