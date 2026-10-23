# دفتر کار نرم‌افزار؛ نصب، اجرا و گزارش قابل دفاع

## ۱. محیط و محل کار

اگر مخزن را ندارید و Git روی دستگاه نصب است، ابتدا نسخهٔ محلی بگیرید:

```sh
git clone https://github.com/koolfox/koolfox.github.io.git
cd koolfox.github.io
```

اگر همین مخزن را از قبل باز کرده‌اید، دوباره clone نکنید و به پوشهٔ آن بروید. صفحهٔ وب برای خواندن است؛ فرمان‌های محاسباتی در رایانه و داخل نسخهٔ محلی اجرا می‌شوند.

این دستورها از ریشهٔ مخزن اجرا می‌شوند؛ همان پوشه‌ای که `structural-bioinformatics` در آن است. Terminal را باز کنید، با `pwd` محل فعلی و با `ls` وجود پوشه را بررسی کنید. دستور را بدون علامت‌های قاب کد کپی کنید. فایل‌های اصلی را در تمرین تغییر ندهید.

برای نصب uv از [راهنمای رسمی](https://docs.astral.sh/uv/getting-started/installation/) متناسب با سیستم‌عامل استفاده کنید. سپس:

```sh
uv --version
uv sync --project structural-bioinformatics --frozen
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/course_lab.py --help
```

sync محیط قفل‌شدهٔ پروژه را آماده می‌کند. اگر شبکه یا نصب مشکل داشت، متن خطا و سیستم‌عامل را ثبت کنید. دورزدن خطا با حذف فایل قفل، روش بازاجرا نیست. در مرورگر صرفاً امکان مطالعه دارید؛ اجرای Python به رایانه و محیط نصب‌شده نیاز دارد.

## ۲. اولین اجرای واقعی و محل خروجی

```sh
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/course_lab.py inspect --output structural-bioinformatics/results/course/inspect.json
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/course_lab.py geometry --output structural-bioinformatics/results/course/geometry.json
```

inspect هویت زنجیره‌ها را چاپ می‌کند. geometry روی CAهای با اشغال مثبت، جابه‌جایی صلب را امتحان می‌کند؛ Rg آن جرم‌وزنِ همهٔ اتم‌ها نیست. خروجی تمرین فقط در results مجاز است تا داده‌های پژوهشی بازنویسی نشوند. این پوشه در Git نادیده گرفته می‌شود؛ برای ارائه نسخهٔ خروجی و دستورش را نزد خود نگه دارید.

خروجیِ کنترل‌های اجراشده در توسعه در [پروندهٔ تمرین‌ها](../data/processed/course-lab-controls.json) با هش ورودی و اسکریپت ثبت شده است. این گزارش مربوط به اجرای ابزار آموزشی است؛ اجرای شما را از پیش تأیید نمی‌کند.

## ۳. VMD؛ از رابط گرافیکی تا اسکریپت

از [راهنمای رسمی VMD](https://www.ks.uiuc.edu/Research/vmd/current/ug/) نصب مناسب دستگاه را پیدا کنید. در File → New Molecule فایل `assets/3wd5.pdb` را بخوانید. در Graphics → Representations انتخاب `protein and chain A` و Drawing Method برابر NewCartoon را تنظیم کنید. انتخاب و رنگ را در زیرنویس شکل ثبت کنید. برای H و L نمایش‌های جدا بسازید.

برای اجرا از خط فرمان، مسیر اجرایی VMD باید در PATH باشد. از ریشهٔ مخزن نمونهٔ زیر را با مسیر مطلق فایل جایگزین کنید:

```sh
vmd -dispdev text -e structural-bioinformatics/assets/course/vmd-geometry.tcl -args /absolute/path/to/structural-bioinformatics/assets/3wd5.pdb
```

این اسکریپت فایل را دو بار می‌خواند، یکی را ده آنگستروم جابه‌جا می‌کند، سپس RMSD قبل و بعد از fit و Rg را چاپ می‌کند. انتظار داریم RMSD خام نزدیک ۱۰ و پس از fit نزدیک صفر باشد. این **خروجی مورد انتظار** است؛ اجرای VMD در محیط توسعهٔ این بازطراحی انجام نشده است. تفاوت انتخاب altloc میان VMD و Python را بررسی کنید و اعداد را بدون کنترل انتخاب یکسان ندانید.

اگر فرمان پیدا نشد، از نصب‌شدن برنامه نتیجه نگیرید که PATH تنظیم شده است. از Tk Console برنامه می‌توانید فرمان‌های جلسهٔ ۷ را اجرا کنید. خروجی کنسول را با نسخه و نام فایل نگه دارید.

## ۴. محاسبهٔ ساده، شبیه‌سازی کامل نیست

```sh
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/course_lab.py oscillator --dt 0.01 --steps 1000
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/course_lab.py oscillator --dt 0.1 --steps 100
uv run --project structural-bioinformatics python structural-bioinformatics/scripts/course_lab.py network --cutoff 8
```

دو اجرای نوسانگر بازهٔ زمانی بی‌بعد برابر دارند. مقایسهٔ خطای انرژی، تمرین انتگرال‌گیری است؛ این سیستم پروتئین نیست. شبکه نیز فقط تماس‌های CA یک زنجیره را می‌سازد. فایل گزارش را به‌عنوان MD آنتی‌بادی یا شبکهٔ انرژی ارائه نکنید.

اجرای واقعی MD پروتئین به توپولوژی، پارامتر، آب و یون، کمینه‌سازی، تعادل‌یابی، کنترل‌ها و بودجهٔ محاسباتی نیاز دارد. [دستورکار گام‌به‌گامِ MD یوبیکوئیتین](md-training-workshop.fa.md) برای تمرین کامل آماده شده ولی اجرای آن اینجا تأیید نشده است؛ MD کامل و معتبر برای TNF گزارش نشده است. جلسات ۱۹ تا ۲۲ مقدمات ارزیابی آن را می‌دهند؛ [راهنمای GROMACS](https://manual.gromacs.org/current/user-guide/index.html) مرجع روش است. همین حد اجرا را در ارائه صریح نگه دارید.

## ۵. دفتر هر اجرای اختیاری

برای مدل‌سازی سروری یا داکینگ، شناسهٔ ورودی، محدودهٔ توالی، تنظیم‌ها، نسخه یا تاریخ سرویس، شناسهٔ job، فایل خروجی و معیار کنترل را ثبت کنید. اسکرین‌شات موفق‌شدن job جای فایل مدل را نمی‌گیرد. اگر فقط یک نتیجهٔ ازپیش‌موجود را خواندید، عنوان فعالیت را «بازبینی نتیجه» بنویسید.

تحویلی هر تمرین باید به همکلاسی امکان بدهد بگوید چه چیزی اجرا شده، با چه ورودی، چه نتیجه‌ای داشته و چه محدودیتی باقی است. اگر این چهار پرسش بی‌پاسخ‌اند، صرف نمایش نرم‌افزار کفایت نمی‌کند.
