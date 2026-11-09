import math

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


# نقاط زیر برای خواندن نمودارهای صفحه 51 نمونه آموزشی هستند.
points = [-4, -3, -2, -1, 0, 1, 2, 3, 4]
linear_derivative = [1.0 for x in points]
sigmoid_derivative = []
tanh_derivative = []
for x in points:
    sigmoid = 1 / (1 + math.exp(-x))
    sigmoid_derivative.append(sigmoid * (1 - sigmoid))
    tanh_derivative.append(1 - math.tanh(x) ** 2)
result.update({'points': points, 'linear_derivative': linear_derivative,
               'sigmoid_derivative': sigmoid_derivative, 'tanh_derivative': tanh_derivative})
print('این ضرب تنها بخشی از زنجیره است؛ وزن ها و مشتق زیان هم بر گرادیان کامل اثر دارند.')
print('نقاط نمودار آموزشی هستند و برنامه شبکه ای را آموزش نمیدهد.')
