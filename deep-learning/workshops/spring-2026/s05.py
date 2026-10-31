"""همبستگی متقابل دوبعدیِ مستقل؛ مرتبط با صفحه‌های 26، 27 و 42.

مانند پیاده‌سازی‌های رایج CNN، فیلتر را وارونه نمی‌کنیم. داده‌ها ساختگی‌اند.
"""

# این آرایهٔ کوچک نقش تصویر تک‌کاناله را دارد؛ فقط یک خانه را تغییر بده.
image = [[1, 2, 0], [0, 1, 3], [2, 0, 1]]
# همین چهار وزن در همهٔ مکان‌ها مشترک‌اند؛ وزن پایین راست را -1 کن.
kernel = [[1, 0], [0, 1]]
# گام 1 یعنی یک خانه جابه‌جایی؛ گام 2 تعداد مکان‌های ارزیابی را کمتر می‌کند.
stride = 1


def correlate(values, weights, step):
    # بدون حاشیه‌گذاری، فقط پنجره‌هایی را می‌گیریم که کاملاً داخل ورودی‌اند.
    size = len(weights)
    output = []
    for row in range(0, len(values) - size + 1, step):
        line = []
        for column in range(0, len(values[0]) - size + 1, step):
            # ضرب خانه‌های متناظر و سپس جمع؛ فیلتر در هر مکان دوباره استفاده می‌شود.
            response = sum(
                values[row + i][column + j] * weights[i][j]
                for i in range(size) for j in range(size)
            )
            line.append(response)
        output.append(line)
    return output


feature_map = correlate(image, kernel, stride)
# تعداد وزن مستقل به تعداد خانه‌های فیلتر وابسته است، نه تعداد پنجره‌ها.
result = {"feature_map": feature_map, "weight_count": 4}
