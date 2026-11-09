# شکل صفحهٔ 47 یک فیلتر با سه کانال ورودی و ضلع هسته 3 دارد.
input_channels = 3
filters = 1
kernel_side = 3
if any(type(n) is not int or n < 1 for n in [input_channels, filters, kernel_side]):
    raise ValueError("تعدادها و اندازهٔ هسته باید صحیح مثبت باشند.")
# در اصطلاح همین اسلاید، هر برش دوبعدی کانال یک kernel است.
kernels = input_channels * filters
# پاسخ کانال‌ها برای هر فیلتر جمع می‌شود؛ هر فیلتر یک نقشهٔ خروجی می‌سازد.
feature_maps = filters
# هر برش 3×3 نه وزن دارد؛ بایاس در این شمارش وارد نشده است.
weights = kernels * kernel_side**2
# پنجره بالاچپ کانال قرمز و برش قرمز فیلتر در تصویر مرجع صفحه 47.
red_patch = [[4, 9, 2], [5, 6, 2], [2, 4, 5]]
red_kernel = [[1, 0, -1], [1, 0, -1], [1, 0, -1]]
red_response = 0
for row in range(3):
    for column in range(3):
        red_response += red_patch[row][column] * red_kernel[row][column]
# این فقط سهم کانال قرمز است؛ خروجی کامل به دو کانال دیگر هم نیاز دارد.
result = {"filters": filters, "kernels": kernels, "feature_maps": feature_maps,
          "weights_without_bias": weights, "red_channel_response": red_response}
