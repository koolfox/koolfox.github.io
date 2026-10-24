# RMSD و تطابق اتمی

نصب و اجرای فرمان‌ها: [دفتر کار نرم‌افزار](../software-workbook.fa.md).

از ریشهٔ مخزن، محیط و مثال را اجرا کنید:

```sh
uv sync --project structural-bioinformatics --frozen
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/course_lab.py geometry --shift 10
```

خروجی برای CA زنجیرهٔ A باید ۱۵۲ اتم، RMSD خام ۱۰ و RMSD پس از حذف انتقال نزدیک صفر داشته باشد. این مثال فقط انتقال را حذف می‌کند، نه چرخش عمومی را. shift را به ۲۰ تغییر دهید و پیش از اجرا خروجی را پیش‌بینی کنید. اگر uv پیدا نشد، راهنمای نصب رسمی آن را بخوانید؛ خطای نصب را نتیجهٔ علمی محسوب نکنید.

## معیار پایان تمرین

نگاشت زنجیره‌ها، تعداد جفت‌ها، فاصلهٔ پیش/پس و توضیح گپ‌ها.
