# داده‌ها و فرض‌های برآورد جمع‌آوری کپشن در صفحهٔ13.
captions = 1026459
seconds_per_caption = 30
hourly_pay = 15.0
hours_per_week = 40
weeks_per_year = 52
if captions < 0 or seconds_per_caption < 0 or hourly_pay < 0 or hours_per_week <= 0 or weeks_per_year <= 0:
    raise ValueError("تعداد و هزینه نامنفی و ساعت کار سالانه مثبت باشد.")
# ابتدا ثانیه را به ساعت تبدیل می‌کنیم؛ سپس هزینه و سال-نفر را می‌یابیم.
hours = captions * seconds_per_caption / 3600
cost = hours * hourly_pay
years = hours / (hours_per_week * weeks_per_year)
result = {"hours": hours, "cost_dollars": cost, "person_years": years,
          "annual_pay_dollars": hourly_pay * hours_per_week * weeks_per_year}
