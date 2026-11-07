# محاسبه نمونه زنجیره مشتق ها در صفحه 52؛ تعداد عوامل و مقدار هر عامل را تغییر بده.
local_derivative = 0.25
steps = 4
if steps < 1 or not 0 <= local_derivative <= 1:
    raise ValueError('تعداد گام باید مثبت و مشتق بین صفر و یک باشد.')

# هر گام سهم سیگنال قبلی را در مشتق همان گام ضرب می کند.
signal = 1.0
signals = []
for step in range(steps):
    signal *= local_derivative
    signals.append(signal)

# مقدار دقیق این محاسبه 0.00390625 است؛ اسلاید آن را 0.004 گرد کرده است.
result = {'signals': signals, 'final': signal, 'rounded_source': round(signal, 3)}
