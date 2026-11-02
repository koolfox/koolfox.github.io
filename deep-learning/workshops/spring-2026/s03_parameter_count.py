# تعداد نورون‌ها در چهار لایهٔ شکل؛ ابتدا و انتها ورودی و خروجی هستند.
layer_sizes = [2, 3, 3, 1]
if len(layer_sizes) < 2 or any(type(n) is not int or n < 1 for n in layer_sizes):
    raise ValueError("حداقل دو لایه با اندازهٔ صحیح مثبت لازم است.")
# در اتصال کامل، هر نورون لایهٔ بعد از همهٔ نورون‌های لایهٔ قبل ورودی می‌گیرد.
weights_per_layer = [a * b for a, b in zip(layer_sizes, layer_sizes[1:])]
# هر نورون غیرورودی یک بایاس دارد؛ ورودی پارامتر بایاس آموختنی ندارد.
biases_per_layer = layer_sizes[1:]
result = {"weights_per_layer": weights_per_layer, "biases_per_layer": biases_per_layer,
          "weight_count": sum(weights_per_layer), "bias_count": sum(biases_per_layer),
          "total_parameters": sum(weights_per_layer) + sum(biases_per_layer)}
