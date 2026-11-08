# چهار ورودی و خروجی همان جدول XOR در صفحه ۴۴.
inputs = [[0, 0], [0, 1], [1, 0], [1, 1]]
targets = [0, 1, 1, 0]

# این سه عدد خط مرز را تعیین می‌کنند؛ آنها را تغییر بده و خروجی را مقایسه کن.
w1 = 1.0
w2 = 1.0
bias = -0.5

# امتیاز صفر و بالاتر، کلاس یک است؛ در غیر این صورت کلاس صفر است.
scores = [w1 * x1 + w2 * x2 + bias for x1, x2 in inputs]
predictions = [1 if score >= 0 else 0 for score in scores]
correct = sum(prediction == target for prediction, target in zip(predictions, targets))

# ردیف‌ها به همان ترتیب اسلاید نمایش داده می‌شوند.
for row, target, score, prediction in zip(inputs, targets, scores, predictions):
    print(row, 'هدف:', target, 'امتیاز:', score, 'پیش‌بینی:', prediction)
print('تعداد درست:', correct, 'از', len(inputs))
result = {'inputs': inputs, 'targets': targets, 'scores': scores,
          'predictions': predictions, 'correct': correct}
