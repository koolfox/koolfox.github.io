# ترتیب سطرهای دو جدول منبع:TT، TF، FT، FF.
inputs = [[True, True], [True, False], [False, True], [False, False]]
if any(len(row) != 2 or any(bit not in (False, True) for bit in row) for row in inputs):
    raise ValueError("هر سطر باید دو مقدار دودویی داشته باشد.")
and_outputs = []
or_outputs = []
for first, second in inputs:
    # AND فقط با درست‌بودن هر دو ورودی درست است.
    and_outputs.append(bool(first and second))
    # OR فراگیر با درست‌بودن دست‌کم یک ورودی درست است؛ TT نیز True است.
    or_outputs.append(bool(first or second))
result = {"and_outputs": and_outputs, "or_outputs": or_outputs}
