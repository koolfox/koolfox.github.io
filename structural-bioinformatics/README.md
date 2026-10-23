# TNF & Adalimumab — Structural Bioinformatics Course

**شروع واحد:** [نقشهٔ پروژه](docs/course-guide.fa.md) ← [درس‌نامهٔ ۳۰ جلسه](docs/course-sessions.fa.md) ← [هشت بستهٔ ارائه](docs/weekly-plan.fa.md). درس‌نامه برای هر جلسه توضیح، مثال، خودسنجی با پاسخ، تمرین و تحویلی دارد. هشت بستهٔ ارائه، تقویم سی جلسهٔ کلاس را تعیین نمی‌کنند.

**پرسش اصلی:** بازتحلیل بازتولیدپذیر رابط Fab آدالیموماب و TNF سه‌تایی، با سنجش سهم زیرواحد همسایه و مقایسهٔ توصیفی چهارده جهش Hu. حضور همسایه قبلاً در Hu گزارش شده؛ ادعای کشف اپی‌توپ یا داروی تازه نداریم. [یافته‌ها](docs/full-epitope-results.fa.md) · [پیش‌نویس](docs/manuscript-draft.fa.md) · [راهنمای نگارش](docs/paper-writing-guide.fa.md)

**RA و RNA-seq:** [پروتکل پژوهش مکمل](docs/rnaseq-research-plan.fa.md) دادهٔ RNA اولیه/پاسخ، پیش‌وپس و MLR را جدا می‌کند. خلاصه‌های گروهی و CPM فعلی توصیفی‌اند؛ DESeq2، مدل بالینی معتبر و اثر دارو بر فعالیت TOP2A از این‌ها نتیجه نمی‌شود. [مقاله‌ها](docs/literature-review.fa.md) · [شرح آموزشی](docs/paper-explanations.fa.md)

**کنترل کیفیت علمی:** [اصلاح‌ها و موارد باز](docs/comprehensive-review.fa.md) و [دفتر منابع](data/metadata/review-sources.json). رفع ایرادهای مشخص به معنی تضمین صحت صددرصدی یا بازبینی مستقل همهٔ جمله‌های آرشیوی نیست. نسخهٔ PDF جزوه یک snapshot قدیمی‌تر است؛ متن آنلاین مرجع به‌روز است.

[سایت](https://koolfox.github.io/structural-bioinformatics/) · [۳۹ اسلاید](presentation.html) · [مبانی زیست](docs/learning-path.fa.md) · [دریافت داده](docs/data-access-guide.fa.md)

## چه چیزی در نسخهٔ شروع آماده است؟

- برای یادگیری از پایه: [سلول، پروتئین، قفل و کلید و سازوکار آدالیموماب](docs/binding-mechanism.fa.md) و [داستان آزمایش‌ها و معنی سه مقاله](docs/paper-explanations.fa.md)، با تعریف اصطلاحات و مثال‌های قابل ارائه.
- انتخاب میان مسیر Cα و نمای نواری Mol* در همان آزمایشگاه؛ هر چهار ساختار با دادهٔ محلی کار می‌کنند. [تطبیق 3WD5 با RCSB](docs/molecular-display-audit.fa.md) تفاوت روش رسم، نام زنجیره و occupancy را توضیح می‌دهد. نمایش نواری به‌صورت درخواستی بارگذاری می‌شود و محاسبات علمی را تغییر نمی‌دهد.
- موتور سبک و قابل استفادهٔ مجدد Three.js: TNF–Fab `3WD5`، TNF آزاد `1TNF`، CRP `1B09` و هستهٔ TOP2A–DNA `4FM9`؛ چرخش، زنجیره/رنگ قابل انتخاب، بررسی باقی‌مانده و شرح محدودیت نمایش.
- تحلیل واقعی و قابل بازتولید رابط **جزئی** TNF–Fab: در آستانهٔ `4.5 Å`، **۲۵۲ تماس اتم سنگین، ۴۰ جفت باقی‌مانده و ۱۷ باقی‌ماندهٔ TNF** در واحد نامتقارن ثبت شده‌اند. این اعداد معیار اثربخشی دارو نیستند.
- مرور و نقد منابع موجود برای مطالعهٔ بعدی: [Bianchi، ساختار/شبیه‌سازی آدالیموماب، انتشار آنلاین ۲۰۲۶](https://doi.org/10.3389/fimmu.2025.1680199)، [Marguerie 2025، دو آزمایش مجزای آدالیموماب–SIRPG و SIRPG–TOP2A](https://doi.org/10.3389/fimmu.2025.1668361)، [Gehin 2024، غلظت آدالیموماب و CRP در RA](https://doi.org/10.1136/rmdopen-2024-004888). برای هرکدام دلیل انتخاب، خلاصه و نقد نوشته شده است؛ Hu 2013، Ubah 2025 و شواهد RA/TOP2A منابع پشتیبان‌اند.
- کاتالوگ منشأ/دسترسی داده‌ها، نقشهٔ تماس PNG/SVG، و ویدئوی واقعی ManimGX در [assets/tnf-adalimumab.mp4](assets/tnf-adalimumab.mp4).
- شش تب آموزشی با ناوبری صفحه‌کلید و نمایش کامل مسیر در موبایل؛ توالی‌های FASTA با شناسه و نسخه، طرح اجزای آنتی‌بادی و مسیر ژن تا ساختار. [آموزش توالی‌ها](docs/sequences-primer.fa.md) تفاوت توالی، مقدار بیان و ساختار RNA را توضیح می‌دهد.
- [کتابچهٔ پژوهش داخل صفحه](https://koolfox.github.io/structural-bioinformatics/?document=course-guide.fa.md#reading): همان فایل‌های Markdown با انتخاب فصل، فرمول‌های LaTeX و نمودارهای Mermaid. [روش و فرمول‌ها](docs/structural-method.fa.md) خروجی حساسیت حد فاصله را با اعداد واقعی توضیح می‌دهد.
- [نقشهٔ شواهد ارتباط](docs/connection-evidence.fa.md) نتیجهٔ مستقیم، مشاهدهٔ وابسته به شرایط آزمایش و فرضیهٔ اثبات‌نشده را جدا می‌کند. نتیجهٔ منفی یا نامشخص نیز پاسخ معتبر پژوهش است.

## بازسازی PDF جزوه

پس از نصب وابستگی‌های مرورگر و اجرای سرور از ریشهٔ مخزن، `node structural-bioinformatics/scripts/export_preparation_guide.mjs` همان متن کتابچه را به `assets/preparation-guide.fa.pdf` تبدیل می‌کند. سرور پیش‌فرض `http://127.0.0.1:8000` است؛ با `RESEARCH_BASE_URL` تغییر می‌کند. نمودارها، فرمول و فونت محلی باید کامل بارگذاری شوند. لینک‌های داخل PDF به سایت عمومی اشاره می‌کنند.

## اجرای محلی

**نمایش آفلاینِ آسان:** از ریشهٔ نسخهٔ کامل مخزن، `python3 scripts/serve_local.py` را اجرا کنید؛ در Windows می‌توانید از `py -3 scripts/serve_local.py` استفاده کنید. در macOS، دوبار کلیک روی `start-local.command` همان کار را می‌کند. سرور، همان فایل‌های عمومیِ Pages را آماده می‌کند و ارائه را در مرورگر باز می‌کند؛ نصب npm/uv برای نمایش لازم نیست. Python `3.9+` لازم است و اجرا روی Python موجود سیستم آزموده شده است.

نشانی پیش‌فرض [ارائهٔ محلی](http://127.0.0.1:8787/structural-bioinformatics/?document=class-presentation.fa.md&chapter=chapter-1#reading) است. اگر پورت مشغول باشد، نشانی آزاد در خروجی چاپ می‌شود. `--no-browser` مرورگر را خودکار باز نمی‌کند و `--port 8790` پورت دلخواه می‌دهد. Ctrl+C سرور را می‌بندد؛ بعد از تغییر فایل‌ها، دوباره اجرا کنید تا نسخهٔ تازه ساخته شود.

مدل‌ها، تصاویر، کتابچه، فرمول‌ها و Mermaid از فایل‌های محلی می‌آیند و بدون اینترنت نمایش داده می‌شوند. پیوند سایت ناشر و دریافت منابع جدید اینترنت می‌خواهد؛ متن خلاصه/نقد حاضر، داخل مخزن است. دستورهای زیر برای بازسازی تحلیل علمی و توسعهٔ پروژه‌اند.

فرمان‌ها از **ریشهٔ مخزن** اجرا می‌شوند. Python `3.13` در `.python-version` مشخص شده است؛ تحلیل روی `3.13` آزموده شده و بسته بازهٔ `>=3.13,<3.15` را اعلام می‌کند. بازدید از سایت به نصب Python، Node یا CDN وابسته نیست؛ Node برای تست مرورگر و بازسازی کتابخانه‌های نمایشی استفاده می‌شود.

```sh
python3 -m http.server 8000
# Open http://localhost:8000/structural-bioinformatics/

uv sync --project structural-bioinformatics --frozen
uv run --project structural-bioinformatics tnf-atlas fetch-structures
uv run --project structural-bioinformatics tnf-atlas analyze
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/plot_teaching_figures.py
uv run --project structural-bioinformatics pytest -q
uv run --project structural-bioinformatics ruff check structural-bioinformatics
uv run --project structural-bioinformatics ruff format --check structural-bioinformatics
```

دانلود ساختارها اینترنت می‌خواهد؛ تست‌های معمولی آفلاین هستند. فایل‌های `mmCIF` و `PDB` چهار ساختار و SHA-256 در manifest ثبت می‌شوند. ورودی‌ها در `data/raw/` و خروجی‌های موقت در `results/` می‌مانند؛ فقط خروجی‌های کوچک و مشخص برای نمایش عمومی نگهداری شده‌اند. هنگام بازسازی خروجی‌ها، manifest فایل‌های عمومی و ویدئو را نیز به‌روز کنید.

![مقایسهٔ مختصات واقعی TNF، Fab و هستهٔ TOP2A–DNA](assets/structure-comparison.png)

مقیاس نمایش سه پنل مستقل است؛ مقایسهٔ هم‌ترازی یا داکینگ نیست. طرح‌های SVG آنتی‌بادی و مسیر شواهد، شکل‌های مفهومیِ دارای برچسب‌اند. منشأ، روش و SHA در `assets/teaching-provenance.json` ثبت شده است.

## انیمیشن

```sh
uv sync --project structural-bioinformatics --frozen --group animation
uv run --project structural-bioinformatics --group animation python structural-bioinformatics/scripts/animate_binding.py
```

ManimGX `0.1.1` روی macOS/Apple Silicon با Python `3.13.12` آزموده شده است. موتور بومی/گرافیکی لازم دارد؛ CI عادی رندر ویدئو را انجام نمی‌دهد. ویدئوی آماده H.264، `1280×720`، `30 fps` و حدود `10.73 s` است؛ تنها دوربین و آشکارشدن زنجیره‌ها تغییر می‌کنند. [بررسی ابزارها و Anatomy/Manim](docs/visualization-tools.fa.md)

## آزمون مرورگر

```sh
npm ci --prefix structural-bioinformatics/browser-tests
npx --prefix structural-bioinformatics/browser-tests playwright install chromium
python3 -m http.server 8000
# In another terminal, with that server running:
npm --prefix structural-bioinformatics/browser-tests test
```

تست‌ها باید مدل‌های واقعی، کنترل‌ها، عدم سرریز موبایل و مسیر fallback بدون WebGL را بررسی کنند. برای ثبت تصویرهای کنترل‌شده از همان تست‌ها استفاده می‌شود؛ تصویرها نتیجهٔ بالینی نیستند.

## نمایش Markdown، فرمول و نمودار

کتابچه، سندهای مشخص مخزن را با `markdown-it 15.0.2`، `KaTeX 0.19.0` و `Mermaid 12.2.0` در خود صفحه نشان می‌دهد. کتابخانه‌ها و فونت‌های ریاضی میزبانی محلی دارند و هنگام نیاز بارگذاری می‌شوند؛ خطای رندر، متن یا کد اصلی را حذف نمی‌کند. HTML خام در Markdown فعال نیست. فایل‌های اصل برای دریافت باقی می‌مانند و پیوندهای میان راهنماها داخل کتابچه باز می‌شوند.

فقط برای به‌روزرسانی دارایی‌های نمایشی، با Node.js `24`:

```sh
npm ci --prefix structural-bioinformatics/reading-tools --ignore-scripts
npm --prefix structural-bioinformatics/reading-tools run vendor
```

نسخه، مجوز، integrity بسته و SHA-256 هر فایل در `data/metadata/reading-vendor.json` ثبت می‌شود. [ارزیابی واقعی Anatomy](docs/anatomy-evaluation.fa.md) و [مقایسهٔ ابزارها](docs/visualization-tools.fa.md) ابزار آزمایش‌شده را از قابلیت آینده جدا می‌کنند.

برای بازتولید فایل‌های نمایشگر نواری، `python3 structural-bioinformatics/scripts/vendor_molecular_viewer.py` را از ریشه اجرا کنید. این مرحلهٔ نگهداری به اینترنت نیاز دارد و Mol* `5.13.1` را با integrity ثابت دریافت می‌کند؛ چهار فایل PDB باید با هشِ منابع قبلاً ثبت‌شده برابر باشند. خروجی در `data/metadata/molecular-viewer-vendor.json` ثبت می‌شود. اجرای عادیِ سرور محلی دانلودی انجام نمی‌دهد.

## مسیرهای پژوهشی اختیاری؛ خارج از ارائهٔ اصلی

مرور/کاتالوگ، به معنی اجرای تحلیل همهٔ کوهورت‌ها نیست. GSE138746 ردیف TOP2A و پاسخ بعدی دارد، اما RNA پایه است. دادهٔ spatial شش جفت ADA دارد و فایل‌های اصلی حجیم‌اند؛ GSE296117 پنج جفت ADA دارد، دادهٔ پردازش‌شده عمومی و دادهٔ خام کنترل‌شده است. هنوز تحلیل این کوهورت‌ها انجام نشده است. پروتکل، آمار مستقل بیمار، دارو/بافت، چرخهٔ سلولی و نوع پاسخ را پیش از مدل‌سازی بررسی می‌کند.

[کاتالوگ گسترده](docs/dataset-catalog.fa.md)، [فرضیهٔ TOP2A](docs/top2a-hypothesis.fa.md) و [پروتکل اکتشافی قبلی](docs/research-protocol.fa.md) یادداشت‌های آینده‌اند؛ برای فهم و دفاع از تحقیق فعلی لازم نیست همهٔ این مسیرها اجرا یا ارائه شوند.

3WD5، Fab و یک پروتومر TNF را نشان می‌دهد و تماس‌های همسایه‌های تقارن را ندارد؛ 4FM9 نیز هستهٔ ناقص TOP2A در واحد نامتقارن است. ستون CRP در نمرهٔ DAS28-CRP معادل اندازه‌گیری غلظت خام نیست. لوپوس در این دارو مسیر ایمنی/مقایسه است. مطالعهٔ TOP2A سال ۲۰۲۵ از رده‌های سرطان‌منشأ و مهارگر TOP2A استفاده کرده و آدالیموماب را آزمایش نکرده است.

## ادامه و مستندسازی

[طرح مقاله](docs/manuscript-outline.fa.md)، [پروتکل](docs/research-protocol.fa.md) و [نقش ایجنت‌ها](docs/agent-workflow.md) مسیر ادامه را ثبت می‌کنند. اسکیل محلی `$tnf-structural-research` در `../.agents/skills/tnf-structural-research/` قرار دارد. اعتبار پژوهش نیازمند سؤال محدود، تحلیل واقعی، تکرار مناسب و گزارش عدم قطعیت است؛ اسکلت پروژه مقالهٔ آمادهٔ ارسال نیست.

[چشم‌انداز ابزار آموزشی/پژوهشی](docs/product-roadmap.fa.md) و [وضعیت اتصال Paper](docs/paper-design-setup.fa.md) تصمیم‌های باز را ثبت کرده‌اند. راهنمای پروژه و ایجنت‌ها تنظیم شده‌اند؛ workflow، به‌روزرسانی `main` را منتشر می‌کند. پژوهش خودکار نامحدود یا برنامهٔ زمان‌بندی آینده فعال نشده است.

کد و خروجی‌های اصلی پروژه مستقل از متن ناشران نوشته/ساخته شده‌اند. مختصات PDB با شرایط CC0 و استناد علمی، و Three.js با مجوز MIT و notice اصلی ارائه شده‌اند. [حقوق منابع](docs/third-party-notices.md)

**بازبینی جدید و پایلوت RNA:** [دفتر صحت‌سنجی](docs/scientific-claim-audit.fa.md)، [طرح مهار مستقیم/غیرمستقیم TOP2A](docs/top2a-inhibition-feasibility.fa.md) و [بررسی توصیفی چهار جفت GSE339038](docs/top2a-count-inspection.fa.md). ماتریس عمومی خوانده و CPM محاسبه شد؛ تحلیل آماری کامل و سنجش آنزیمی انجام نشده‌اند.
