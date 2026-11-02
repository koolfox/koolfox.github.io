# توزیع احتمال چاپ‌شده در صفحهٔ 37؛ این اعداد خروجی‌اند، نه logit ورودی Softmax.
vocabulary = ["h", "e", "l", "o"]
probabilities = [0.419748, 0.194682, 0.162429, 0.223141]
if len(vocabulary) != len(probabilities) or not probabilities:
    raise ValueError("هر حرف باید یک احتمال داشته باشد.")
if any(p < 0 or p > 1 for p in probabilities) or abs(sum(probabilities)-1) > 1e-9:
    raise ValueError("احتمال‌ها باید بین 0 و 1 و مجموعشان 1 باشد.")
# سیاستِ مثال، argmax است: بیشترین احتمال را انتخاب می‌کنیم؛ نمونه‌گیری تصادفی نیست.
predicted_index = max(range(len(probabilities)), key=lambda i: probabilities[i])
result = {"classes": len(vocabulary), "probability_sum": sum(probabilities),
          "predicted_index": predicted_index, "prediction": vocabulary[predicted_index]}
