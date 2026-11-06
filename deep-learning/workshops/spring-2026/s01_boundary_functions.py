# صفحه ۵۳ خط، سهمی و منحنی دلخواه را برای جداسازی x و o مقایسه می‌کند.
# اسلاید مختصات عددی ندارد؛ این ضرایب برای آزمایش قابل تغییرند.
values = [-2, -1, 0, 1, 2]
# خط: y = slope*x + intercept
slope, intercept = 1, 0
# سهمی: y = a*x*x + b*x + c
a, b, c = 1, 0, 0

# خط و سهمی را در همان xها حساب کن؛ ضرایب را عوض کن و خروجی را مقایسه کن.
line = [slope * x + intercept for x in values]
parabola = [a * x * x + b * x + c for x in values]
result = {"x": values, "line": line, "parabola": parabola}
for x, linear_y, quadratic_y in zip(values, line, parabola):
    print(f"x={x:>2}  line={linear_y:>3}  parabola={quadratic_y:>3}")
