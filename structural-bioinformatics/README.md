# بیوانفورماتیک ساختاری

[صفحهٔ اصلی](https://koolfox.github.io/structural-bioinformatics/) فهرست نه بخش مستقل است. برای استفاده از یک ابزار یا منبع، انتخاب فصل یا دنبال‌کردن مسیر پژوهش لازم نیست.

| بخش | ورودی |
|---|---|
| درس و سیلابس | [course.html](course.html)؛ نه فصل و سی مبحث درسی |
| پژوهش | [research.html](research.html)؛ سؤال، روش، گزارش و پیش‌نویس سوروی |
| کتابخانه | [library.html](library.html)؛ جست‌وجو و خواندن متن‌ها |
| مقاله‌ها و بررسی‌ها | [papers.html](papers.html)؛ منبع، روش، یافته و نقد |
| ساختار و نمایش سه‌بعدی | [structures.html](structures.html)؛ مدل، زنجیره، توالی و شکل |
| دیتاست‌ها | [datasets.html](datasets.html)؛ شناسه، طراحی، منبع و فایل |
| داکینگ مولکولی | [docking.html](docking.html)؛ دستورکار و اعتبارسنجی |
| تمرین‌ها و آزمون‌ها | [exercises.html](exercises.html)؛ دستورکار، خودآزمایی و یادداشت |
| اسلایدها و ارائه | [presentations.html](presentations.html)؛ انتخاب فصل و یادداشت گوینده |

## منابع محتوا

`data/metadata/site-sections.json` فهرست بخش‌ها و متن‌های مرتبط را مشخص می‌کند. `scripts/build_section_pages.py` صفحه‌ها را از `templates/` می‌سازد. فایل‌های علمی و ابزارها در صفحهٔ اختصاصی خود استفاده می‌شوند؛ نسخهٔ مخفیِ رابط قدیمی وجود ندارد. نشانی‌های قدیمی از طریق `legacy-routes.js` به صفحهٔ مناسب هدایت می‌شوند.

سرفصل درس از [درس ۴۰۵۵۳ شریف](https://docs.ce.sharif.edu/courses/40553) آمده است. مباحث در `learning-course.json` و درس‌ها در `docs/course/` هستند. دستور تمرین در `docs/exercises/`، یادداشت پژوهش در `docs/research-notes/` و یادداشت گوینده در `docs/presentation-notes/` جدا نگه‌داری می‌شوند. `course-sessions.fa.md` فقط درسنامه را یک‌جا گردآوری می‌کند. نقشهٔ `course-map.json` برای انتخاب اسلایدهای مرتبط حفظ شده است؛ ابزارها را به فصل جاری مقید نمی‌کند.

## اجرا و بازسازی

از ریشهٔ مخزن:

```sh
uv sync --project structural-bioinformatics --frozen
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

## داده و حدود شواهد

پرسش مرور، ارتباط آدالیموماب با تغییر بیان TOP2A در سلول‌های ایمنیِ فعال‌شده است. [پرسش](docs/research-questions.fa.md)، [روش مرور](docs/survey-protocol.fa.md) و [پیش‌نویس](docs/survey-draft.fa.md) در بخش پژوهش قرار دارند. جست‌وجو و غربالگری کامل نشده و بازتحلیل RNA توصیفی است. تماس هندسی، فراوانی RNA، فعالیت آنزیم و پاسخ بیمار اندازه‌گیری‌های متفاوت‌اند.

منابع، UTC، SHA-256 و پارامترها در `data/metadata/` و خروجی‌های کوچک در `data/processed/` هستند. PDF ناشر و دادهٔ فردی تازه منتشر نمی‌شوند. پاسخ‌های آزمون و یادداشت‌ها با همان کلیدهای قبلی در مرورگر ذخیره می‌شوند؛ پاک‌کردن داده‌های مرورگر آن‌ها را حذف می‌کند. فایل‌های اصلی اسلایدها و دفترهای تحلیل نیز حفظ شده‌اند.
