# ترتیب واژگان همان مثال است؛ l تکراری فقط یک ورودی واژگان دارد.
vocabulary = ["h", "e", "l", "o"]
text = "hello"
if len(set(vocabulary)) != len(vocabulary) or not vocabulary:
    raise ValueError("واژگان باید غیرخالی و بدون عضو تکراری باشند.")
encoded = []
for token in text:
    if token not in vocabulary:
        raise ValueError("حرف ورودی در واژگان وجود ندارد.")
    # جایگاه حرف 1 و بقیه جایگاه‌ها 0 می‌شوند؛ هر حرف یک بردار جدا دارد.
    vector = [1 if word == token else 0 for word in vocabulary]
    encoded.append(vector)
result = {"vocabulary": vocabulary, "encoded": encoded,
          "sequence_length": len(text), "vocabulary_size": len(vocabulary)}
