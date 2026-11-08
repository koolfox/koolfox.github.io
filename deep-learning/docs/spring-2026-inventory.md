# فهرست بازتولیدپذیر صفحه های بهار ۲۰۲۶

از ریشه مخزن:

```sh
python3 deep-learning/scripts/inventory_spring_2026.py --output /tmp/spring26-inventory
python3 -m unittest discover -s deep-learning/tests -p 'test_inventory_spring_2026.py'
```

برای بررسی فایل های ساخته شده محلی، مسیر پوشه `deep-learning` از خروجی ساخت را با `--artifact /path/to/build/deep-learning` بدهید. خروجی بیرون از مخزن و در پوشه خالی ذخیره میشود: `pages.jsonl` یک رکورد برای هر صفحه، `summary.json` آمار و commit، و `index.html` فهرست قابل جستجو را دارد. بدون `--artifact` وضعیت فایل های مستقل «بررسی نشده» است. اگر artifact داده شود، ابزار manifest و هش فایل های موجود را با منبع محلی تطبیق میدهد؛ این بررسی به معنای تایید نسخه عمومی یا انتشار نیست.

سیاست `full_pdf` و علت آن از فهرست ثابت fallback هنگام ساخت گرفته میشود. برچسب های `text_reviewed`، `image_text_reviewed` و `visual_reviewed` از داده مخزن خوانده میشوند و معادل پذیرش دستی مستقل نیستند. وضعیت رندر و علت fallback رندر در همه ردیف ها «مشاهده نشده» است؛ تعیین آنها به اجرای واقعی مرورگر و بررسی همان نسخه نیاز دارد. این ابزار آزمون نمایش، خوانایی، درستی علمی یا مجوز محتوا نیست.
