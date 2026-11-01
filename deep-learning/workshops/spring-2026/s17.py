# پاسخ‌های این مثال ساختگی‌اند.
from collections import Counter

# هر عدد پاسخ نهایی یک مسیر است؛ تغییر فهرست، توزیع رأی‌ها را عوض می‌کند.
answers = [18, 26, 18, 14, 18, 26, 26]
# تعداد مسیرهای قابل‌استفاده؛ مقدار 7 در این داده تساوی بیشترین رأی ایجاد می‌کند.
n_paths = 5
# این پاسخ فرضیِ رمزگشایی حریصانه فقط برای مقایسه با تجمیع است.
greedy_answer = 14
# فقط n_paths مسیر نخست وارد محاسبه می‌شوند؛ افزایش بودجه، رأی‌های بیشتری اضافه می‌کند.
used = answers[:n_paths]
if not used:
    raise ValueError("حداقل یک مسیر لازم است")
# شمارش بر اساس پاسخ نهایی است، نه درستی توضیح یا طول مسیر.
counts = Counter(used)
# بیشترین فراوانی، معیار خودسازگاری این تمرین است.
maximum_votes = max(counts.values())
# همهٔ برندگان نگه داشته می‌شوند؛ مرتب‌سازی فقط ترتیب نمایش را ثابت می‌کند.
winners = sorted(answer for answer, votes in counts.items() if votes == maximum_votes)
# در تساوی، پاسخ قطعی انتخاب نمی‌کنیم؛ سیاست رفع تساوی باید جدا تعریف شود.
selected = winners[0] if len(winners) == 1 else None
result = {
    "paths_used": len(used),
    "counts": {str(answer): counts[answer] for answer in sorted(counts)},
    "winners": winners,
    "selected_answer": selected,
    # این سهم، میزان توافق مسیرهاست؛ احتمال درستی پاسخ محسوب نمی‌شود.
    "agreement": maximum_votes / len(used),
    "greedy_answer": greedy_answer,
}
print(result)
