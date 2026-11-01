# شمارش‌های این مثال ساختگی‌اند.
# A و B فقط نام دو گروه فرضی‌اند؛ برچسب مثبت نیز صرفاً یک قرارداد عددیِ تمرین است.
groups = {
    # tp: مثبت درست، fn: منفی کاذب، fp: مثبت کاذب، tn: منفی درست.
    "A": {"tp": 30, "fn": 10, "fp": 20, "tn": 40},
    "B": {"tp": 10, "fn": 30, "fp": 40, "tn": 20},
}
# برای آزمایش دوم، شمارش‌های B را با A برابر کن؛ هر گروه همچنان 100 نمونه دارد.
# هنگام تغییر، مجموع tp+fn را 40 و مجموع fp+tn را 60 نگه دار تا اندازه و شیوع ثابت بماند.
metrics = {}
for name, counts in groups.items():
    if any(type(value) is not int or value < 0 for value in counts.values()):
        raise ValueError("شمارش‌ها باید عدد صحیح نامنفی باشند")
    tp, fn, fp, tn = (counts[key] for key in ("tp", "fn", "fp", "tn"))
    total = tp + fn + fp + tn
    if total == 0 or tp + fn == 0 or fp + tn == 0:
        raise ValueError("مخرج نرخ‌ها نباید صفر باشد")
    metrics[name] = {
        "count": total,
        # نرخ انتخاب: سهم همهٔ نمونه‌هایی که پیش‌بینی مثبت گرفته‌اند.
        "selection_rate": (tp + fp) / total,
        # نرخ مثبت درست فقط میان مثبت‌های واقعی محاسبه می‌شود.
        "true_positive_rate": tp / (tp + fn),
        # نرخ مثبت کاذب فقط میان منفی‌های واقعی محاسبه می‌شود.
        "false_positive_rate": fp / (fp + tn),
        "accuracy": (tp + tn) / total,
    }
# شکاف مطلق به ترتیب نام گروه‌ها وابسته نیست؛ صفرشدن یک شکاف، صفرشدن بقیه را تضمین نمی‌کند.
gaps = {
    key: abs(metrics["A"][key] - metrics["B"][key])
    for key in ("selection_rate", "true_positive_rate", "false_positive_rate", "accuracy")
}
result = {
    "synthetic": True,
    "groups": metrics,
    "absolute_gaps": gaps,
}
print(result)
