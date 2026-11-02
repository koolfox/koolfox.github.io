# دو دنبالهٔ مثال صفحهٔ15؛ قرار نیست با این کد یک Autoencoderآموزش دهیم.
sequence_a = [30, 27, 22, 11, 6, 8, 7, 2]
sequence_b = [30, 15, 46, 23, 70, 35, 106, 53, 160, 80, 40, 20, 10, 5]
# دنبالهٔBبا یک مقدار آغاز و یک قاعدهٔ مشترک ساخته می‌شود.
start = 30
steps = 14
if type(start) is not int or start < 1 or type(steps) is not int or not 1 <= steps <= 1000:
    raise ValueError("آغاز باید صحیح مثبت و تعداد اعضا بین1و1000باشد.")
computed = [start]
for _ in range(steps - 1):
    previous = computed[-1]
    # اگر زوج است بر2تقسیم کن؛ اگر فرد است سه‌برابر کن و1بیفزا.
    following = previous // 2 if previous % 2 == 0 else 3 * previous + 1
    computed.append(following)
# طول فهرست به‌تنهایی دشواری توصیف را تعیین نمی‌کند؛Bقاعدهٔ کوتاه دارد.
result = {"computed_sequence": computed, "matches_source_b": computed == sequence_b,
          "length_a": len(sequence_a), "length_b": len(sequence_b)}
