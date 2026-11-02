# همان دو جملهٔ مثال صفحهٔ62؛برای تغییر آزمایش،این دو متن را ویرایش کن.
reference_text = "The sun makes it look like uh a warm, day to go outside to adventure."
prediction_text = "The son makes it to bike with a swarm to go outside to Denver today."
# در این مثال حروف کوچک و ویرگول/نقطه نادیده گرفته می‌شوند؛uhیک واژه است.
def words(text):
    return text.lower().replace(",", "").replace(".", "").split()
reference = words(reference_text)
prediction = words(prediction_text)
if not reference:
    raise ValueError("برایWERمرجع باید دست‌کم یک واژه داشته باشد.")
# خانهٔ[i][j]کمترین تعداد ویرایش برای تبدیلiواژهٔمرجع بهjواژهٔپیش‌بینی است.
distance = [[0] * (len(prediction) + 1) for _ in range(len(reference) + 1)]
for i in range(len(reference) + 1):
    distance[i][0] = i  # تبدیل به متن خالی:حذف همهٔواژه‌ها
for j in range(len(prediction) + 1):
    distance[0][j] = j  # تولید از متن خالی:درج همهٔواژه‌ها
for i in range(1, len(reference) + 1):
    for j in range(1, len(prediction) + 1):
        substitution = int(reference[i - 1] != prediction[j - 1])
        distance[i][j] = min(distance[i - 1][j] + 1,  # حذف
                             distance[i][j - 1] + 1,  # درج
                             distance[i - 1][j - 1] + substitution)  # تطبیق/جایگزینی
errors = distance[-1][-1]
# تعداد خطا بر تعداد کلمات مرجع تقسیم می‌شود؛WERمی‌تواند بیش از1باشد.
result = {"reference_words": reference, "prediction_words": prediction,
          "reference_length": len(reference), "minimum_edits": errors,
          "word_error_rate": errors / len(reference)}
# شمارش رنگیِ خوداسلاید تنها برای همین دو جمله معتبر است.
if reference == words("The sun makes it look like uh a warm day to go outside to adventure") and prediction == words("The son makes it to bike with a swarm to go outside to Denver today"):
    result["source_alignment_counts"] = {"substitutions": 6, "insertions": 1, "deletions": 1}
