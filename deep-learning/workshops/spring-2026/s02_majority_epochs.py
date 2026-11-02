from fractions import Fraction

# ورودی‌ها،ترتیب و برچسب‌های همان جدول منبع.
inputs = [[1, 0, 0], [1, 0, 1], [1, 1, 0], [1, 1, 1],
          [0, 0, 1], [0, 1, 0], [0, 1, 1], [0, 0, 0]]
targets = [-1, 1, 1, 1, -1, -1, 1, -1]
learning_rate = 0.1
epochs = 6
# در آستانهٔ صفر،خطای خیلی کوچک float می‌تواند برچسب را عوض کند؛ 0.1 را دقیقاً 1/10 می‌گیریم.
rate = Fraction(str(learning_rate))
if rate < 0 or type(epochs) is not int or not 0 <= epochs <= 1000:
    raise ValueError("نرخ باید نامنفی و تعداد دور صحیحی بین 0 و 1000 باشد.")
if not inputs or len(inputs) != len(targets) or any(len(row) != 3 for row in inputs):
    raise ValueError("هر نمونه باید سه ورودی و یک هدف داشته باشد.")
if any(bit not in (0, 1) for row in inputs for bit in row) or any(y not in (-1, 1) for y in targets):
    raise ValueError("ورودی‌ها دودویی و هدف‌ها−1 یا+1 هستند.")
# مقادیرِدودویی 0.0 و 1.0 را هم به 0 و 1 صحیح تبدیل می‌کنیم تا حساب کسری دقیق بماند.
inputs = [[int(bit) for bit in row] for row in inputs]
targets = [int(y) for y in targets]
weights = [Fraction(0)] * 4
history = [{"epoch": 0, "weights": [0.0] * 4, "training_errors": sum(target != 1 for target in targets)}]
for epoch in range(1, epochs + 1):
    online_mistakes = 0
    for row, target in zip(inputs, targets):
        augmented = [1] + row
        score = sum(w * x for w, x in zip(weights, augmented))
        prediction = 1 if score >= 0 else -1
        error = target - prediction
        online_mistakes += int(error != 0)
        weights = [w + rate * error * x for w, x in zip(weights, augmented)]
    # ارزیابی پایان دور با همان یک مجموعه وزن؛با خطاهای هنگام عبور یکی نیست.
    predictions = [1 if sum(w * x for w, x in zip(weights, [1] + row)) >= 0 else -1
                   for row in inputs]
    errors = sum(p != y for p, y in zip(predictions, targets))
    history.append({"epoch": epoch, "weights": [float(w) for w in weights],
                    "online_mistakes": online_mistakes, "training_errors": errors})
result = {"history": history, "final_weights": [float(w) for w in weights],
          "final_training_errors": history[-1]["training_errors"]}
