# تألیف مستقل؛ مجوز MIT. داده‌ها ساختگی‌اند و اندازه‌گیری مدل واقعی نیستند.
# جمع‌بندی درس: معیار عملکرد را همراه هزینه و محدودیت کاربرد بسنج.
# accuracy دقت فرضی روی آزمون مشترک و joules انرژی همان تعداد درخواست است؛ تغییرشان گزینش را عوض می‌کند.
models = [
    {"name": "A", "accuracy": 0.92, "joules": 100.0},
    {"name": "B", "accuracy": 0.89, "joules": 50.0},
    {"name": "C", "accuracy": 0.85, "joules": 30.0},
]
minimum_accuracy = 0.88   # این قید را تغییر بده و پیش از اجرا نتیجه را حدس بزن.
maximum_joules = 70.0    # انرژی فرضی برای تعداد یکسانی درخواست.


def eligible(model):
    # هر دو قید باید برقرار باشند؛ صرف دقت بالاتر کافی نیست.
    return model["accuracy"] >= minimum_accuracy and model["joules"] <= maximum_joules


def dominates(left, right):
    # بهتر یا برابر در هر دو معیار و اکیداً بهتر در دست‌کم یکی.
    # شرط نخست، بدترنبودن در هر دو محور است؛ با جابه‌جایی >= نتیجهٔ برتری تغییر می‌کند.
    no_worse = left["accuracy"] >= right["accuracy"] and left["joules"] <= right["joules"]
    # شرط دوم، حذف حالت تساوی کامل است؛ تا مدل همسان دیگری را حذف نکند.
    better = left["accuracy"] > right["accuracy"] or left["joules"] < right["joules"]
    return no_worse and better


# فقط گزینه‌هایی را نگه می‌داریم که هیچ مدل دیگری بر آن‌ها غالب نیست.
frontier = [m["name"] for m in models if not any(dominates(n, m) for n in models)]
# صرفه‌جویی نسبی B نسبت به A؛ با عوض‌کردن مرجع، مخرج و تفسیر درصد تغییر می‌کند.
energy_saving = 1 - models[1]["joules"] / models[0]["joules"]
# فاصلهٔ دقت نیز گزارش می‌شود؛ گردکردن صرفاً نمایش عدد اعشاری را خوانا می‌کند.
result = {
    "eligible": [m["name"] for m in models if eligible(m)],
    "pareto_frontier": frontier,
    "energy_saving_B_vs_A": energy_saving,
    "accuracy_loss_B_vs_A": round(models[0]["accuracy"] - models[1]["accuracy"], 6),
}
print(result)
