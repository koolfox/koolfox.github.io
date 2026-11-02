# گرافِ دوحالتهٔ خود صفحه:ترتیب حالت‌هاEوAاست.
# هر سطر،احتمال رفتن از حالت سطر به حالت ستون را می‌دهد.
states = ["E", "A"]
transitions = [[0.3, 0.7], [0.4, 0.6]]
# برای کاوش،شروع ازEرا انتخاب کرده‌ایم؛در اسلاید توزیع اولیه تعیین نشده است.
initial = [1.0, 0.0]
steps = 5
if not isinstance(steps, int) or steps < 0:
    raise ValueError("تعدادگام باید عددصحیح نامنفی باشد.")
if len(transitions) != 2 or any(len(row) != 2 or any(x < 0 for x in row) or abs(sum(row)-1) > 1e-10 for row in transitions):
    raise ValueError("ماتریس باید2×2،نامنفی و جمع هرسطر1باشد.")
if len(initial) != 2 or any(x < 0 for x in initial) or abs(sum(initial)-1) > 1e-10:
    raise ValueError("توزیع اولیه باید دونامنفى با مجموع1داشته باشد.")
# توزیع جدید با جمع احتمال مسیرهای ورودی به هر حالت ساخته می‌شود.
probabilities = initial[:]
history = [probabilities[:]]
for _ in range(steps):
    probabilities = [sum(probabilities[i] * transitions[i][j] for i in range(2)) for j in range(2)]
    history.append(probabilities[:])
# برای دوحالت،توازن جریانE→AوA→Eتوزیع پایا را می‌دهد.
flow_sum = transitions[0][1] + transitions[1][0]
stationary = [transitions[1][0] / flow_sum, transitions[0][1] / flow_sum] if flow_sum else None
result = {"states": states, "transition_rows": transitions,
          "chosen_initial": initial, "history": history,
          "stationary_distribution": stationary}
