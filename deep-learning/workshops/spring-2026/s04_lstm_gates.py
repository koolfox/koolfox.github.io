import math

# همه مقدارهای زیر فرض آموزشی هستند؛ اسلاید وزن یا داده عددی مشخص نمیکند.
previous_cell = 0.6
candidate = -0.4
input_gate = 0.25
forget_gate = 0.75
output_gate = 0.5
if any(not 0 <= gate <= 1 for gate in [input_gate, forget_gate, output_gate]):
    raise ValueError('دروازه ها باید بین صفر و یک باشند.')
if not -1 <= candidate <= 1:
    raise ValueError('کاندید tanh باید بین منفی یک و یک باشد.')

# هر دروازه سهم خودش را کنترل میکند؛ جمع دو سهم حالت سلول را میسازد.
old_contribution = forget_gate * previous_cell
new_contribution = input_gate * candidate
cell = old_contribution + new_contribution
hidden = output_gate * math.tanh(cell)
print('این سلول شماتیک است؛ مقادیر فرض آموزشی هستند و مدلی آموزش داده نشده است.')
print('صفر و یک برای دروازه های sigmoid حالت حدی و ایده آل هستند.')
print('فراموشی صفر فقط سهم گذشته را حذف میکند؛ ورودی جدید هنوز میتواند غیرصفر باشد.')
result = {'old_contribution': old_contribution, 'new_contribution': new_contribution,
          'cell': cell, 'hidden': hidden}
