# فیلتر وارونه نمی‌شود؛ این عمل همبستگی متقابل (Cross-correlation) است.
# داده‌ها ساختگی‌اند.
# این آرایهٔ کوچک نقش تصویر تک‌کاناله را دارد؛ فقط یک خانه را تغییر بده.
image = [[1, 2, 0], [0, 1, 3], [2, 0, 1]]
# همین چهار وزن در همهٔ مکان‌ها مشترک‌اند؛ وزن پایین راست را -1 کن.
kernel = [[1, 0], [0, 1]]
# گام 1 یعنی یک خانه جابه‌جایی؛ گام 2 تعداد مکان‌های ارزیابی را کمتر می‌کند.
stride = 1


def correlate(values, weights, step):
    # بدون حاشیه‌گذاری، فقط پنجره‌هایی را می‌گیریم که کاملاً داخل ورودی‌اند.
    if type(step) is not int or step < 1:
        raise ValueError("گام باید عدد صحیح مثبت باشد.")
    if not values or not values[0] or not weights or not weights[0]:
        raise ValueError("ورودی و فیلتر نباید خالی باشند.")
    height, width = len(values), len(values[0])
    kernel_height, kernel_width = len(weights), len(weights[0])
    if any(len(row) != width for row in values) or any(
        len(row) != kernel_width for row in weights
    ):
        raise ValueError("سطرهای هر ماتریس باید طول یکسان داشته باشند.")
    if kernel_height > height or kernel_width > width:
        raise ValueError("فیلتر باید بدون حاشیه‌گذاری در ورودی جا شود.")
    output = []
    for row in range(0, height - kernel_height + 1, step):
        line = []
        for column in range(0, width - kernel_width + 1, step):
            # ضرب خانه‌های متناظر و سپس جمع؛ فیلتر در هر مکان دوباره استفاده می‌شود.
            response = sum(
                values[row + i][column + j] * weights[i][j]
                for i in range(kernel_height) for j in range(kernel_width)
            )
            line.append(response)
        output.append(line)
    return output


feature_map = correlate(image, kernel, stride)
# تعداد وزن مستقل به تعداد خانه‌های فیلتر وابسته است، نه تعداد پنجره‌ها.
result = {"feature_map": feature_map, "weight_count": sum(len(row) for row in kernel)}

# خود مثال صفحات 27 تا 36: آرایهٔ 5×5 و فیلتر 3×3، بدون تغییر ترتیب خانه‌ها.
# مثال کوچک بالاتر مستقل است؛ این آرایه‌ها مستقیماً از شکل اصلی خوانده شده‌اند.
source_image = [
    [1, 1, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 1, 1],
    [0, 0, 1, 1, 0],
    [0, 1, 1, 0, 0],
]
source_kernel = [[1, 0, 1], [0, 1, 0], [1, 0, 1]]
result["source_feature_map"] = correlate(source_image, source_kernel, step=1)
result["source_weight_count"] = sum(len(row) for row in source_kernel)
print(result)
