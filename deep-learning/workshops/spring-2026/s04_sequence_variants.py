# آرایش دلخواه را از میان پنج الگوی صفحه 39 انتخاب کن.
variant = "many-to-many-delayed"
patterns = {
    "one-to-one": ([1], [1]),
    "one-to-many": ([1, 0, 0], [1, 1, 1]),
    "many-to-one": ([1, 1, 1], [0, 0, 1]),
    "many-to-many-delayed": ([1, 1, 1, 0, 0], [0, 0, 1, 1, 1]),
    "many-to-many-aligned": ([1, 1, 1], [1, 1, 1]),
}
if variant not in patterns:
    raise ValueError("آرایش را از کلیدهای patterns انتخاب کن.")
inputs, outputs = patterns[variant]
# هر ستون یک گام است؛ مربع فقط حضور ورودی یا خروجی را نشان میدهد.
def row(values):
    return "  ".join("■" if value else "·" for value in values)

print("نمای شماتیک است؛ مدلی آموزش داده یا اجرا نشده است.")
print("گام:    " + "  ".join(str(i + 1) for i in range(len(inputs))))
print("ورودی:  " + row(inputs))
print("خروجی:  " + row(outputs))
result = {"variant": variant, "input_steps": sum(inputs),
          "output_steps": sum(outputs), "timeline_steps": len(inputs),
          "input_positions": inputs, "output_positions": outputs}
