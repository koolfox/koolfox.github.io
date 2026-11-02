# توزیع احتمال چاپ‌شده در صفحهٔ 31 ؛ این اعداد خروجی‌اند، نه logit ورودی Softmax.
vocabulary = ["h", "e", "l", "o"]
probabilities = [0.05, 0.65, 0.2, 0.1]
if len(vocabulary) != len(probabilities) or not probabilities:
    raise ValueError("هر حرف باید یک احتمال داشته باشد.")
if any(p < 0 or p > 1 for p in probabilities) or abs(sum(probabilities)-1) > 1e-9:
    raise ValueError("احتمال‌ها باید بین0و1و مجموعشان1باشد.")
# سیاستِ مثال، argmax است: بیشترین احتمال را انتخاب می‌کنیم؛ نمونه‌گیری تصادفی نیست.
predicted_index = max(range(len(probabilities)), key=lambda i: probabilities[i])
result = {"classes": len(vocabulary), "probability_sum": sum(probabilities),
          "predicted_index": predicted_index, "prediction": vocabulary[predicted_index]}
