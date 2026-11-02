# هشت ورودی با همان ترتیب جدول صفحهٔ 24؛ ترتیب آموزش را می‌توان تغییر داد.
inputs = [[1, 0, 0], [1, 0, 1], [1, 1, 0], [1, 1, 1],
          [0, 0, 1], [0, 1, 0], [0, 1, 1], [0, 0, 0]]
# هدف: اگر دست‌کم دو ورودی یک باشند خروجی +1، وگرنه −1.
targets = [-1, 1, 1, 1, -1, -1, 1, -1]
learning_rate = 0.1
# وزن اول بایاس است؛ برای آن یک ورودی ثابت برابر 1 اضافه می‌کنیم.
weights = [0.0, 0.0, 0.0, 0.0]
if learning_rate < 0:
    raise ValueError("نرخ یادگیری باید نامنفی باشد.")
if len(inputs) != len(targets) or any(len(row) != 3 for row in inputs):
    raise ValueError("هر نمونه باید سه ورودی و یک برچسب داشته باشد.")
if any(y not in (-1, 1) for y in targets):
    raise ValueError("برچسب‌ها باید −1 یا +1 باشند.")
trace = []
for row, target in zip(inputs, targets):
    augmented = [1] + row
    score = sum(w * x for w, x in zip(weights, augmented))
    # قرارداد اسلاید: امتیاز صفر نیز به کلاس +1 تعلق دارد.
    prediction = 1 if score >= 0 else -1
    error = target - prediction
    # قانون پرسپترونِ منبع از خطای برچسب ±1 استفاده می‌کند؛ تغییر غیرصفر اندازهٔ 0.2 دارد.
    weights = [w + learning_rate * error * x for w, x in zip(weights, augmented)]
    trace.append({"score": score, "prediction": prediction, "target": target,
                  "error": error, "weights": list(weights)})
# این فقط یک دور است؛ پایان یک دور الزاماً به معنی همگرایی مدل نیست.
final_predictions = [1 if sum(w*x for w,x in zip(weights, [1]+row)) >= 0 else -1
                     for row in inputs]
result = {"trace": trace, "final_weights": weights, "final_predictions": final_predictions,
          "final_errors": sum(p != y for p, y in zip(final_predictions, targets))}
