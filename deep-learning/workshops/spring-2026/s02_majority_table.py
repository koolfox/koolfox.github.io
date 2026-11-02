# هشت ورودی جدول صفحات 21 تا 24،با همان ترتیب سطرها.
inputs = [[1, 0, 0], [1, 0, 1], [1, 1, 0], [1, 1, 1],
          [0, 0, 1], [0, 1, 0], [0, 1, 1], [0, 0, 0]]
# قانون مسئله:دست‌کم دو ورودی 1 باشد.این عدد را عوض کن و برچسب‌های تازه را ببین.
minimum_ones = 2
if type(minimum_ones) is not int or not 0 <= minimum_ones <= 4:
    raise ValueError("آستانه باید عدد صحیحی بین 0 و 4 باشد.")
if any(len(row) != 3 or any(bit not in (0, 1) for bit in row) for row in inputs):
    raise ValueError("هر سطر باید سه ورودی دودویی 0 یا 1 داشته باشد.")
truth_table = []
for row in inputs:
    ones = sum(row)
    # خروجی‌های این مثال−1 و+1 اند؛نه 0 و 1.
    target = 1 if ones >= minimum_ones else -1
    truth_table.append({"inputs": row, "ones": ones, "target": target})
result = {"truth_table": truth_table, "targets": [row["target"] for row in truth_table]}
