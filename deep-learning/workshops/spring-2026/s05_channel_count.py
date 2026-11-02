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
result = {"filters": filters, "kernels": kernels, "feature_maps": feature_maps,
          "weights_without_bias": weights}
