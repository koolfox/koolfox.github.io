# تابع و نقطهٔ شروع همان مثال اسلاید هستند.
x = 2.0
learning_rate = 0.01
# نرخ منفی در روش کاهش گرادیان مجاز نیست.
if learning_rate < 0:
    raise ValueError("نرخ یادگیری باید نامنفی باشد.")
# با تغییر x، مقدار تابع و شیب همان نقطه را مقایسه کن.
value = 2 - 3 * x + 4 * x**2
gradient = -3 + 8 * x
# حرکت در خلاف جهت شیب؛ در نقطهٔ 2 شیب مثبت است.
next_x = x - learning_rate * gradient
# تفاضل پیشرو با کوچک‌شدن h به مشتق دقیق نزدیک می‌شود.
h_values = [0.01, 0.001, 0.0001]
finite_differences = [((2 - 3 * (x+h) + 4 * (x+h)**2) - value) / h for h in h_values]
result = {"value": value, "gradient": gradient, "next_x": next_x,
          "finite_differences": finite_differences, "minimum_x": 3 / 8}
