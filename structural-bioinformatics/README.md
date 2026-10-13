# TNF, TOP2A & Adalimumab — Structural Bioinformatics

پروژهٔ اکتشافی درس بیوانفورماتیک ساختاری، ارشد مهندسی کامپیوتر/بیوانفورماتیک. پرسش باز: **آیا بیان TOP2A و فعالیت چرخهٔ سلولی در بافت روماتوئید با مسیر TNF و پاسخ به آدالیموماب ارتباط دارند؟** این پروژه هنوز سازوکار مشترک یا پیش‌بین بالینی را اثبات نکرده است.

**نسخهٔ شروع:** کاوشگر سه‌بعدی، منابع، پروتکل، تحلیل ساختار و ویدئو آماده‌اند. انتشار از طریق GitHub Actions، پس از تست کد علمی و همان فایل‌های سایت انجام می‌شود.

[نمای سه‌بعدی پژوهش](https://koolfox.github.io/structural-bioinformatics/) · [پروتکل](docs/research-protocol.fa.md) · [سه مقالهٔ اصلی](docs/literature-review.fa.md) · [دیتاست‌ها](docs/dataset-catalog.fa.md) · [نقشهٔ زیستی و آزمایشگاهی](docs/scientific-context.fa.md)

![نمای مختصات واقعی TNF–Fab](assets/complex-preview.png)

## چه چیزی در نسخهٔ شروع آماده است؟

- موتور سبک و قابل استفادهٔ مجدد Three.js: TNF–Fab `3WD5`، TNF آزاد `1TNF`، CRP `1B09` و هستهٔ TOP2A–DNA `4FM9`؛ چرخش، زنجیره/رنگ قابل انتخاب، بررسی باقی‌مانده و شرح محدودیت نمایش.
- تحلیل واقعی و قابل بازتولید رابط **جزئی** TNF–Fab: در آستانهٔ `4.5 Å`، **۲۵۲ تماس اتم سنگین، ۴۰ جفت باقی‌مانده و ۱۷ باقی‌ماندهٔ TNF** در واحد نامتقارن ثبت شده‌اند. این اعداد معیار اثربخشی دارو نیستند.
- مرور سه مطالعهٔ داوری‌شده: [Shi 2025، TOP2A و RA/IPF](https://doi.org/10.2147/JIR.S497734)، [Bhamidipati 2026، بافت سینوویال و مقاومت درمان](https://doi.org/10.1038/s41590-025-02386-2)، [Gehin 2024، غلظت آدالیموماب و CRP](https://doi.org/10.1136/rmdopen-2024-004888).
- کاتالوگ منشأ/دسترسی داده‌ها، نقشهٔ تماس PNG/SVG، و ویدئوی واقعی ManimGX در [assets/tnf-adalimumab.mp4](assets/tnf-adalimumab.mp4).

## اجرای محلی

فرمان‌ها از **ریشهٔ مخزن** اجرا می‌شوند. Python `3.13` در `.python-version` مشخص شده است؛ تحلیل روی `3.13` آزموده شده و بسته بازهٔ `>=3.13,<3.15` را اعلام می‌کند. سایت به نصب Python علمی، Node یا CDN وابسته نیست؛ Node فقط برای تست مرورگر است.

```sh
python3 -m http.server 8000
# Open http://localhost:8000/structural-bioinformatics/

uv sync --project structural-bioinformatics --frozen
uv run --project structural-bioinformatics tnf-atlas fetch-structures
uv run --project structural-bioinformatics tnf-atlas analyze
uv run --project structural-bioinformatics pytest -q
uv run --project structural-bioinformatics ruff check structural-bioinformatics
uv run --project structural-bioinformatics ruff format --check structural-bioinformatics
```

دانلود ساختارها اینترنت می‌خواهد؛ تست‌های معمولی آفلاین هستند. فایل‌های `mmCIF` و `PDB` چهار ساختار و SHA-256 در manifest ثبت می‌شوند. ورودی‌ها در `data/raw/` و خروجی‌های موقت در `results/` می‌مانند؛ فقط خروجی‌های کوچک و مشخص برای نمایش عمومی نگهداری شده‌اند. هنگام بازسازی خروجی‌ها، manifest فایل‌های عمومی و ویدئو را نیز به‌روز کنید.

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

## داده و محدودیت‌های پژوهش

مرور/کاتالوگ، به معنی اجرای تحلیل همهٔ کوهورت‌ها نیست. GSE138746 ردیف TOP2A و پاسخ بعدی دارد، اما RNA پایه است. دادهٔ spatial شش جفت ADA دارد و فایل‌های اصلی حجیم‌اند؛ GSE296117 پنج جفت ADA دارد، دادهٔ پردازش‌شده عمومی و دادهٔ خام کنترل‌شده است. هنوز تحلیل این کوهورت‌ها انجام نشده است. پروتکل، آمار مستقل بیمار، دارو/بافت، چرخهٔ سلولی و نوع پاسخ را پیش از مدل‌سازی بررسی می‌کند.

3WD5، Fab و یک پروتومر TNF را نشان می‌دهد و تماس‌های همسایه‌های تقارن را ندارد؛ 4FM9 نیز هستهٔ ناقص TOP2A در واحد نامتقارن است. ستون CRP در نمرهٔ DAS28-CRP معادل اندازه‌گیری غلظت خام نیست. لوپوس در این دارو مسیر ایمنی/مقایسه است. مطالعهٔ TOP2A سال ۲۰۲۵ از رده‌های سرطان‌منشأ و مهارگر TOP2A استفاده کرده و آدالیموماب را آزمایش نکرده است.

## ادامه و مستندسازی

[طرح مقاله](docs/manuscript-outline.fa.md)، [پروتکل](docs/research-protocol.fa.md) و [نقش ایجنت‌ها](docs/agent-workflow.md) مسیر ادامه را ثبت می‌کنند. اسکیل محلی `$tnf-structural-research` در `../.agents/skills/tnf-structural-research/` قرار دارد. اعتبار پژوهش نیازمند سؤال محدود، تحلیل واقعی، تکرار مناسب و گزارش عدم قطعیت است؛ اسکلت پروژه مقالهٔ آمادهٔ ارسال نیست.

[چشم‌انداز ابزار آموزشی/پژوهشی](docs/product-roadmap.fa.md) و [وضعیت اتصال Paper](docs/paper-design-setup.fa.md) تصمیم‌های باز را ثبت کرده‌اند. راهنمای پروژه و ایجنت‌ها تنظیم شده‌اند؛ workflow، به‌روزرسانی `main` را منتشر می‌کند. پژوهش خودکار نامحدود یا برنامهٔ زمان‌بندی آینده فعال نشده است.

کد و خروجی‌های اصلی پروژه مستقل از متن ناشران نوشته/ساخته شده‌اند. مختصات PDB با شرایط CC0 و استناد علمی، و Three.js با مجوز MIT و notice اصلی ارائه شده‌اند. [حقوق منابع](docs/third-party-notices.md)
