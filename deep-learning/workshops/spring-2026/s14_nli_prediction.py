# جفت جمله و توزیع کلاس‌های نمایش‌داده‌شده در صفحهٔ 27.
premise = "He is playing"
hypothesis = "He is sleeping"
probabilities = {"contradiction": 1.0, "entailment": 0.0, "neutral": 0.0}
if not probabilities or any(p < 0 or p > 1 for p in probabilities.values()) or abs(sum(probabilities.values()) - 1) > 1e-9:
    raise ValueError("توزیع خروجی باید معتبر و دارای مجموع 1 باشد.")
# در طبقه‌بندی سه‌گانه،برچسب دارای بیشترین احتمال انتخاب می‌شود.
prediction = max(probabilities, key=probabilities.get)
result = {"prediction": prediction, "selected_probability": probabilities[prediction],
          "class_count": len(probabilities)}
