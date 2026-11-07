# حالت بازگشتی زوجیت را با هر ورودی به‌روز می‌کند.
from math import tanh

# دنباله خود صفحه 27؛ برای آزمایش فقط 0 و 1 بگذار.
sequence = [1, 0, 1, 1]
# با کاهش u، قدر مطلق حالت معمولا کوچک‌تر می‌شود؛ u را از 3 به 0.5 تغییر بده.
u = 3.0
# حالت مثبت آغاز یعنی هنوز تعداد 1 ها زوج است: صفر عدد 1 دیده‌ایم.
state = 1.0
states = []
predicted_odd = []
for bit in sequence:
    if bit not in (0, 1):
        raise ValueError("اعضای دنباله باید فقط 0 یا 1 باشند.")
    # مانند قرارداد مثال منبع، ورودی 1 به -1 و ورودی 0 به +1 تبدیل می‌شود.
    encoded = -1.0 if bit == 1 else 1.0
    # حالت پیشین همراه ورودی تازه وارد تابع می‌شود؛ حذف state حافظه را از بین می‌برد.
    state = tanh(u * encoded * state)
    states.append(state)
    # علامت منفی برای شمار فرد و علامت مثبت برای شمار زوج است.
    predicted_odd.append(int(state < 0))

result = {"states": states, "predicted_odd": predicted_odd}
