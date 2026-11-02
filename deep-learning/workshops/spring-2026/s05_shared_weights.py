# مثال صفحهٔ 42: ورودی 3×3، هسته 2×2، یک کانال و یک فیلتر، بدون بایاس.
input_side = 3
kernel_side = 2
if any(type(n) is not int or n < 1 for n in [input_side, kernel_side]) or kernel_side > input_side:
    raise ValueError("اندازه‌ها باید صحیح مثبت و هسته کوچک‌تر یا مساوی ورودی باشد.")
# گام 1 و بدون حاشیه: در هر بُعد n−k+1 مکان داریم.
output_side = input_side - kernel_side + 1
output_neurons = output_side**2
# کانولوشن همان وزن‌های هسته را در همهٔ مکان‌ها به اشتراک می‌گذارد.
conv_weights = kernel_side**2
# در اتصال کامل، هر ورودی به هر خروجی وزن مستقل دارد.
dense_weights = input_side**2 * output_neurons
result = {"output_neurons": output_neurons, "conv_weights": conv_weights,
          "dense_weights": dense_weights, "conv_inputs_per_neuron": kernel_side**2,
          "dense_inputs_per_neuron": input_side**2}
