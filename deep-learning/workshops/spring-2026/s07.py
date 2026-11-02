# در این مثال پیش‌بینی مدل‌ها مستقل فرض شده است.
from math import comb

# تعداد رأی‌دهنده‌ها را فرد نگه دار تا رأی برابر نداشته باشیم؛ 11 را به 3 یا 5 تغییر بده.
classifiers = 11
# احتمال خطای یک طبقه‌بند؛ زیر 0.5 بودن آن برای فایدهٔ اکثریت در این مثال مهم است.
individual_error = 0.25
# بیش از نصفِ طبقه‌بندها باید خطا کنند تا تصمیم اکثریت نادرست شود.
if type(classifiers) is not int or classifiers < 1 or classifiers % 2 == 0:
    raise ValueError("تعداد رأی‌دهنده‌ها باید عدد صحیح مثبت و فرد باشد.")
if not 0 <= individual_error <= 1:
    raise ValueError("احتمال خطا باید بین صفر و یک باشد.")
majority = classifiers // 2 + 1
# برای k خطا، تعداد انتخاب خطاکارها در احتمال رخداد همان الگوی درست/غلط ضرب می‌شود.
terms = [
    comb(classifiers, k)
    * individual_error**k
    * (1 - individual_error) ** (classifiers - k)
    for k in range(majority, classifiers + 1)
]
# احتمال همهٔ حالت‌های خطای اکثریت جمع می‌شود؛ مقدار حاصل باید حدود 0.034 باشد.
ensemble_error = sum(terms)
result = {
    "classifiers": classifiers,
    "majority": majority,
    "individual_error": individual_error,
    "ensemble_error": ensemble_error,
}
