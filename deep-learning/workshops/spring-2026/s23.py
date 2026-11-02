# خروجی خبره‌ها در این مثال ساختگی است.
import math

# امتیاز خام هر خبره؛ افزایش هر مقدار، سهم احتمال همان خبره را بیشتر می‌کند.
logits = [2.0, 1.0, 0.0]
# خروجی عددی فرضی هر خبره؛ تغییرش فقط سهم همان خبره را در جمع وزن‌دار عوض می‌کند.
expert_outputs = [2.0, 10.0, -4.0]
# تعداد خبره‌های فعال؛ افزایش آن محاسبهٔ این جمع را بیشتر می‌کند.
top_k = 2
# دمای بزرگ‌تر احتمال‌ها را هموارتر می‌کند؛ دمای مثبت لازم است.
temperature = 1.0
if type(top_k) is not int or not 1 <= top_k <= len(logits) or temperature <= 0:
    raise ValueError("top_k باید عدد صحیح مجاز و دما مثبت باشد")
if len(logits) != len(expert_outputs) or not all(
    math.isfinite(value) for value in logits + expert_outputs + [temperature]
):
    raise ValueError("top_k و temperature خارج از دامنه‌اند")
# کم‌کردن بیشینه از همهٔ امتیازها مانع سرریز می‌شود و سافت‌مکس را تغییر نمی‌دهد.
shift = max(logits)
# تقسیم بر دما پیش از نمایی‌کردن، تندی توزیع را کنترل می‌کند.
weights = [math.exp((score - shift) / temperature) for score in logits]
# مخرج مشترک باعث می‌شود احتمال همهٔ خبره‌ها روی‌هم یک شوند.
total = sum(weights)
probabilities = [weight / total for weight in weights]
# top-k بر اساس احتمال انتخاب می‌شود؛ در تساوی، ترتیب ورودی قاعدهٔ این تمرین است.
selected = sorted(range(len(logits)), key=lambda i: probabilities[i], reverse=True)[:top_k]
# مانند ضرب وزن در نمودار اسلاید، احتمال خام ضرب می‌شود؛ پس از حذف خبره‌ها بازنرمال نمی‌کنیم.
sparse_output = sum(probabilities[i] * expert_outputs[i] for i in selected)
# حالت چگال همهٔ خبره‌ها را وارد همان محاسبه می‌کند تا اثر حذف قابل مقایسه باشد.
dense_output = sum(p * value for p, value in zip(probabilities, expert_outputs))
result = {
    "selected_experts": [i + 1 for i in selected],  # شماره‌گذاری نمایشی از 1 شروع می‌شود.
    "probabilities": probabilities,
    "sparse_output": sparse_output,
    "dense_output": dense_output,
    # سهم فعال فقط تعداد خبره‌هاست؛ هزینهٔ مسیریاب یا حافظهٔ کل مدل را نشان نمی‌دهد.
    "active_expert_fraction": len(selected) / len(logits),
    "selected_probability_mass": sum(probabilities[i] for i in selected),
}
print(result)
