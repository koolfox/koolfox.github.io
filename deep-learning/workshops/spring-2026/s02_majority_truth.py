# جدول همان مثال صفحه‌های ۲۱ تا ۲۴: ورودی‌ها به همان ترتیب نوشته شده‌اند.
inputs = [[1, 0, 0], [1, 0, 1], [1, 1, 0], [1, 1, 1],
          [0, 0, 1], [0, 1, 0], [0, 1, 1], [0, 0, 0]]


def majority(row):
    # مقدار هدف +1 است اگر دست‌کم دو ورودی 1 باشند؛ وگرنه -1.
    return 1 if sum(row) >= 2 else -1


if any(len(row) != 3 or any(value not in (0, 1) for value in row) for row in inputs):
    raise ValueError('هر ورودی باید سه مقدار دودویی داشته باشد.')
targets = [majority(row) for row in inputs]
for row, target in zip(inputs, targets):
    print(row, '→', target)
result = {'inputs': inputs, 'targets': targets}
