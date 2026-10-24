# آماده‌سازی، تعادل‌یابی و زمان

پس از تمرین ساده، [کارگاه MD واقعیِ یوبیکوئیتین](../md-training-workshop.fa.md) مسیر نصب، توپولوژی، آب و یون، کمینه‌سازی، تعادل‌یابی و تحلیل را با دستورهای جدا توضیح می‌دهد. این دستورکار در محیط توسعه اجرا نشده و باید روی دستگاه شما مرحله‌به‌مرحله کنترل شود.

نصب و اجرای فرمان‌ها: [دفتر کار نرم‌افزار](../software-workbook.fa.md).

دو فرمان را اجرا کنید:

```sh
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/course_lab.py oscillator --dt 0.01
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/course_lab.py oscillator --dt 0.1
```

initial_energy و maximum_absolute_energy_error را مقایسه کنید؛ با گام کوچک‌تر خطای این مثال باید کمتر باشد. خطا الزاماً رانش یکنواخت نیست. تعداد گام برابر به معنی زمان بی‌بعد برابر نیست؛ برای مقایسهٔ بازهٔ زمانی برابر، حاصل steps×dt را برابر بگیرید. خروجی‌ها را با عنوان «نوسانگر آموزشی» ذخیره کنید.

## معیار پایان تمرین

چک‌لیست شرایط با همهٔ موارد نامعلوم؛ بدون ادعای اجرای موفق.
