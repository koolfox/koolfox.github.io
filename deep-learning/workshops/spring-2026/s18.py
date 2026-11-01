# تألیف مستقل؛ مجوز MIT. حساب دقیق LoRA بدون کتابخانه و بدون آموزش واقعی مدل.
# W0 وزن پایهٔ ثابت 2×3 است؛ تغییر آن، خروجی پایه را نیز عوض می‌کند.
W0 = [[1.0, 0.0, -1.0], [0.0, 1.0, 1.0]]
# A با اندازهٔ 1×3 و B با اندازهٔ 2×1، به‌روزرسانی کم‌رتبهٔ BA را تعریف می‌کنند.
A = [[0.5, -1.0, 0.0]]  # ضریب دوم را تغییر بده؛ وزن پایه ثابت می‌ماند.
B = [[2.0], [-1.0]]     # علامت هر سطر، جهت اثر سازگارکننده را تغییر می‌دهد.
x = [2.0, -1.0, 3.0]   # یک ورودی سه‌بعدی؛ همهٔ خروجی‌ها برای همین ورودی‌اند.


def matvec(matrix, vector):
    # ضرب هر سطر در ورودی؛ تغییر طول‌ها بدون رعایت ابعاد، این مدل را نامعتبر می‌کند.
    return [sum(a * b for a, b in zip(row, vector)) for row in matrix]


# با رتبهٔ 1، هر سطر BA برابر ضریب همان سطر B در تنها سطر A است.
delta = [[row[0] * value for value in A[0]] for row in B]
# ادغام در زمان استنتاج: W0 + BA؛ پارامتر جداگانه‌ای به ابعاد خروجی اضافه نمی‌شود.
merged = [[base + update for base, update in zip(w, d)] for w, d in zip(W0, delta)]
base_output = matvec(W0, x)       # خروجی مدل پایه، بدون سازگارکننده.
adapter_output = matvec(B, matvec(A, x))  # مسیر جداگانهٔ B(Ax).
# جمع خروجی پایه و سازگارکننده، خروجی مسیر جداگانه را می‌سازد.
separate_output = [b + d for b, d in zip(base_output, adapter_output)]
merged_output = matvec(merged, x)  # مسیر ادغام‌شده باید همان نتیجه را بدهد.
result = {
    "base_output": base_output,
    "separate_output": separate_output,
    "merged_output": merged_output,
    # بزرگ‌ترین اختلاف دو مسیر؛ برای همین ماتریس‌ها باید صفر باشد.
    "max_merge_error": max(abs(a - b) for a, b in zip(separate_output, merged_output)),
    "adapter_parameters": sum(map(len, A)) + sum(map(len, B)),  # 3+2 وزن افزوده.
    "base_parameters": sum(map(len, W0)),  # 2×3 وزن ثابت، نه پارامتر آموزش‌پذیر این مثال.
}
print(result)
