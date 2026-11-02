# ورودی و هسته عینِ مثال عددی منبع هستند؛ ابتدا یکی از اعداد را تغییر بده.
inputs = [[0, 1], [2, 3]]
kernel = [[0, 1], [2, 3]]


def transposed_convolution(values, weights, stride):
    # این مثال حاشیه و بایاس ندارد؛ گام باید عدد صحیح مثبت باشد.
    if type(stride) is not int or stride < 1:
        raise ValueError("گام باید عدد صحیح مثبت باشد.")

    # اندازه‌ها را از داده می‌گیریم تا بتوانی شکل ورودی یا هسته را هم عوض کنی.
    if not values or not values[0] or not weights or not weights[0]:
        raise ValueError("ورودی و هسته نباید خالی باشند.")
    height, width = len(values), len(values[0])
    kernel_height, kernel_width = len(weights), len(weights[0])
    if any(len(row) != width for row in values) or any(
        len(row) != kernel_width for row in weights
    ):
        raise ValueError("سطرهای هر ماتریس باید طول یکسان داشته باشند.")

    # هر خانهٔ ورودی، هسته را در مکان وابسته به گام روی خروجی قرار می‌دهد.
    output_height = (height - 1) * stride + kernel_height
    output_width = (width - 1) * stride + kernel_width
    output = [[0.0] * output_width for _ in range(output_height)]

    # سهم هر خانه را در همهٔ ضرایب هسته ضرب می‌کنیم و هم‌پوشانی‌ها را جمع می‌زنیم.
    for row in range(height):
        for column in range(width):
            for kernel_row in range(kernel_height):
                for kernel_column in range(kernel_width):
                    target_row = row * stride + kernel_row
                    target_column = column * stride + kernel_column
                    output[target_row][target_column] += (
                        values[row][column] * weights[kernel_row][kernel_column]
                    )
    return output


# پیش از اجرا، خانهٔ مرکزیِ خروجی گام ۱ و اندازهٔ خروجی گام ۲ را پیش‌بینی کن.
stride_1 = transposed_convolution(inputs, kernel, stride=1)
stride_2 = transposed_convolution(inputs, kernel, stride=2)

# جمع خروجی را هم می‌سنجیم؛ تغییر گام، تعداد حاصل‌ضرب‌ها را تغییر نمی‌دهد.
result = {
    "stride_1": stride_1,
    "stride_2": stride_2,
    "center_stride_1": stride_1[1][1],
    "shape_stride_1": [len(stride_1), len(stride_1[0])],
    "shape_stride_2": [len(stride_2), len(stride_2[0])],
    "sum_stride_1": sum(sum(row) for row in stride_1),
    "sum_stride_2": sum(sum(row) for row in stride_2),
}

print(result)
