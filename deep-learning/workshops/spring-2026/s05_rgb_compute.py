# ابعاد و هستهٔ خود صفحهٔ 55؛ یک فیلتر خروجی، گام 1 و حاشیهٔ حفظ اندازه.
width = 1280
height = 720
input_channels = 3
kernel_side = 3
if any(type(n) is not int or n < 1 for n in [width, height, input_channels, kernel_side]):
    raise ValueError("ابعاد و تعداد کانال باید صحیح مثبت باشند.")
# هر خروجی، همهٔ خانه‌های هسته در همهٔ کانال‌ها را ضرب می‌کند.
multiplications_per_output = kernel_side**2 * input_channels
output_locations = width * height
# این شمار ضرب است؛ جمع‌ها، فعال‌ساز و بایاس را به عنوان FLOP کل مدل جا نمی‌زنیم.
total_multiplications = output_locations * multiplications_per_output
result = {"multiplications_per_output": multiplications_per_output,
          "output_locations": output_locations, "total_multiplications": total_multiplications}
