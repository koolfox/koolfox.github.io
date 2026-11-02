from math import sqrt
# سه نمونهٔ همان صفحهٔ 18؛ هر سطر یک نمونه و هر ستون یک ویژگی است.
samples = [[2.0, 10.0], [5.0, 24.0], [10.0, 31.0]]
if len(samples) < 2 or any(len(row) != 2 for row in samples):
    raise ValueError("حداقل دو نمونه با دو ویژگی لازم است.")
# میانگین هر ویژگی فقط روی همین داده‌های آموزشی محاسبه می‌شود.
means = [sum(row[j] for row in samples) / len(samples) for j in range(2)]
centered = [[row[j] - means[j] for j in range(2)] for row in samples]
# قرارداد اسلاید انحراف معیار جامعه است: تقسیم بر n، نه n−1.
stds = [sqrt(sum(row[j]**2 for row in centered) / len(samples)) for j in range(2)]
if any(s == 0 for s in stds):
    raise ValueError("ویژگی ثابت را نمی‌توان با انحراف معیار صفر استاندارد کرد.")
standardized = [[row[j] / stds[j] for j in range(2)] for row in centered]
# برای مقایسه با صفحهٔ 19، هر دو وزن برابر 0.1 و بایاس صفرند.
raw_sums = [0.1 * sum(row) for row in samples]
centered_sums = [0.1 * sum(row) for row in centered]
result = {"means": means, "centered": centered, "stds": stds,
          "standardized": standardized, "raw_sums": raw_sums,
          "centered_sums": centered_sums}
