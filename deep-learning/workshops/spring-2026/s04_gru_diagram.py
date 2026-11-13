import math

# همه ورودی ها، دروازه ها و وزن های این مثال فرض آموزشی هستند.
input_value = 0.4
previous_hidden = 0.6
reset_gate = 0.5
update_gate = 0.25
input_weight = 0.8
hidden_weight = 0.5
bias = 0.1
if any(not 0 <= gate <= 1 for gate in [reset_gate, update_gate]):
    raise ValueError('دروازه ها باید بین صفر و یک باشند.')

# reset تعیین میکند چه سهمی از حالت قبلی به کاندید برسد.
reset_state = reset_gate * previous_hidden
candidate = math.tanh(input_weight * input_value + hidden_weight * reset_state + bias)
# مطابق شکل صفحه 58، z سهم کاندید و 1-z سهم حالت قبلی است.
# معادله 7 مقاله از قرارداد مکمل استفاده میکند: https://aclanthology.org/D14-1179/
old_contribution = (1 - update_gate) * previous_hidden
new_contribution = update_gate * candidate
hidden = old_contribution + new_contribution
print('مثال شماتیک است؛ مقادیر و وزن ها فرض آموزشی هستند و مدلی آموزش داده نشده است.')
print('طبق شکل: h=(1-z)*h_prev+z*candidate؛ z سهم کاندید است.')
print('در معادله 7 مقاله Cho قرارداد مکمل است: z سهم حالت قبلی است.')
print('صفر و یک برای دروازه sigmoid حالت حدی ایده آل هستند.')
result = {'reset_state': reset_state, 'candidate': candidate,
          'old_contribution': old_contribution, 'new_contribution': new_contribution,
          'hidden': hidden}
