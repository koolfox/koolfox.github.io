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
# هر سه پارامتر با گرادیانِ نقطهٔ قبلی هم‌زمان به‌روز می‌شوند.
updated = [v - learning_rate * g for v, g in zip([a, b, c], gradients)]
next_value = updated[0] + updated[1] * updated[2]
result = {"product": product, "value": value, "gradients": gradients,
          "updated": updated, "next_value": next_value}
