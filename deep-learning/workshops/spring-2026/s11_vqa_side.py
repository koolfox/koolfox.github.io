# این ده پاسخ عین رشته‌های مثال منبع‌اند؛ «right side» را با «right» یکی نمی‌کنیم.
human_answers = [
    "right", "left", "right", "right", "right", "right",
    "right side", "right", "center", "right",
]

# پیش‌بینی را به left یا right side تغییر بده و پیش از اجرا امتیاز را حدس بزن.
prediction = "left"


def normalized(answer):
    # فقط فاصلهٔ ابتدا و انتها و بزرگی حروف را یکسان می‌کنیم؛ مترادف‌ها جدا می‌مانند.
    return answer.strip().lower()


def agreement_score(answer, references):
    # فرمول روی اسلاید: تعداد پاسخ‌های مطابق، تقسیم بر ۳؛ سقف امتیاز برابر یک است.
    matching = sum(normalized(item) == normalized(answer) for item in references)
    return min(matching / 3.0, 1.0)


def held_out_score(answer, references):
    # در جزئیات صفحهٔ ۲۲، هر بار یک پاسخ انسانی کنار گذاشته می‌شود؛ اینجا ۱۰ دور داریم.
    if len(references) != 10:
        raise ValueError("قرارداد این مثال VQA به دقیقاً 10 پاسخ انسانی نیاز دارد.")
    rounds = []
    for omitted in range(len(references)):
        remaining = references[:omitted] + references[omitted + 1:]
        rounds.append(agreement_score(answer, remaining))
    # میانگین ده امتیاز، تفاوت ارزیابی ۹ پاسخ و استفادهٔ مستقیم از هر ۱۰ پاسخ را نشان می‌دهد.
    return sum(rounds) / len(rounds)


# همهٔ گزینه‌های صفحه را مقایسه می‌کنیم؛ bottom در میان پاسخ‌های انسانی نیست.
candidates = ["right", "left", "right side", "center", "bottom"]
result = {
    "prediction": prediction,
    "direct_score": agreement_score(prediction, human_answers),
    "held_out_score": held_out_score(prediction, human_answers),
    "scores": {item: held_out_score(item, human_answers) for item in candidates},
    "answer_count": len(human_answers),
}

print(result)
