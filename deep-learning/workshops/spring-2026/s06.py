# داده‌ها ساختگی‌اند؛ میانگین و انحراف معیار فقط از دادهٔ آموزش محاسبه می‌شوند.
from statistics import mean, pstdev

# ویژگی دوم مقیاس بزرگ‌تری دارد؛ یکی از مقدارها را تغییر بده و آمار را دوباره ببین.
training = [[1.0, 10.0], [3.0, 20.0], [5.0, 30.0]]
# این نمونهٔ تازه در محاسبهٔ میانگین و انحراف معیار شرکت نمی‌کند.
test = [7.0, 40.0]
# هر ستون یک ویژگی است؛ زیپ، ستون‌ها را از سطرهای نمونه‌ها جدا می‌کند.
columns = list(zip(*training))
# میانگین و انحراف معیار جمعیتِ هر ویژگی فقط از سه نمونهٔ آموزش محاسبه می‌شوند.
means = [mean(column) for column in columns]
scales = [pstdev(column) for column in columns]


def transform(sample):
    # ابتدا میانگین را کم و سپس بر مقیاس تقسیم کن؛ همین آمار برای آزمون هم استفاده می‌شود.
    return [(x - mu) / scale for x, mu, scale in zip(sample, means, scales)]


# میانگین ویژگی‌های تبدیل‌شده باید نزدیک صفر و مقیاس آن‌ها نزدیک یک شود.
standardized = [transform(sample) for sample in training]
result = {
    "means": means,
    "scales": scales,
    "standardized_training": standardized,
    "standardized_test": transform(test),
}
