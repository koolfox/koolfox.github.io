# ورودی و احتمال‌های نمونهٔ صفحهٔ 17؛ بزرگ‌ترین احتمال هرسر را انتخاب می‌کنیم.
tokens = ["[CLS]", "Paris", "is", "a", "beautiful", "[MASK]", "[SEP]", "I", "love", "Paris", "[SEP]"]
next_sentence_probabilities = {"isNext": 0.9, "NotNext": 0.1}
masked_word_probabilities = {"beautiful": 0.0, "city": 0.9, "paris": 0.0, "love": 0.1, "and": 0.0}
for probabilities in [next_sentence_probabilities, masked_word_probabilities]:
    if not probabilities or any(p < 0 or p > 1 for p in probabilities.values()) or abs(sum(probabilities.values()) - 1) > 1e-9:
        raise ValueError("هر توزیع باید احتمال‌های معتبر با مجموع 1 داشته باشد.")
# سر CLS برای رابطهٔ دو جمله،و سرِ جایگاه MASK برای واژهٔ پوشانده‌شده است.
next_sentence = max(next_sentence_probabilities, key=next_sentence_probabilities.get)
masked_word = max(masked_word_probabilities, key=masked_word_probabilities.get)
result = {"token_count": len(tokens), "next_sentence_prediction": next_sentence,
          "masked_word_prediction": masked_word,
          "next_sentence_probability": next_sentence_probabilities[next_sentence],
          "masked_word_probability": masked_word_probabilities[masked_word]}
