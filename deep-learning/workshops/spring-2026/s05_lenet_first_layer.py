# لایهٔ C1 در شکل LeNet-5:ورودی تک‌کاناله 32×32 و شش هستهٔ 5×5.
input_side = 32
input_channels = 1
filters = 6
kernel_side = 5
if any(type(n) is not int or n < 1 for n in [input_side, input_channels, filters, kernel_side]) or kernel_side > input_side:
    raise ValueError("اندازه‌ها باید صحیح مثبت و هسته کوچک‌تر یا مساوی ورودی باشد.")
# گام 1 و بدون حاشیه، 32 را به 28 می‌رساند.
output_side = input_side - kernel_side + 1
weights = filters * input_channels * kernel_side**2
# برای هر نقشهٔ خروجی یک بایاس مشترک داریم؛برای هر پیکسل بایاس جدا نداریم.
biases = filters
result = {"filters": filters, "kernel_shape": [kernel_side, kernel_side, input_channels],
          "output_shape": [filters, output_side, output_side],
          "weights": weights, "biases": biases, "total_parameters": weights + biases}
