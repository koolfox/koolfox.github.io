# مثال عددی خود منبع، صفحات 68 تا 84: سه ورودی، دو نورون پنهان، یک خروجی.
# فقط همان شبکهٔ شکل را اجرا می‌کنیم: ورودی‌ها، وزن‌ها و بایاس‌ها را پایین ببین.
from math import exp

source_inputs = [1.0, 0.0, 1.0]  # صفحهٔ 69؛ هدف همان نمونه برابر 1 است.
source_target = 1.0
source_parameters = {
    "w14": 0.2, "w24": 0.4, "w34": -0.5, "b4": -0.4,
    "w15": -0.3, "w25": 0.1, "w35": 0.2, "b5": 0.2,
    "w46": -0.3, "w56": -0.2, "b6": 0.1,
}


def sigmoid(value):
    # دو شاخه از سرریز نمایی در آزمایش وزن‌های بسیار بزرگ جلوگیری می‌کنند.
    if value >= 0:
        return 1 / (1 + exp(-value))
    exponential = exp(value)
    return exponential / (1 + exponential)


def source_forward(parameters):
    # نمادهای نام‌دار دقیقاً با شمارهٔ گره‌ها و یال‌های شکل منبع متناظرند.
    x1, x2, x3 = source_inputs
    z4 = x1 * parameters["w14"] + x2 * parameters["w24"] + x3 * parameters["w34"] + parameters["b4"]
    z5 = x1 * parameters["w15"] + x2 * parameters["w25"] + x3 * parameters["w35"] + parameters["b5"]
    o4, o5 = sigmoid(z4), sigmoid(z5)
    z6 = o4 * parameters["w46"] + o5 * parameters["w56"] + parameters["b6"]
    o6 = sigmoid(z6)
    # صفحهٔ 73 زیان مربعی کامل را می‌نویسد؛ عددهای میانی را زود گرد نمی‌کنیم.
    squared_error = (source_target - o6) ** 2
    return {"z4": z4, "z5": z5, "z6": z6, "o4": o4, "o5": o5, "o6": o6,
            "squared_error": squared_error, "half_squared_error": squared_error / 2}


forward = source_forward(source_parameters)
o4, o5, o6 = (forward[name] for name in ("o4", "o5", "o6"))
# صفحهٔ 75 عمداً ضریب ثابت 2 را حذف می‌کند؛ این مشتقِ نیمِ خطای مربعی است.
# برای خطای مربعی کامل، گرادیان‌ها دوبرابرند؛ نصف‌کردن نرخ، همان گام را می‌سازد.
e6 = (o6 - source_target) * o6 * (1 - o6)
e4 = e6 * source_parameters["w46"] * o4 * (1 - o4)
e5 = e6 * source_parameters["w56"] * o5 * (1 - o5)
source_scaled_gradients = {"w46": e6 * o4, "w56": e6 * o5, "b6": e6, "b4": e4, "b5": e5}
for index, value in enumerate(source_inputs, start=1):
    # در ورودی صفر، گرادیان وزن‌های متصل به همان ورودی نیز صفر می‌شود.
    source_scaled_gradients[f"w{index}4"] = e4 * value
    source_scaled_gradients[f"w{index}5"] = e5 * value

result = {
    "forward": forward,
    "source_scaled_gradients": source_scaled_gradients,
    "squared_error_gradients": {name: 2 * value for name, value in source_scaled_gradients.items()},
    # فقط ثبت اعداد چاپ‌شده؛ برای محاسبه از این تقریب‌ها استفاده نشده است.
    "source_printed": {"o4": 0.332, "o5": 0.525, "o6": 0.474, "squared_error": 0.277,
                       "e6": -0.1311, "e4": 0.0087, "e5": 0.0065},
}
print(result)
