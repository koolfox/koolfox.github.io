from collections import Counter

# سه پاسخ نمایش داده شده در مسیرهای مختلف اسلاید ۲۳.
path_answers = [18, 26, 18]
# پاسخ مسیر حریصانه که جدا از این سه مسیر نمایش داده شده است.
greedy_answer = 14

# شمارش پاسخ‌ها؛ در تساوی همه برندگان را نگه می‌داریم.
if not path_answers:
    raise ValueError("فهرست پاسخ‌ها نباید خالی باشد.")
counts = Counter(path_answers)
maximum = max(counts.values())
winners = sorted(answer for answer, count in counts.items() if count == maximum)
selected = winners[0] if len(winners) == 1 else None

# داده‌های همان مسئله: تخم‌های تولیدی، مصرف، پخت و قیمت هر تخم.
eggs = 16
breakfast = 3
muffins = 4
price = 2
sold = eggs - breakfast - muffins
correct_income = sold * price

# مسیر میانی اسلاید پاسخ ۲۶ را نوشته، اما عبارت خودش حاصل ۱۸ دارد.
# این اختلاف را حفظ می‌کنیم؛ فهرست بالا داده شکل است، نه خروجی مدل زبانی.
claimed_middle_answer = 26
middle_expression = 2 * (16 - 4 - 3)
result = {
    "answers": path_answers,
    "counts": {str(answer): counts[answer] for answer in sorted(counts)},
    "winners": winners,
    "selected_answer": selected,
    "votes_for_selected": maximum if selected is not None else None,
    "total_paths": len(path_answers),
    "greedy_answer": greedy_answer,
    "eggs_sold": sold,
    "correct_income": correct_income,
    "middle_claimed_answer": claimed_middle_answer,
    "middle_expression_value": middle_expression,
    "middle_claim_is_correct": claimed_middle_answer == middle_expression,
}
print(result)
