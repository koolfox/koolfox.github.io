# جدول صفحات51تا53؛ Costدر سرستون به معنی فراوانی است.
word_frequencies = {"cost": 2, "best": 2, "menu": 1, "men": 1, "camel": 1}
target_vocabulary_size = 14
# 0،1،2 به‌ترتیب مرحله‌های صفحات51،52،53را انتخاب می‌کنند.
selected_round = 2
if any(not word or type(count) is not int or count < 1 for word, count in word_frequencies.items()):
    raise ValueError("هر واژه باید غیرخالی و فراوانی آن صحیح مثبت باشد.")
# در آغاز هر نویسه یک نماد است؛ فاصله یا نشانگر پایان به مثال اضافه نمی‌کنیم.
tokens = {word: list(word) for word in word_frequencies}
vocabulary = sorted({symbol for symbols in tokens.values() for symbol in symbols})
if type(target_vocabulary_size) is not int or not len(vocabulary) <= target_vocabulary_size <= 1000:
    raise ValueError("اندازهٔ واژگان باید دست‌کم اندازهٔ الفبای اولیه و حداکثر1000باشد.")
illustrated_pairs = [("s", "t"), ("m", "e"), ("me", "n")]
trace = []
while len(vocabulary) < target_vocabulary_size:
    pair_counts = {}
    for word, symbols in tokens.items():
        # فراوانی واژه در تعداد رخداد زوجِ همسایه ضرب می‌شود.
        for left, right in zip(symbols, symbols[1:]):
            pair = (left, right)
            pair_counts[pair] = pair_counts.get(pair, 0) + word_frequencies[word]
    if not pair_counts:
        break
    highest = max(pair_counts.values())
    candidates = sorted(pair for pair, count in pair_counts.items() if count == highest)
    # مرحلهٔ سوم تساوی دارد؛ همان انتخاب مجازِ نمایش‌داده‌شده در اسلاید را اولویت می‌دهیم.
    preferred = illustrated_pairs[len(trace)] if len(trace) < len(illustrated_pairs) else None
    selected = preferred if preferred in candidates else candidates[0]
    merged_symbol = selected[0] + selected[1]
    for word, symbols in tokens.items():
        updated = []
        index = 0
        while index < len(symbols):
            if index + 1 < len(symbols) and (symbols[index], symbols[index + 1]) == selected:
                updated.append(merged_symbol)
                index += 2
            else:
                updated.append(symbols[index])
                index += 1
        tokens[word] = updated
    if merged_symbol not in vocabulary:
        vocabulary.append(merged_symbol)
    # زوج‌های هم‌امتیاز را نگه می‌داریم تا یک پاسخِ مجاز را یکتا جا نزنیم.
    trace.append({"selected_pair": list(selected), "frequency": highest,
                  "tied_maximum_pairs": [list(pair) for pair in candidates],
                  "merged_symbol": merged_symbol,
                  "tokens_after": {word: list(parts) for word, parts in tokens.items()}})
if type(selected_round) is not int or selected_round < 0 or (trace and selected_round >= len(trace)):
    raise ValueError("شمارهٔ مرحله باید در بازهٔ مرحله‌های محاسبه‌شده باشد.")
result = {"initial_alphabet_size": len(set("".join(word_frequencies))),
          "vocabulary": vocabulary, "rounds": trace,
          "selected_round": selected_round, "selected": trace[selected_round] if trace else None}
