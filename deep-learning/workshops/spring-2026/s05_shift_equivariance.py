# مثال آموزشی: یک نقطه در تصویر 7×7 و فیلتر صفحه 37.
image = [[0] * 7 for _ in range(7)]
image[3][3] = 1
kernel = [[1, 0, 1], [0, 1, 0], [1, 0, 1]]
# تصویر را صفر، یک یا دو خانه به راست ببریم و دوباره اجرا کنیم.
shift = 1


def shift_right(values, amount):
    if type(amount) is not int or not 0 <= amount <= 2:
        raise ValueError('جابجایی باید صفر، یک یا دو خانه باشد.')
    return [[0 if column < amount else row[column - amount]
             for column in range(len(row))] for row in values]


def correlate(values, weights):
    # گام یک، بدون حاشیه گذاری؛ تنها پنجره های کامل محاسبه می شوند.
    rows = len(values) - len(weights) + 1
    columns = len(values[0]) - len(weights[0]) + 1
    return [[sum(values[row + i][column + j] * weights[i][j]
                 for i in range(3) for j in range(3))
             for column in range(columns)] for row in range(rows)]


shifted_image = shift_right(image, shift)
original_map = correlate(image, kernel)
shifted_map = correlate(shifted_image, kernel)
expected_map = shift_right(original_map, shift)
# نزدیک مرز، خروجی بریده می شود و بخشی از پاسخ تازه ظاهر می شود.
boundary_image = [[0] * 7 for _ in range(7)]
boundary_image[3][0] = 1
boundary_map = correlate(shift_right(boundary_image, 1), kernel)
boundary_expected = shift_right(correlate(boundary_image, kernel), 1)
result = {'image': image, 'shifted_image': shifted_image,
          'original_map': original_map, 'shifted_map': shifted_map,
          'expected_map': expected_map,
          'same_after_shift': shifted_map == expected_map,
          'unchanged': shifted_map == original_map,
          'boundary_map': boundary_map, 'boundary_expected': boundary_expected,
          'boundary_equal': boundary_map == boundary_expected}
print(result)
