# ورودی‌های مثال صفحهٔ 106؛ ابتدا جمع را اجرا می‌کنیم.
b = 2.0
c = 3.0
value = b + c
# خروجی نسبت به خودش مشتق 1 دارد؛ جمع این گرادیان را به هر دو ورودی می‌رساند.
output_gradient = 1.0
grad_b = output_gradient
grad_c = output_gradient
result = {"value": value, "grad_b": grad_b, "grad_c": grad_c}
