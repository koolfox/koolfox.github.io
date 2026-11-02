# ماتریس چهاردرچهارِ صفحهٔ 48؛ هر ناحیهٔ رنگی یک پنجرهٔ 2×2 است.
values = [[1, 1, 2, 4], [5, 6, 7, 8], [3, 2, 1, 0], [1, 2, 3, 4]]
window = 2
# گام 2 پنجره‌ها را بدون هم‌پوشانی می‌چیند؛ گام 1 پنجره‌های بیشتری می‌دهد.
stride = 2
if type(window) is not int or type(stride) is not int or window < 1 or stride < 1:
    raise ValueError("اندازهٔ پنجره و گام باید عدد صحیح مثبت باشند.")
if not values or not values[0] or any(len(row) != len(values[0]) for row in values):
    raise ValueError("ماتریس باید غیرخالی و مستطیلی باشد.")
if window > min(len(values), len(values[0])):
    raise ValueError("پنجره نباید از ورودی بزرگ‌تر باشد.")
pooled = []
for top in range(0, len(values) - window + 1, stride):
    output_row = []
    for left in range(0, len(values[0]) - window + 1, stride):
        # بیشترین پاسخ در همین همسایگی حفظ می‌شود؛ وزن قابل یادگیری نداریم.
        region = [values[row][column]
                  for row in range(top, top + window)
                  for column in range(left, left + window)]
        output_row.append(max(region))
    pooled.append(output_row)
result = {"pooled": pooled, "shape": [len(pooled), len(pooled[0])],
          "trainable_parameters": 0}
