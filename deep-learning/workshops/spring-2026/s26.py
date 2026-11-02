# داده‌های این مثال یک‌بعدی و ساختگی‌اند.
# نمونه‌ها را تغییر بده؛ نقاط دورافتاده بر انتخاب و شعاع پوشش اثر می‌گذارند.
points = [0.0, 0.1, 0.2, 4.9, 5.0, 5.1, 9.9, 10.0]
budget = 2  # تعداد نماینده‌ها؛ مقدار 3 باید پوشش این داده را بهتر کند.


def distance_to_set(point, representatives):
    # کمترین فاصله تا نماینده‌ها؛ اینجا فاصلهٔ اقلیدسی در یک بُعد است.
    return min(abs(point - chosen) for chosen in representatives)


if not points:
    raise ValueError("فهرست نقاط نباید خالی باشد.")
if type(budget) is not int or not 1 <= budget <= len(points):
    raise ValueError("بودجه باید عدد صحیح مثبت و حداکثر برابر تعداد نقاط باشد.")

# نقطهٔ نخست بذر ثابت است؛ عوض‌کردن بذر می‌تواند نتیجهٔ حریصانه را عوض کند.
selected = [points[0]]
while len(selected) < min(budget, len(points)):
    # دورترین نمونه از مجموعهٔ فعلی را می‌افزاییم؛ این آموزش شبکه نیست.
    candidate = max(points, key=lambda p: distance_to_set(p, selected))
    if distance_to_set(candidate, selected) == 0:
        break  # همهٔ مختصات پوشش یافته‌اند؛ نمایندهٔ تکراری نمی‌افزاییم.
    selected.append(candidate)

# بدترین فاصلهٔ پوشش را محاسبه می‌کنیم؛ مقدار کمتر یعنی پوشش هندسی بهتر.
radius = max(distance_to_set(point, selected) for point in points)
result = {
    "selected": selected,
    "coverage_radius": radius,
    "fraction_kept": len(selected) / len(points),  # سهم دادهٔ نگه‌داشته‌شده.
}
print(result)
