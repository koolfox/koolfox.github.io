# دو ماتریس کوچکِ صفحهٔ 10 ؛ الگوی سطر بالا به سطر پایین منتقل شده است.
original = [[1, 1], [0, 0]]
translated = [[0, 0], [1, 1]]
if not original or not original[0] or not translated or not translated[0]:
    raise ValueError("هر دو ورودی باید غیرخالی باشند.")
if len(original) != len(translated) or any(len(row) != len(original[0]) for row in original + translated):
    raise ValueError("دو تصویر باید مستطیلی و هم‌اندازه باشند.")
# Flatten در ترتیب سطری: اول سطر اول، سپس سطر دوم.
flat_original = [value for row in original for value in row]
flat_translated = [value for row in translated for value in row]
# مدل کاملاً متصل در جایگاه‌های ورودی مختلف، مقدارهای متفاوت دریافت می‌کند.
changed_positions = [i for i, (a, b) in enumerate(zip(flat_original, flat_translated)) if a != b]
result = {"flat_original": flat_original, "flat_translated": flat_translated,
          "same_vector": flat_original == flat_translated, "changed_positions": changed_positions}
