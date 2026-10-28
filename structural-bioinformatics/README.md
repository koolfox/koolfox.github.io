# بیوانفورماتیک ساختاری

دو مسیر اصلی داریم: [سرفصل آموزشی](course.html) برای آموزش عمومی مطابق نه بخش شریف، و [پژوهش](research.html) برای کاربرد آموخته‌ها در مطالعهٔ آدالیموماب و TOP2A. داکینگ و کارگاه آن در آموزش‌اند. دیتاست، ساختار، مقاله، تمرین کاربردی، کتابخانه و ارائهٔ این مطالعه در منوی پژوهش قرار دارند و آدرس‌های مستقل خود را حفظ می‌کنند.

`docs/course/` فقط درس عمومی را نگه می‌دارد. مثال‌های قبلیِ پروژه در `docs/research-notes/lesson-context/` حفظ شده‌اند. `education-research-map.json` کاربرد اختیاری هر فصل در پژوهش و حاصل آن برای مقاله را مشخص می‌کند. `education-content-provenance.json` منابع و هش درس‌ها را ثبت می‌کند. تغییر این ساختار به معنی اجرای آزمایش علمی تازه نیست.

## منابع محتوا

`data/metadata/site-sections.json` دو مسیر اصلی، زیرمجموعه‌ها و متن‌های مرتبط را مشخص می‌کند. `scripts/build_section_pages.py` صفحه‌ها را از `templates/` می‌سازد. فایل‌های علمی و ابزارها در صفحهٔ اختصاصی خود استفاده می‌شوند؛ نسخهٔ مخفیِ رابط قدیمی وجود ندارد. نشانی‌های قدیمی از طریق `legacy-routes.js` به صفحهٔ مناسب هدایت می‌شوند.

سرفصل درس از [درس ۴۰۵۵۳ شریف](https://docs.ce.sharif.edu/courses/40553) آمده است. مباحث در `learning-course.json` و درس‌ها در `docs/course/` هستند. دستور تمرین در `docs/exercises/`، یادداشت پژوهش در `docs/research-notes/` و یادداشت گوینده در `docs/presentation-notes/` جدا نگه‌داری می‌شوند. `course-sessions.fa.md` فقط درسنامه را یک‌جا گردآوری می‌کند. نقشهٔ `course-map.json` برای انتخاب اسلایدهای مرتبط حفظ شده است؛ ابزارها را به فصل جاری مقید نمی‌کند.

## اجرا و بازسازی

### آزمایشگاه تعاملی

در مبحث‌های مرتبط، بخش «آزمایش تعاملی» به اجرای همان مفهوم در مرورگر می‌رسد. شش آزمایش در دسترس است: جهت رشتهٔ DNA و مکمل معکوس؛ هم‌ترازی و RMSD؛ احتمال دو حالت؛ کمینه‌سازی؛ میانگین بلوک‌های یک سری؛ و شبکهٔ تماس. انتخاب آزمایش آزاد است و لینک بازگشت، مبحث آغازین را حفظ می‌کند.

محاسبه با Python در Shinylive انجام می‌شود. فایل `assets/course/interactive_lab.py` همان موتور آزمون‌شدهٔ اجرای محلی است؛ JavaScript خروجی آن را رسم می‌کند. برای هر آزمایش می‌توان پیش‌بینی و برداشت را در مرورگر ذخیره کرد و نتیجه، تنظیمات، نسخهٔ محیط و یادداشت‌ها را به صورت JSON دریافت کرد. پاک‌کردن داده‌های مرورگر یادداشت‌ها را حذف می‌کند؛ امکان دریافت فایل در صورت مسدودبودن ذخیرهٔ محلی هم کار می‌کند.

هم‌ترازی Kabsch با وزن برابر روی ۷۶ اتم Cα از ورودی انتخاب‌شدهٔ 1UBQ انجام می‌شود. انتقال و چرخش و تغییر مختصات A:21 ساختهٔ کاربرند. در شبکه، هم ورودی چهارگره‌ای ساختگی و هم همان مختصات واقعی قابل انتخاب‌اند. انرژی و نمونه‌برداری مدل‌های آموزشی‌اند؛ این آزمایشگاه مسیر MD، داکینگ تازه یا ساختار پیش‌بینی‌شده تولید نمی‌کند.

نسخهٔ عمومی ابتدا محیط Python را دریافت می‌کند. در زمان بارگذاری یا شکست دریافت، لینک بازگشت به درس باقی می‌ماند. جدول عددها، نتیجهٔ قابل دریافت و کد محلی برای بررسی روش در دسترس‌اند. منشأ و نسخه‌های مشاهده‌شده در `data/metadata/interactive-lab-provenance.json` و کنترل‌های اجرای مستقل در `data/processed/interactive-lab-controls.json` ثبت شده‌اند.

### ویرایش و اجرای مستقیم کد

لینک «ویرایش و اجرای کد Python» در سرِ آزمایشگاه به محیط کدنویسی می‌رسد. برای هر شش آزمایش، فرمول‌ها و حلقه‌های محاسبه در کد نمونه دیده می‌شوند. جدول پارامترها نام دقیق متغیر، نوع، واحد، مقدار کنترل‌ها و مقدار آخرین اجرای کد را نشان می‌دهد. «گرفتن پارامترهای فعلی» فقط بلوک `parameters` را تازه می‌کند و تغییر الگوریتم را نگه می‌دارد. تغییر کنترل‌ها، پیش‌نویس را خودکار بازنویسی نمی‌کند.

برای نمونه، در کمینه‌سازی می‌توان `energy` و `gradient` را تغییر داد؛ در شبکه می‌توان شرط فاصله و حذف همسایه‌های توالی را عوض کرد؛ و در هندسه می‌توان مجموعهٔ اتم‌های هم‌ترازی و ارزیابی را متفاوت گرفت. چالش هر آزمایش یک پیشنهاد مشخص برای ادامه دارد.

کد با دکمهٔ اجرا یا Ctrl/⌘+Enter اجرا می‌شود. هر اجرا یک Worker تازه در مرورگر دارد و از نشست قبلی متغیر نمی‌گیرد. NumPy و کتابخانهٔ استاندارد Python موجودند؛ `inputs` مختصات Cα، برچسب‌ها و هش همان ورودی 1UBQ را فراهم می‌کند. کد کاربر از مسیر `exec` روی سرور Shiny اجرا نمی‌شود؛ خودِ سرور فقط محاسبات مرجعِ کنترل‌های معمول را دارد. پیش‌نمایش اجرای کد به نسخهٔ exportشده و فایل‌های عمومی سایت نیاز دارد.

خروجی اختیاری `result` می‌تواند این بخش‌ها را داشته باشد:

- `metrics`: فرهنگ نام و عددِ متناهی، تا ۳۲ کمیت.
- `plot`: برچسب محورهای `xlabel` و `ylabel` و حداکثر شش `series`؛ هر سری `points` دوبعدی دارد و `kind` آن `line`، `bar` یا `scatter` است. `equal_aspect=True` برای هندسه مقیاس محورها را برابر می‌کند.
- `table`: نام ستون‌ها در `columns` و ردیف‌ها در `rows`؛ تا ۲۰۰ ردیف و ۱۰ ستون.

مرجع مستقل پیش از اجرای کد، با فرهنگِ صریح `parameters` محاسبه می‌شود. اگر این فرهنگ در زمان اجرا تغییر کند، یا از محدودهٔ مرجع بیرون برود، خروجی کاربر همچنان قابل بررسی است ولی مقایسهٔ نامعتبر کنار گذاشته می‌شود. اختلاف صفر، برابری عددیِ کمیت‌های همنام را نشان می‌دهد؛ تفسیر علمیِ روش تغییرکرده به بررسی خود روش نیاز دارد.

کنسول، خط و نوع خطا را نشان می‌دهد. اجرای محاسبه پس از پنج ثانیه متوقف می‌شود؛ زمان دریافت محیط جداست. توقف دستی نیز Worker را پایان می‌دهد. کد تا ۳۰هزار نویسه، خروجی کنسول تا ۲۰هزار نویسه و نتیجهٔ JSON تا حدود ۵۰۰ کیلوبایت پشتیبانی می‌شود. نمودار حداکثر ۱۰هزار نقطه دارد. خروجی کوتاه‌شده علامت دارد و نتیجهٔ اجرای قبلی پس از ویرایش به‌عنوان نتیجهٔ تازه نمایش داده نمی‌شود.

پیش‌نویس و سه اجرای اخیر برای هر آزمایش در مرورگر نگه‌داری می‌شوند. فایل `.py` کد و ورودی لازم را همراه دارد؛ پروندهٔ JSON نیز کد، پارامترها، خروجی کاربر، مرجع، نسخهٔ محیط و یادداشت‌ها را نگه می‌دارد. در صورت مسدودبودن ذخیرهٔ مرورگر، دریافت فایل همچنان در دسترس است.

ویرایشگر CodeMirror و loader دقیقاً هم‌نسخه با Pyodide صادرشده، در خود سایت میزبانی می‌شوند. بازسازی وابستگی‌ها و نمونه‌ها:

```sh
npm ci --prefix structural-bioinformatics/editor-tools --ignore-scripts
npm --prefix structural-bioinformatics/editor-tools run build
python3 structural-bioinformatics/assets/course/code_recipes.py
```

`code-editor-vendor.json` نسخه‌ها، مجوزها و هش فایل‌ها را ثبت می‌کند. `code-workbench-provenance.json` منشأ اجرای کد را نگه می‌دارد. پس از تغییر این فایل‌ها، export و بررسی نسخهٔ مرورگری را تکرار کنید.

### ساخت و بررسی سایت

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
uv sync --project structural-bioinformatics/playgrounds --frozen
uv run --project structural-bioinformatics/playgrounds python structural-bioinformatics/scripts/export_course_lab.py --output structural-bioinformatics/results/shinylive
uv sync --project deep-learning/playgrounds --frozen
uv run --project deep-learning/playgrounds python deep-learning/scripts/export_playgrounds.py --output deep-learning/results/shinylive
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/build_education_figures.py
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/build_education_metadata.py
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/build_course_sessions.py
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/build_section_pages.py
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/build_chapter_presentation.py
uv run --project structural-bioinformatics pytest -q structural-bioinformatics/tests structural-bioinformatics/tests
uv run --project structural-bioinformatics ruff check structural-bioinformatics
python3 scripts/build_pages.py --project structural-bioinformatics --output dist/pages
python3 -m http.server 8875 --bind 127.0.0.1 --directory dist/pages
```

بررسی مرورگر:

```sh
RESEARCH_BASE_URL=http://127.0.0.1:8875 npm --prefix structural-bioinformatics/browser-tests test
```

پوشهٔ خروجیِ export و ساخت سایت باید خالی باشد. پس از تغییر موتور، کنترل‌های عددی را با `build_course_lab_controls.py` دوباره بسازید؛ سپس export و بررسی مرورگر را تکرار کنید. برای پیش‌نمایش بومی Shiny می‌توان ابتدا بستهٔ مستقل ساخت:

```sh
uv run --project structural-bioinformatics/playgrounds python structural-bioinformatics/scripts/export_course_lab.py --stage-only --output structural-bioinformatics/results/course-lab-source
uv run --project structural-bioinformatics/playgrounds shiny run structural-bioinformatics/results/course-lab-source/app.py --host 127.0.0.1 --port 8879
```

در این پیش‌نمایش، Python روی رایانهٔ میزبان Shiny اجرا می‌شود؛ آزمون‌های `structural-lab.spec.js` نسخهٔ صادرشدهٔ مرورگری را جدا اجرا و با شش نتیجهٔ Python بومی مقایسه می‌کنند. این دو اجرا می‌توانند نسخه‌های متفاوت Python و NumPy داشته باشند؛ نسخهٔ واقعی در فایل نتیجه ثبت می‌شود.

نصب و اجرای محاسبات در [دفتر کار نرم‌افزار](docs/software-workbook.fa.md) توضیح داده شده است. فایل ورودی یا دستورکار MD و VMD، گزارش اجرای موفق نیست. وضعیت واقعی هر تحلیل کنار نتیجه حفظ می‌شود.

بازسازی متادیتا فقط هش‌ها و فهرست پیوندها را تازه می‌کند؛ تاریخ بازبینی علمی منابع را عوض نمی‌کند. گزارش `education-source-access.json` وضعیت دسترسی و هش پاسخ‌های وب را ثبت می‌کند. دریافت HTTP موفق به‌تنهایی بررسی علمی یک منبع محسوب نمی‌شود.

## داده و حدود شواهد

پرسش مرور، ارتباط آدالیموماب با تغییر بیان TOP2A در سلول‌های ایمنیِ فعال‌شده است. [پرسش](docs/research-questions.fa.md)، [روش مرور](docs/survey-protocol.fa.md) و [پیش‌نویس](docs/survey-draft.fa.md) در بخش پژوهش قرار دارند. جست‌وجو و غربالگری کامل نشده و بازتحلیل RNA توصیفی است. تماس هندسی، فراوانی RNA، فعالیت آنزیم و پاسخ بیمار اندازه‌گیری‌های متفاوت‌اند.

منابع، UTC، SHA-256 و پارامترها در `data/metadata/` و خروجی‌های کوچک در `data/processed/` هستند. PDF ناشر و دادهٔ فردی تازه منتشر نمی‌شوند. پاسخ‌های آزمون و یادداشت‌ها با همان کلیدهای قبلی در مرورگر ذخیره می‌شوند؛ پاک‌کردن داده‌های مرورگر آن‌ها را حذف می‌کند. فایل‌های اصلی اسلایدها و دفترهای تحلیل نیز حفظ شده‌اند.

### Reading the general lessons

`course.html?topic=N` uses the original lesson source with a compact chapter catalogue, active section links and a directly accessible continuous textbook. Reader text size and explicitly opened section bookmarks are stored under `structural-reading-preferences-v1`, separately from study progress and research notes. Existing figures enlarge in place, code can be copied, and answer explanations open on request and print in full. The existing lab follows its existing example when available; original section URLs are preserved.

The reading refinement does not rewrite lesson Markdown or change the syllabus. `course-reader.spec.js` compares the rendered text of all thirty topics with those sources, alongside navigation, saved-state, fallback, clipboard, figure-focus, print and mobile controls.
