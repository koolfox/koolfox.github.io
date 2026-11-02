# اعداد همان سناریوی آموزشی اسلاید هستند، نه قیمت فعلی بازار.
buy_price = 40000.0
hourly_rent = 20.0
weeks = 4
hours_per_day = 24
if buy_price < 0 or hourly_rent <= 0 or weeks < 0 or not 0 <= hours_per_day <= 24:
    raise ValueError("قیمت خرید و هفته نامنفی، اجاره مثبت و ساعت روز بین صفر و24 باشد.")
# چهار هفتهٔ هفت‌روزه با استفادهٔ شبانه‌روزی را حساب می‌کنیم.
hours = weeks * 7 * hours_per_day
rental_cost = hours * hourly_rent
# این نقطهٔ سربه‌سر فقط هزینهٔ مستقیم خرید و اجاره را مقایسه می‌کند.
# برق، نگهداری، ارزش فروش و هزینهٔ سرمایه در صورت مسئله داده نشده‌اند.
break_even_hours = buy_price / hourly_rent
result = {"hours": hours, "rental_cost": rental_cost,
          "buy_price": buy_price, "buy_minus_rental": buy_price - rental_cost,
          "break_even_hours": break_even_hours}
