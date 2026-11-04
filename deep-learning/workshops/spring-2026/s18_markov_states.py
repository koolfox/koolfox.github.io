from math import isfinite

# احتمال انتقال‌ها در شکل اسلاید ۳۵؛ سطر، حالت فعلی و ستون، حالت بعدی است.
states = ["E", "A"]
transitions = [[0.3, 0.7], [0.4, 0.6]]

# اسلاید توزیع شروع را تعیین نکرده است؛ این یک انتخاب قابل تغییر است.
initial = [1.0, 0.0]
steps = 5

if type(steps) is not int or not 0 <= steps <= 1000:
    raise ValueError("تعداد گام باید عدد صحیح بین ۰ و ۱۰۰۰ باشد.")
if len(transitions) != 2 or any(
    len(row) != 2 or any(not isfinite(x) or x < 0 for x in row)
    or abs(sum(row) - 1) > 1e-10 for row in transitions
):
    raise ValueError("ماتریس انتقال باید دو سطر با احتمال‌های معتبر داشته باشد.")
if len(initial) != 2 or any(not isfinite(x) or x < 0 for x in initial) or abs(sum(initial) - 1) > 1e-10:
    raise ValueError("توزیع شروع باید دو احتمال نامنفی با مجموع یک داشته باشد.")

# توزیع بعدی حاصل جمع احتمال مسیرهای ورودی به هر حالت است.
probabilities = initial[:]
history = [probabilities[:]]
for _ in range(steps):
    probabilities = [sum(probabilities[i] * transitions[i][j] for i in range(2))
                     for j in range(2)]
    history.append(probabilities[:])

# برای دو حالت، توازن جریان E به A و A به E توزیع پایا را می‌دهد.
flow_sum = transitions[0][1] + transitions[1][0]
stationary = ([transitions[1][0] / flow_sum, transitions[0][1] / flow_sum]
              if flow_sum else None)

result = {"states": states, "transition_rows": transitions,
          "chosen_initial": initial, "history": history,
          "stationary_distribution": stationary}
print(result)
