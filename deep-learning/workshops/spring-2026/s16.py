# توان‌های مثبتِ قدرمطلق از سه نمودار صفحهٔ ۱۳ گرفته شده‌اند.
exponents = {"compute": 0.050, "data": 0.095, "parameters": 0.076}

# هر ضریب، فقط یک منبع را نسبت به مبنا بزرگ می‌کند؛ مدلِ مشترک سه منبع نداریم.
factors = [1, 4, 16]

# در L=A*x**(-alpha)، تقسیم بر زیان مبنا A را حذف می‌کند.
loss_ratios = {
    name: [factor ** (-alpha) for factor in factors]
    for name, alpha in exponents.items()
}

# کاهش نسبی را به درصد تبدیل می‌کنیم؛ این مقدار با خودِ نسبت زیان فرق دارد.
percent_reductions = {
    name: [100 * (1 - ratio) for ratio in ratios]
    for name, ratios in loss_ratios.items()
}

# مثال صفحهٔ ۱۱ توان مثبتِ نیم دارد؛ چهاربرابرشدن ورودی، خروجی را دوبرابر می‌کند.
positive_exponent = 0.5
positive_example_ratio = 4 ** positive_exponent

# برای نصف‌شدن زیان، رابطهٔ r**(-alpha)=0.5 را نسبت به r حل می‌کنیم.
# تغییر target_ratio به عدد نزدیک‌تر به یک، ضریب منبع لازم را کوچک‌تر می‌کند.
target_ratio = 0.5
required_factors = {
    name: target_ratio ** (-1 / alpha)
    for name, alpha in exponents.items()
}

# خروجی صرفاً پیامد جبری روابط تجربی است، نه تضمین عملکرد برای مقیاس‌های جدید.
result = {
    "factors": factors,
    "loss_ratios": loss_ratios,
    "percent_reductions": percent_reductions,
    "positive_example_ratio": positive_example_ratio,
    "factors_for_half_loss": required_factors,
}
print(result)
