# آرایه‌ها و فیلتر دقیقاً از شکل صفحات 27 تا 36 گرفته شده‌اند.
# این کد فقط لغزاندن همان فیلتر را نشان می‌دهد؛ مدل آموزش داده نمی‌شود.
# فیلتر وارونه نمی‌شود: عمل رایج لایه‌های CNN در اینجا همبستگی متقابل است.
source_image = [
    [1, 1, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 1, 1],
    [0, 0, 1, 1, 0],
    [0, 1, 1, 0, 0],
]
source_kernel = [[1, 0, 1], [0, 1, 0], [1, 0, 1]]
# با گام 1، گوشهٔ بالاچپ هر پنجره یک خانه جابه‌جا می‌شود.
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


# فقط پنجره‌های کامل داخل تصویر استفاده می‌شوند؛ حاشیه‌گذاری و بایاس نداریم.
feature_map = correlate(source_image, source_kernel, stride)
result = {
    "feature_map": feature_map,
    "weight_count": sum(len(row) for row in source_kernel),
    "shape": [len(feature_map), len(feature_map[0])],
    # منبع در صفحهٔ 36 این خانه را با ؟ می‌پرسد؛ اینجا جواب از آرایه‌ها محاسبه می‌شود.
    "bottom_right": feature_map[-1][-1],
}
print(result)
