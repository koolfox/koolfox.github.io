# جداسازی پروژه‌های دانشگاهی

این مخزن میزبان چند پروژهٔ مستقل و خروجی عمومی مشترک `koolfox.github.io` است. وجود تاریخچهٔ Git مشترک به معنی مجاز بودن واردکردن کد یا دادهٔ یک پروژه به پروژهٔ دیگر نیست.

| پروژه | کد، داده، محیط اجرا و آزمون‌ها | مسیر انتشار |
| --- | --- | --- |
| بیوانفورماتیک ساختاری | `structural-bioinformatics/` | `/structural-bioinformatics/` |
| یادگیری عمیق | `deep-learning/` | `/deep-learning/` |
| کارپتی | `karpathy/` | `/karpathy/` |
| بهینه‌سازی | `optimization/` | `/optimization/` |
| فرایندهای تصادفی | `stochastic-processes/` | `/stochastic-processes/` |

صفحهٔ اصلی، فونت و ظاهر عمومی زیر `assets/` و ابزارهای انتشار زیر `scripts/` زیرساخت مشترک‌اند. یک پیوند ناوبری به پروژهٔ دیگر مجاز است؛ کپی‌کردن برنامه، خواندن دیتاست یا واردکردن ماژول پروژهٔ خواهر مجاز نیست. آدرس تاریخی `/deep-learning/karpathy/` فقط به `/karpathy/` هدایت می‌شود و نسخهٔ دیگری از کد کارپتی ندارد.

## پوشهٔ کاری هر پروژه

از ریشهٔ مخزن، یک پوشه و شاخهٔ اختصاصی بسازید:

```sh
# پس از به‌روزکردن origin/main
python3 scripts/project_workspace.py structural-bioinformatics --task my-task --path ../structural-my-task
python3 scripts/project_workspace.py deep-learning --task my-task --path ../deep-learning-my-task
```

ابزار، پوشهٔ پروژهٔ انتخاب‌شده و زیرساخت عمومی را با sparse checkout حاضر می‌کند؛ پوشه‌های پروژه‌های خواهر در آن ساخته نمی‌شوند. شاخهٔ پوشه‌های کاری موجود تغییر نمی‌کند. مقصد موجود یا نام شاخهٔ تکراری بازنویسی نمی‌شود.

هر پروژه محیط Python و `node_modules` خودش را نصب می‌کند. به محیط اجرا، خروجی `results/` یا فایل‌های پوشهٔ کاری همکار symlink نزنید. این روش مرز عملی کار است؛ تاریخچهٔ Git و دسترسی سیستم‌عامل همچنان مشترک‌اند و worktree محفظهٔ امنیتی نیست.

## آزمون و ساخت مستقل

دستور آزمون باید مسیر دقیق همان پروژه را داشته باشد. گزینهٔ `uv --project` به‌تنهایی مسیر جمع‌آوری آزمون‌های pytest را عوض نمی‌کند.

```sh
uv run --project structural-bioinformatics pytest -q structural-bioinformatics/tests
npm --prefix structural-bioinformatics/browser-tests test

python3 -m unittest discover -s deep-learning/tests -v
npm --prefix deep-learning/browser-tests test

npm --prefix karpathy/browser-tests test
python3 -m unittest discover -s scripts/tests -v
```

ساخت مستقل، به کد یا runtime پروژهٔ دیگر احتیاج ندارد:

```sh
python3 scripts/build_pages.py --project structural-bioinformatics --output dist/structural/pages
python3 scripts/build_pages.py --project deep-learning --output dist/deep-learning/pages
python3 scripts/build_pages.py --project karpathy --output dist/karpathy/pages
```

دو پروژهٔ دارای آزمایشگاه Python ابتدا runtime خودشان را با اسکریپت export داخل همان پروژه می‌سازند. workflow بیوانفورماتیک فقط همان پروژه را checkout و آزمون می‌کند؛ workflowهای یادگیری عمیق و کارپتی هم مستقل‌اند. انتشار نهایی Pages خروجی‌های عمومی را در مسیرهای جدا کنار هم قرار می‌دهد و هر مجموعهٔ آزمون را با بستهٔ خودش اجرا می‌کند.

## کنترل تغییر و انتشار

- PR معمولی فقط کد یک پروژه را تغییر می‌دهد. تغییر هم‌زمان کد دو پروژه در `Project boundary checks` رد می‌شود؛ مسیر قدیمی و جدید فایل‌های جابه‌جا‌شده هم بررسی می‌شوند.
- شاخهٔ `infrastructure/` فقط برای جابه‌جایی آزمون‌ها و تنظیمات مشترک می‌تواند چند پروژه را درگیر کند؛ این استثنا شامل کد اجرایی یا دیتاست پروژه‌ها نیست.
- ورودی‌های مستقیم انتشار باید در Git ثبت شده باشند. فایل شخصی ثبت‌نشده از زیرپوشهٔ assets وارد خروجی نمی‌شود؛ فایل curated ثبت‌نشده باعث توقف ساخت می‌شود.
- لینک نمادین در ورودی ثبت‌شده یا runtime، و پوشه‌هایی مانند `raw`، `.venv`، `node_modules` و فایل‌های `.env` در خروجی مجاز نیستند.
- runtime تولیدشده ورودی عمومی صریح است. export در CI از checkout تمیز اجرا می‌شود؛ دادهٔ خصوصی نباید داخل برنامهٔ Shiny یا فایل‌های ورودی export قرار بگیرد.
- `_publication.json` مسیر، صاحب و SHA-256 هر فایل منتشرشده را ثبت می‌کند. دادهٔ خام، دادهٔ فردی و فایل محرمانه را در این مخزن عمومی commit نکنید؛ حذف از خروجی سایت، آن را از تاریخچهٔ عمومی Git پنهان نمی‌کند.

## مرز امنیتی مرورگر

`https://koolfox.github.io/deep-learning/` و `https://koolfox.github.io/structural-bioinformatics/` یک مبدأ مرورگر دارند. نام پوشه و نام مستقل کلیدهای ذخیره‌سازی، مجوز دسترسی امنیتی ایجاد نمی‌کند. کد هم‌مبدأ بالقوه می‌تواند منابع عمومی و فضای ذخیره‌سازی همان مبدأ را بخواند. آزمون‌های این مخزن دسترسی معمول برنامه‌ها به فایل‌ها و رکوردهای پروژهٔ خواهر را کنترل می‌کنند؛ این آزمون‌ها جای جداسازی مبدأ را نمی‌گیرند.

برای جدایی امنیتی اطلاعات مرورگر، پروژه‌ها باید مبدأهای جدا، مثلاً میزبان‌های متفاوت، داشته باشند. حفظ همهٔ آدرس‌ها زیر همین hostname با تضمین جدایی امنیتی کامل سازگار نیست. این تغییر زیرساختی خودکار دامنه یا DNS را تغییر نمی‌دهد.

منابع این محدودیت: [سیاست مبدأ مشترک در MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy) و [انواع سایت GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
