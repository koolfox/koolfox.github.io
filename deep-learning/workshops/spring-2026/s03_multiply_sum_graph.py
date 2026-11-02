# همان ورودی‌های صفحهٔ 107؛ متغیر میانی z گرهٔ جمع است.
b, c, d = 2.0, 3.0, 4.0
z = b + c
value = d * z
# گرهٔ ضرب، برای هر ورودی مقدار ورودی دیگر را به عنوان مشتق محلی می‌دهد.
grad_z = d
grad_d = z
# گرهٔ جمع مشتق محلی 1 دارد؛ گرادیان z را به هر دو ورودی منتقل می‌کند.
grad_b = grad_z * 1.0
grad_c = grad_z * 1.0
result = {"z": z, "value": value, "grad_z": grad_z, "grad_d": grad_d,
          "grad_b": grad_b, "grad_c": grad_c}
