# ورودی و فیلتر از شکل صفحه 37 درس هستند.
image = [
    [1, 1, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 1, 1],
    [0, 0, 1, 1, 0],
    [0, 1, 1, 0, 0],
]
kernel = [[1, 0, 1], [0, 1, 0], [1, 0, 1]]

# شماره سطر و ستون خروجی را از صفر تا دو انتخاب و دوباره اجرا کن.
selected_row = 0
selected_column = 0


def inspect_window(values, weights, row, column):
    if type(row) is not int or type(column) is not int:
        raise ValueError('شماره سطر و ستون باید عدد صحیح باشد.')
    height = len(values) - len(weights) + 1
    width = len(values[0]) - len(weights[0]) + 1
    if not (0 <= row < height and 0 <= column < width):
        raise ValueError('این خانه در نقشه ویژگی وجود ندارد.')
    window = [line[column:column + len(weights[0])] for line in values[row:row + len(weights)]]
    products = [[window[i][j] * weights[i][j] for j in range(len(weights[0]))]
                for i in range(len(weights))]
    return {'window': window, 'products': products,
            'response': sum(sum(line) for line in products)}


feature_map = [[inspect_window(image, kernel, row, column)['response']
                for column in range(3)] for row in range(3)]
selected = inspect_window(image, kernel, selected_row, selected_column)
result = {'feature_map': feature_map, 'selected_row': selected_row,
          'selected_column': selected_column, **selected}
print(result)
