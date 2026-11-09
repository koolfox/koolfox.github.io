# تصویر و فیلتر همان مثال صفحه های 27 تا 36 هستند.
image = [
    [1, 1, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 1, 1],
    [0, 0, 1, 1, 0],
    [0, 1, 1, 0, 0],
]
kernel = [[1, 0, 1], [0, 1, 0], [1, 0, 1]]
# گام 1 فیلتر را هر بار یک خانه حرکت می دهد؛ برای آزمایش آن را 2 کنید.
stride = 1


def correlate(values, weights, step):
    # فیلتر وارونه نمی شود: این محاسبه همبستگی متقابل است.
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
        raise ValueError("فیلتر باید بدون حاشیه گذاری در ورودی جا شود.")

    output = []
    # فقط پنجره هایی بررسی می شوند که کامل داخل تصویر هستند.
    for row in range(0, height - kernel_height + 1, step):
        output_row = []
        for column in range(0, width - kernel_width + 1, step):
            response = 0
            for i in range(kernel_height):
                for j in range(kernel_width):
                    # خانه های متناظر را ضرب و نتیجه ها را جمع کنید.
                    response += values[row + i][column + j] * weights[i][j]
            output_row.append(response)
        output.append(output_row)
    return output


# وزن ها در همه پنجره ها مشترک اند؛ بایاس و حاشیه گذاری نداریم.
feature_map = correlate(image, kernel, stride)
weight_count = sum(len(row) for row in kernel)
# گام 1 را هم جداگانه برای مقایسه با جدول مرجع نگه می داریم.
result = {
    "feature_map": feature_map,
    "weight_count": weight_count,
    "source_feature_map": correlate(image, kernel, 1),
    "source_weight_count": weight_count,
}
print(result)
