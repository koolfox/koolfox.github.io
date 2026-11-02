import math

# سه ورودی و سه ماتریسِ صفحات 21 تا 25 ؛ هر سطر یک بردار است.
inputs = [[1, 0, 1, 0], [0, 2, 0, 2], [1, 1, 1, 1]]
query_weights = [[1, 0, 1], [1, 0, 0], [0, 0, 1], [0, 1, 1]]
key_weights = [[0, 0, 1], [1, 1, 0], [0, 1, 0], [1, 1, 0]]
value_weights = [[0, 2, 0], [0, 3, 0], [1, 0, 3], [1, 1, 0]]
# اندیس 1 پرس‌وجوی 2 را انتخاب می‌کند؛ 0 ، 1 ، 2 سه توکن مثال هستند.
selected_query = 1
# مثال عددی صفحات 27 تا 35 بدون مقیاس است؛ True یک آزمایش با نسخهٔ مقیاس‌دار است.
scaled = False


def project(rows, weights):
    # هر مؤلفهٔ خروجی، ضرب داخلی یک ورودی با یک ستون وزن‌هاست.
    if not rows or not rows[0] or not weights or not weights[0]:
        raise ValueError("ماتریس‌ها نباید خالی باشند.")
    if any(len(row) != len(rows[0]) for row in rows) or len(rows[0]) != len(weights):
        raise ValueError("تعداد ستون‌های ورودی باید با تعداد سطرهای وزن برابر باشد.")
    if any(len(row) != len(weights[0]) for row in weights):
        raise ValueError("سطرهای وزن باید هم‌اندازه باشند.")
    if not all(math.isfinite(x) for row in rows + weights for x in row):
        raise ValueError("درایه‌ها باید عدد متناهی باشند.")
    return [[sum(x * row[j] for x, row in zip(item, weights))
             for j in range(len(weights[0]))] for item in rows]


# سه تبدیل خطی مستقل از یک ورودی، Q و K و V را می‌سازند.
queries = project(inputs, query_weights)
keys = project(inputs, key_weights)
values = project(inputs, value_weights)
if type(selected_query) is not int or not 0 <= selected_query < len(queries):
    raise ValueError("شمارهٔ پرس‌وجو باید اندیس معتبر ورودی باشد.")
if len(queries[0]) != len(keys[0]):
    raise ValueError("بُعد Q و K باید یکسان باشد.")
scale = math.sqrt(len(keys[0])) if scaled else 1.0
# سطر i تمام امتیازهای توکن i نسبت به توکن‌های ورودی را نگه می‌دارد.
all_scores = [[sum(q * k for q, k in zip(query, key)) / scale
               for key in keys] for query in queries]
all_weights = []
for row in all_scores:
    # کم‌کردن بیشینه مانع سرریز نمایی می‌شود و Softmax را عوض نمی‌کند.
    numerators = [math.exp(score - max(row)) for score in row]
    all_weights.append([value / sum(numerators) for value in numerators])
# هر سطر خروجی جمع وزن‌دار V ها برای همان پرس‌وجو است.
all_outputs = [[sum(w * value[j] for w, value in zip(row, values))
                for j in range(len(values[0]))] for row in all_weights]
query = queries[selected_query]
scores = all_scores[selected_query]
weights = all_weights[selected_query]
output = all_outputs[selected_query]
# تقریب چاپیِ پرس‌وجوی 2 فقط برای داده‌ها و وزن‌های دست‌نخوردهٔ همین مثال تعریف شده است.
source_case = (inputs == [[1, 0, 1, 0], [0, 2, 0, 2], [1, 1, 1, 1]]
               and queries == [[1, 0, 2], [2, 2, 2], [2, 1, 3]]
               and keys == [[0, 1, 1], [4, 4, 0], [2, 3, 1]]
               and values == [[1, 2, 3], [2, 8, 0], [2, 6, 3]]
               and selected_query == 1 and not scaled)
result = {"queries": queries, "keys": keys, "values": values,
          "all_scores": all_scores, "all_weights": all_weights, "all_outputs": all_outputs,
          "selected_query": selected_query, "scores": scores, "weights": weights,
          "weight_sum": sum(weights), "output": output,
          "slide_approximation_output": [2.0, 8.0, 0.0] if source_case else None,
          "gpu_inputs": {"query": query, "keys": keys, "values": values, "scaled": scaled}}
