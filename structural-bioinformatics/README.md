# بیوانفورماتیک ساختاری

دو مسیر اصلی داریم: [سرفصل آموزشی](course.html) برای آموزش عمومی مطابق نه بخش شریف، و [پژوهش](research.html) برای کاربرد آموخته‌ها در مطالعهٔ آدالیموماب و TOP2A. داکینگ و کارگاه آن در آموزش‌اند. دیتاست، ساختار، مقاله، تمرین کاربردی، کتابخانه و ارائهٔ این مطالعه در منوی پژوهش قرار دارند و آدرس‌های مستقل خود را حفظ می‌کنند.

`docs/course/` فقط درس عمومی را نگه می‌دارد. مثال‌های قبلیِ پروژه در `docs/research-notes/lesson-context/` حفظ شده‌اند. `education-research-map.json` کاربرد اختیاری هر فصل در پژوهش و حاصل آن برای مقاله را مشخص می‌کند. `education-content-provenance.json` منابع و هش درس‌ها را ثبت می‌کند. تغییر این ساختار به معنی اجرای آزمایش علمی تازه نیست.

## منابع محتوا

`data/metadata/site-sections.json` دو مسیر اصلی، زیرمجموعه‌ها و متن‌های مرتبط را مشخص می‌کند. `scripts/build_section_pages.py` صفحه‌ها را از `templates/` می‌سازد. فایل‌های علمی و ابزارها در صفحهٔ اختصاصی خود استفاده می‌شوند؛ نسخهٔ مخفیِ رابط قدیمی وجود ندارد. نشانی‌های قدیمی از طریق `legacy-routes.js` به صفحهٔ مناسب هدایت می‌شوند.

سرفصل درس از [درس ۴۰۵۵۳ شریف](https://docs.ce.sharif.edu/courses/40553) آمده است. مباحث در `learning-course.json` و درس‌ها در `docs/course/` هستند. دستور تمرین در `docs/exercises/`، یادداشت پژوهش در `docs/research-notes/` و یادداشت گوینده در `docs/presentation-notes/` جدا نگه‌داری می‌شوند. `course-sessions.fa.md` فقط درسنامه را یک‌جا گردآوری می‌کند. نقشهٔ `course-map.json` برای انتخاب اسلایدهای مرتبط حفظ شده است؛ ابزارها را به فصل جاری مقید نمی‌کند.

## اجرا و بازسازی

درس‌ها اکنون توضیح مفاهیم، مثال حل‌شده، فعالیت عملی و پاسخ تشریحی خودآزمایی دارند. خواندن متن، اجرای فعالیت و توضیح نتیجه به دیگری سه کار جدا هستند؛ زمان پیشنهادی مبحث اول برای مجموع این فعالیت‌هاست و اندازه‌گیری زمان یادگیری دانشجو نیست. فهرست داخلی هر مبحث به تمرین و پاسخ همان متن می‌رسد. شکل‌های محاسباتی با کلیک در اندازهٔ اصلی باز می‌شوند.

تمرین‌های کوچک عمومی با Python 3.10 یا جدیدتر و بدون بستهٔ اضافی اجرا می‌شوند:

```sh
python3 structural-bioinformatics/assets/course/learning_lab.py all
python3 structural-bioinformatics/assets/course/learning_lab.py graph --cutoff 5
```

بخش هندسه از فایل انتخاب‌شدهٔ 1UBQ استفاده می‌کند؛ مثال‌های انرژی، نمونه‌برداری و شبکه ساختگی و آموزشی‌اند. این برنامه MD یا داکینگ اجرا نمی‌کند. برای VMD و GROMACS، دستورکار مرحله‌ای در مباحث ۶–۹ و ۱۹–۲۲ آمده است؛ اجرای آن‌ها باید جدا ثبت شود.

از ریشهٔ مخزن:

```sh
uv sync --project structural-bioinformatics --frozen
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/build_education_figures.py
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/build_education_metadata.py
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/build_course_sessions.py
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/build_section_pages.py
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/build_chapter_presentation.py
uv run --project structural-bioinformatics pytest -q structural-bioinformatics/tests
uv run --project structural-bioinformatics ruff check structural-bioinformatics
python3 -m http.server 8875 --bind 127.0.0.1
```

بررسی مرورگر:

```sh
RESEARCH_BASE_URL=http://127.0.0.1:8875 npm --prefix structural-bioinformatics/browser-tests test
```

نصب و اجرای محاسبات در [دفتر کار نرم‌افزار](docs/software-workbook.fa.md) توضیح داده شده است. فایل ورودی یا دستورکار MD و VMD، گزارش اجرای موفق نیست. وضعیت واقعی هر تحلیل کنار نتیجه حفظ می‌شود.

بازسازی متادیتا فقط هش‌ها و فهرست پیوندها را تازه می‌کند؛ تاریخ بازبینی علمی منابع را عوض نمی‌کند. گزارش `education-source-access.json` وضعیت دسترسی و هش پاسخ‌های وب را ثبت می‌کند. دریافت HTTP موفق به‌تنهایی بررسی علمی یک منبع محسوب نمی‌شود.

## داده و حدود شواهد

پرسش مرور، ارتباط آدالیموماب با تغییر بیان TOP2A در سلول‌های ایمنیِ فعال‌شده است. [پرسش](docs/research-questions.fa.md)، [روش مرور](docs/survey-protocol.fa.md) و [پیش‌نویس](docs/survey-draft.fa.md) در بخش پژوهش قرار دارند. جست‌وجو و غربالگری کامل نشده و بازتحلیل RNA توصیفی است. تماس هندسی، فراوانی RNA، فعالیت آنزیم و پاسخ بیمار اندازه‌گیری‌های متفاوت‌اند.

منابع، UTC، SHA-256 و پارامترها در `data/metadata/` و خروجی‌های کوچک در `data/processed/` هستند. PDF ناشر و دادهٔ فردی تازه منتشر نمی‌شوند. پاسخ‌های آزمون و یادداشت‌ها با همان کلیدهای قبلی در مرورگر ذخیره می‌شوند؛ پاک‌کردن داده‌های مرورگر آن‌ها را حذف می‌کند. فایل‌های اصلی اسلایدها و دفترهای تحلیل نیز حفظ شده‌اند.
