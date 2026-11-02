# احتمال‌های مشترکِ مسیرهای برجسته‌شده در شکل؛همهٔ شاخه‌ها عدد ندارند.
# این جدول فقط مسیرهای عدددار منبع را بررسی می‌کند،نه اجرای مدل کپشن کامل.
path_probabilities = {"A": 0.5, "C": 0.4, "AB": 0.2, "AE": 0.25,
                      "ABC": 0.16, "AED": 0.2}
if any(not 0 <= value <= 1 for value in path_probabilities.values()):
    raise ValueError("احتمال مسیر باید بین صفر و یک باشد.")
# احتمال شرطی کلمهٔ آخر = احتمال کل مسیر / احتمال پیشوند آن.
conditional = {}
for path in ["AB", "AE", "ABC", "AED"]:
    prefix = path[:-1]
    parent = path_probabilities[prefix]
    if parent <= 0 or path_probabilities[path] > parent:
        raise ValueError("مسیر فرزند نباید از پیشوندش محتمل‌تر باشد؛پیشوند مثبت لازم است.")
    conditional[path] = path_probabilities[path] / parent
# مقایسهٔ دو کاندید نهاییِ نمایش‌داده‌شده؛نمرهٔ سایر شاخه‌ها معلوم نیست.
final_paths = ["ABC", "AED"]
ranked = sorted(final_paths, key=lambda path: path_probabilities[path], reverse=True)
result = {"path_probabilities": path_probabilities, "conditional_last_token": conditional,
          "final_ranking": ranked, "displayed_beam_width": 2,
          "calls_per_step_for_two_active_prefixes": 2}
