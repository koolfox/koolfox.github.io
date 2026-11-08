# بازسازی محاسبه چاپ‌شده در اسلایدهای 33 تا 36؛ اعداد ورودی از خود تصویر هستند.
from math import exp, tanh

# ستون‌ها به ترتیب واژگان h، e، l، o هستند.
vocabulary = ['h', 'e', 'l', 'o']
input_weights = [
    [0.287027359, 0.84606, 0.572392, 0.486813],
    [0.902874425, 0.871522, 0.691079, 0.18998],
    [0.537523791, 0.09224, 0.558159, 0.491528],
]
# در تصویر وزن بازگشتی یک عدد مشترک است، نه ماتریس کامل.
recurrent_weight = 0.427043
bias = 0.567001
state = [0.0, 0.0, 0.0]
states = []
for character in ['h', 'e']:
    column = vocabulary.index(character)
    # هر ردیف یک مولفه از حالت پنهان را به‌روز می‌کند.
    state = [tanh(recurrent_weight * previous + row[column] + bias)
             for row, previous in zip(input_weights, state)]
    states.append(state)

# ضرایب و فرض بایاس صفر از صفحه 36 هستند؛ به علت گردشدن اعداد در تصویر، خروجی تقریبی است.
output_weights = [
    [0.37168, 0.974829459, 0.830034886],
    [0.39141, 0.282585823, 0.659835709],
    [0.64985, 0.09821557, 0.334287084],
    [0.91266, 0.32581642, 0.144630018],
]
logits = [sum(weight * value for weight, value in zip(row, state))
          for row in output_weights]
# کم کردن بیشینه برای پایداری عددی، احتمال‌های Softmax را تغییر نمی‌دهد.
exponentials = [exp(value - max(logits)) for value in logits]
probabilities = [value / sum(exponentials) for value in exponentials]
result = {
    'states': [[round(value, 6) for value in row] for row in states],
    'logits': [round(value, 6) for value in logits],
    'probabilities': [round(value, 6) for value in probabilities],
    'prediction': vocabulary[max(range(len(probabilities)), key=lambda i: probabilities[i])],
}
