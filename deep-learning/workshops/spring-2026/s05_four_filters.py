# ماتریس 7×7 سمت چپ صفحهٔ 39؛مقادیر روشن آن 30 هستند.
inputs = [[0, 0, 0, 0, 0, 30, 0], [0, 0, 0, 0, 30, 0, 0],
          [0, 0, 0, 30, 0, 0, 0], [0, 0, 0, 30, 0, 0, 0],
          [0, 0, 0, 30, 0, 0, 0], [0, 0, 0, 30, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0]]
# ضرایب چهارفیلتر جدول؛برای Box blur عددهای صحیح را در پایان بر 9 تقسیم می‌کنیم.
kernels = {"identity": [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
           "edge_detection": [[1, 0, -1], [0, 0, 0], [-1, 0, 1]],
           "sharpen": [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
           "box_blur": [[1, 1, 1], [1, 1, 1], [1, 1, 1]]}
divisors = {"identity": 1, "edge_detection": 1, "sharpen": 1, "box_blur": 9}
if not inputs or not inputs[0] or any(len(row) != len(inputs[0]) for row in inputs):
    raise ValueError("ورودی باید ماتریس مستطیلی غیرخالی باشد.")
if len(inputs) < 3 or len(inputs[0]) < 3:
    raise ValueError("ورودی باید حداقل 3×3 باشد.")
feature_maps = {}
weight_sums = {}
for name, kernel in kernels.items():
    if len(kernel) != 3 or any(len(row) != 3 for row in kernel) or divisors[name] == 0:
        raise ValueError("هسته باید 3×3 و مقسوم‌علیه غیرصفر باشد.")
    output = []
    # قرارداد این بررسی:گام 1 و بدون حاشیه،پس خروجیِ ورودی 7×7 اندازهٔ 5×5 دارد.
    for top in range(len(inputs) - 2):
        line = []
        for left in range(len(inputs[0]) - 2):
            total = sum(inputs[top+i][left+j] * kernel[i][j]
                        for i in range(3) for j in range(3))
            line.append(total / divisors[name])
        output.append(line)
    feature_maps[name] = output
    # پاسخ ناحیهٔ ثابت،با مجموع وزن‌ها متناسب است؛فیلتر لبه مجموع صفر دارد.
    weight_sums[name] = sum(sum(row) for row in kernel) / divisors[name]
result = {"feature_maps": feature_maps, "weight_sums": weight_sums,
          "output_shape": [len(inputs)-2, len(inputs[0])-2]}
