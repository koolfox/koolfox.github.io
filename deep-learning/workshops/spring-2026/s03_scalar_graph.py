# ورودی‌های خود مثال گراف محاسباتی؛ هر سه را می‌توان تغییر داد.
a, b, c = 1.0, -2.0, 3.0
learning_rate = 0.01
if learning_rate < 0:
    raise ValueError("نرخ یادگیری باید نامنفی باشد.")
# ابتدا ضرب، سپس جمع؛ ترتیب محاسبه همان دو گرهٔ گراف است.
product = b * c
value = a + product
# مشتق نسبت به a برابر 1 و مشتق ضرب نسبت به هر عامل، عامل دیگر است.
gradients = [1.0, c, b]
# گام‌های اسلایدهای ۵۴ و ۵۶؛ برای آزمایش می‌توان هر دو را تغییر داد.
h_values = [0.01, 0.001]
if not h_values or any(h <= 0 for h in h_values):
    raise ValueError("گام‌های تفاضل باید مثبت باشند.")

# در هر جدول، ستون‌ها به‌ترتیب h، مقدار تابع و شیب تفاضل پیشرو هستند.
finite_difference_b = []
finite_difference_c = []
for h in h_values:
    changed_b = a + (b + h) * c
    changed_c = a + b * (c + h)
    finite_difference_b.append([h, changed_b, (changed_b - value) / h])
    finite_difference_c.append([h, changed_c, (changed_c - value) / h])

# اعداد گرد شده روی اسلاید فقط برای داده و گام‌های همان مثال قابل مقایسه‌اند.
source_case = (a == 1.0 and b == -2.0 and c == 3.0 and h_values == [0.01, 0.001])
source_printed_b = [[0.01, -4.970, 3.000], [0.001, -4.997, 3.000]] if source_case else None
source_printed_c = [[0.01, -5.020, -2.000], [0.001, -5.002, -2.000]] if source_case else None

# هر سه پارامتر با گرادیانِ نقطهٔ قبلی هم‌زمان به‌روز می‌شوند.
updated = [v - learning_rate * g for v, g in zip([a, b, c], gradients)]
next_value = updated[0] + updated[1] * updated[2]
result = {"product": product, "value": value, "gradients": gradients,
          "finite_difference_b": finite_difference_b, "finite_difference_c": finite_difference_c,
          "source_printed_b": source_printed_b, "source_printed_c": source_printed_c,
          "updated": updated, "next_value": next_value}
