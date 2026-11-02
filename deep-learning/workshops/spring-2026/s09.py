import math

# نه مقدار ماتریسِ صفحهٔ ۵۲؛ ترتیب سطرهای تصویر اصلی حفظ شده است.
values = [0.2, 1.0, 0.3, 0.1, -0.6, -0.07, 1.2, 0.4, 0.0]

# چهار مقدار جدول همان صفحه؛ برای آزمایش، یک مقدار تازه به این فهرست اضافه کن.
codebook = [-0.6, 0.0, 0.4, 1.1]

# برای شماره‌گذاری چهار خانه، دو بیت کافی است؛ افزایش خانه‌ها ممکن است بیت بیشتری بخواهد.
if not values or not codebook:
    raise ValueError("داده و جدول کد نباید خالی باشند.")
bits_per_index = math.ceil(math.log2(len(codebook)))

# هر مقدار به نزدیک‌ترین خانه می‌رود؛ در فاصلهٔ برابر، اندیس کوچک‌تر انتخاب می‌شود.
indices = [
    min(range(len(codebook)), key=lambda index: abs(value - codebook[index]))
    for value in values
]

# بازسازی مقدار از اندیس، تفاوت دادهٔ اولیه و دادهٔ کم‌دقت را آشکار می‌کند.
reconstructed = [codebook[index] for index in indices]

# میانگین مربع خطا را بسنج؛ پیش از تغییر جدول پیش‌بینی کن که خطا کم می‌شود یا زیاد.
mean_squared_error = sum(
    (original - approximate) ** 2
    for original, approximate in zip(values, reconstructed)
) / len(values)

# فرض این تمرین، ذخیرهٔ هر عدد اولیه و هر مقدار جدول با ۳۲ بیت است.
original_bits = 32 * len(values)
index_bits = bits_per_index * len(values)
table_bits = 32 * len(codebook)

# هزینهٔ جدول را هم حساب می‌کنیم؛ نسبت صرفه‌جویی فقط نسبت ۳۲ به ۲ نیست.
total_quantized_bits = index_bits + table_bits
compression_ratio = original_bits / total_quantized_bits

# با افزودن خانه، هم خطا و هم دو جزءِ هزینهٔ ذخیره‌سازی را دوباره مقایسه کن.
result = {
    "bits_per_index": bits_per_index,
    "indices": indices,
    "reconstructed": reconstructed,
    "mean_squared_error": mean_squared_error,
    "original_bits": original_bits,
    "index_bits": index_bits,
    "table_bits": table_bits,
    "total_quantized_bits": total_quantized_bits,
    "compression_ratio": compression_ratio,
}

print(result)
