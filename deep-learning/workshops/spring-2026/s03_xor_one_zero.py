# چهار ورودی جدول XOR ؛ شمارهٔ نمونه را از 0 تا 3 انتخاب کن.
inputs = [[0, 0], [0, 1], [1, 0], [1, 1]]
selected_sample = 2
# چهار اتصال ورودی به پنهان همگی 1 هستند؛ دو بایاس −0.5 و−1.5.
hidden_weights = [[1.0, 1.0], [1.0, 1.0]]
hidden_biases = [-0.5, -1.5]
# خروجی، OR را با وزن 1 و AND را با وزن−2 ترکیب می‌کند.
output_weights = [1.0, -2.0]
output_bias = -0.5
if type(selected_sample) is not int or not 0 <= selected_sample < len(inputs):
    raise ValueError("اندیس نمونه باید0تا3باشد.")
if len(hidden_weights) != 2 or any(len(row) != 2 for row in hidden_weights):
    raise ValueError("در این معماری دو نورون پنهان با دو ورودی داریم.")
if len(hidden_biases) != 2 or len(output_weights) != 2:
    raise ValueError("دو بایاس پنهان و دو وزن خروجی لازم است.")


def threshold(value):
    # قرارداد خود اسلاید: اگر کمتر از 0 باشد 0 ، در غیر این صورت 1.
    return 0 if value < 0 else 1


trace = []
for pair in inputs:
    # هر سطر وزن متعلق به یک نورون پنهان است.
    hidden_sums = [sum(w * x for w, x in zip(row, pair)) + bias
                   for row, bias in zip(hidden_weights, hidden_biases)]
    hidden = [threshold(value) for value in hidden_sums]
    output_sum = sum(w * h for w, h in zip(output_weights, hidden)) + output_bias
    trace.append({"inputs": pair, "hidden_sums": hidden_sums, "hidden": hidden,
                  "output_sum": output_sum, "output": threshold(output_sum)})
# همهٔ سطرهای جدول برای مقایسه می‌مانند؛ selected گام همان صفحه را نشان می‌دهد.
result = {"selected": trace[selected_sample], "truth_table": trace,
          "outputs": [row["output"] for row in trace]}
