# حالت بازگشتی زوجیت را با هر ورودی به‌روز می‌کند.
from math import isfinite, tanh

# دنباله خود صفحه 27؛ برای آزمایش فقط 0 و 1 بگذار.
sequence = [1, 0, 1, 1]
# با کاهش u، قدر مطلق حالت معمولا کوچک‌تر می‌شود؛ u را از 3 به 0.5 تغییر بده.
u = 3.0
# حالت مثبت آغاز یعنی هنوز تعداد 1ها زوج است: صفر عدد 1 دیده‌ایم.
state = 1.0
if not isfinite(u) or not isfinite(state):
    raise ValueError("وزن و حالت آغاز باید عدد متناهی باشند.")
states = []
predicted_odd = []
expected_odd = []
one_count = 0
for bit in sequence:
    if bit not in (0, 1):
        raise ValueError("اعضای دنباله باید فقط 0 یا 1 باشند.")
    # مانند قرارداد مثال منبع، ورودی 1 به -1 و ورودی 0 به +1 تبدیل می‌شود.
    encoded = -1.0 if bit == 1 else 1.0
    # حالت پیشین همراه ورودی تازه وارد تابع می‌شود؛ حذف state حافظه را از بین می‌برد.
    state = tanh(u * encoded * state)
    states.append(state)
    # علامت منفی نشانه فرد و مثبت نشانه زوج است؛ حالت صفر زوجیت را مشخص نمی‌کند.
    predicted_odd.append(None if state == 0 else int(state < 0))
    # شمار واقعی را فقط برای مقایسه با نتیجه شبکه نگه می‌داریم.
    one_count += bit
    expected_odd.append(one_count % 2)

# هر گام را با پاسخ درست مقایسه کن؛ None یعنی حالت، زوجیت را مشخص نکرده است.
correct = [prediction == expected if prediction is not None else None
           for prediction, expected in zip(predicted_odd, expected_odd)]
result = {"states": states, "predicted_odd": predicted_odd,
          "expected_odd": expected_odd, "correct": correct}
