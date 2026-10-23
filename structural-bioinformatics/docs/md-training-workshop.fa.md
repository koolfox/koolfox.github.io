# کارگاه اختیاری MD واقعی؛ یک سیستم کوچک و یک گزارش صادقانه

## ۱. چرا یوبیکوئیتین و نه آنتی‌بادی؟

برای اولین تمرین، کمپلکس بزرگ TNF–آنتی‌بادی انتخاب مناسبی نیست. در این کارگاه از زنجیرهٔ A ساختار 1UBQ، یک پروتئین کوچک ۷۶ باقی‌مانده‌ای، استفاده می‌کنیم تا مسیر آماده‌سازی تا تحلیل را یاد بگیریم. این سیستم جدا از پژوهش آدالیموماب است. ورودی در `assets/course/gromacs/1ubq-protein.pdb` و منشأ، انتخاب و هش آن در `data/metadata/md-teaching-input.json` قرار دارند. آب‌های بلوری برای این ورودی آموزشی کنار گذاشته شده‌اند؛ این تصمیم یک قاعدهٔ عمومی برای حذف آب از همهٔ مطالعات نیست. [RCSB 1UBQ](https://www.rcsb.org/structure/1UBQ)

**وضعیت: ورودی آماده شده، ولی اجرای GROMACS این دستورکار در محیط توسعه انجام نشده است.** دستورها و تنظیم‌ها مسیر تمرین‌اند، نه خروجیِ موفقِ گزارش‌شده. باید خطاها، نسخه و کنترل‌های هر مرحله در رایانهٔ شما بررسی شوند. تا این مراحل واقعاً اجرا نشده‌اند، عنوان تحویلی «بررسی دستورکار» است.

پیش‌نیاز: جلسات ۶ تا ۹ و ۱۹ تا ۲۱، محیط خط فرمان و نصب GROMACS از [مستندات رسمی](https://manual.gromacs.org/current/install-guide/index.html). با `gmx --version` نسخه، precision و سخت‌افزار را ثبت کنید. اگر فرمان نصب نیست، آن را از نام برنامه حدس نزنید. راهنمای همین نسخه بر مثال عمومی مقدم است. پارامتر C-rescale نیازمند نسخه‌ای است که آن را پشتیبانی کند؛ این کارگاه برای شاخهٔ مستندات 2026 تنظیم شده است.

## ۲. کپی ورودی و ساخت توپولوژی

از ریشهٔ مخزن، پوشهٔ نتایج جدا بسازید. این فایل‌ها بزرگ می‌شوند؛ پیش از شروع فضای آزاد را بررسی کنید.

```sh
mkdir -p structural-bioinformatics/results/md-training
cp structural-bioinformatics/assets/course/gromacs/* structural-bioinformatics/results/md-training/
cd structural-bioinformatics/results/md-training
gmx pdb2gmx -f 1ubq-protein.pdb -o processed.gro -p topol.top -ff amber99sb-ildn -water tip3p -ignh
```

pdb2gmx هیدروژن و توپولوژی را طبق میدان نیروی انتخاب‌شده می‌سازد. پیام‌های انتهای زنجیره، باقی‌مانده‌ها و بار را بخوانید. اگر اتم یا پارامتری ناشناخته است، ادامه ندهید. با حذف خط یا تغییر نام تصادفی، خطا را خاموش نکنید. نام میدان نیرو و مدل آب را همراه گزارش نگه دارید؛ این انتخاب آموزشی اثبات بهترین‌بودن آن‌ها برای همهٔ سیستم‌ها نیست.

## ۳. جعبه، آب و یون

```sh
gmx editconf -f processed.gro -o box.gro -c -d 1.2 -bt cubic
gmx solvate -cp box.gro -cs spc216.gro -o solvated.gro -p topol.top
gmx grompp -f em.mdp -c solvated.gro -p topol.top -o ions.tpr
printf 'SOL\n' | gmx genion -s ions.tpr -o ionized.gro -p topol.top -pname NA -nname CL -neutral -conc 0.15
```

فاصلهٔ جعبه در این فرمان نانومتر است؛ ۱٫۲ نانومتر را با ۱٫۲ آنگستروم اشتباه نگیرید. نام `spc216.gro` جعبهٔ مختصات حلال است؛ پارامتر آب در توپولوژی از انتخاب TIP3P می‌آید. genion آب‌های انتخاب‌شده را با یون جایگزین می‌کند. نام SOL باید واقعاً گروه آب باشد؛ پیام انتخاب را بررسی کنید. فایل topol.top باید تعداد آب و یون تازه را منعکس کند. خطا یا هشدار grompp را بخوانید؛ از `-maxwarn` برای گذشتن بی‌بررسی استفاده نکنید.

## ۴. کمینه‌سازی و کنترل نیرو

```sh
gmx grompp -f em.mdp -c ionized.gro -p topol.top -o em.tpr
gmx mdrun -deffnm em
printf 'Potential\n0\n' | gmx energy -f em.edr -o potential.xvg
```

فایل log را بخوانید: آیا با معیار نیرو همگرا شده یا فقط تعداد گام تمام شده است؟ انرژی پتانسیل باید روندی قابل توضیح داشته باشد؛ کاهش آن به‌تنهایی کافی نیست. اگر Fmax به emtol نرسیده، علت و برخوردهای احتمالی را بررسی کنید و مرحلهٔ بعد را خودکار آغاز نکنید. پسوند xvg فایل متنی دادهٔ نمودار است و واحد روی سرآیند آن آمده است.

## ۵. تعادل‌یابی و تولید کوتاه

```sh
gmx grompp -f nvt.mdp -c em.gro -r em.gro -p topol.top -o nvt.tpr
gmx mdrun -deffnm nvt
printf 'Temperature\n0\n' | gmx energy -f nvt.edr -o temperature.xvg
gmx grompp -f npt.mdp -c nvt.gro -r em.gro -t nvt.cpt -p topol.top -o npt.tpr
gmx mdrun -deffnm npt
printf 'Density\n0\n' | gmx energy -f npt.edr -o density.xvg
gmx grompp -f production.mdp -c npt.gro -t npt.cpt -p topol.top -o production.tpr
gmx mdrun -deffnm production
```

NVT در اینجا حجم ثابت و NPT فشار هدف دارد. در دو مرحلهٔ اول، مهار موقعیت اتم‌های سنگین پروتئین با POSRES فعال است؛ در تولید حذف می‌شود. هر مرحلهٔ دینامیکی این مثال ۱۰۰ پیکوثانیه است: ۵۰هزار گام ضربدر ۰٫۰۰۲ پیکوثانیه. این طول فقط برای آموختن روند است و تضمین تعادل، همگرایی یا مشاهدهٔ رخداد زیستی نیست. اگر دما، چگالی یا ساختار مشکل آشکار دارد، تولید را ادامه ندهید. تغییر تنظیم‌ها باید دلیل و نسخهٔ ورودی تازه داشته باشد.

## ۶. تحلیل و تحویل

```sh
printf 'Protein\nSystem\n' | gmx trjconv -s production.tpr -f production.xtc -o centered.xtc -pbc mol -center
printf 'Backbone\nBackbone\n' | gmx rms -s production.tpr -f centered.xtc -o backbone-rmsd.xvg
gmx gyrate -s production.tpr -f centered.xtc -o rg.xvg -sel 'group "Protein"' -mode mass
```

گروه انتخاب‌شده برای fit و محاسبهٔ RMSD را در پیام ابزار کنترل کنید. مرزهای تناوبی ممکن است پروتئین را ظاهراً تکه‌تکه کنند؛ پیش از تفسیر Rg، مسیر اصلاح‌شده را در VMD ببینید. تعریف جرم‌وزن ابزار و واحد نانومتر را با مثال CA جلسهٔ ۹ مقایسه کنید؛ برابرنبودن این دو عدد الزاماً خطا نیست.

تحویلی شامل نسخه، ورودی و هش، فایل‌های mdp، logها، نمودار نیرو/انرژی/دما/چگالی، RMSD و Rg با انتخاب‌ها و یک بند محدودیت است. هشدارها و توقف‌های ناموفق هم بخشی از گزارش‌اند. یک مسیر کوتاه و یک seed، نتیجهٔ پژوهشی دربارهٔ پایداری آنتی‌بادی، تاشدن کامل یا میل اتصال تولید نمی‌کند. مسیر آموزش عملی را از پرسش مقالهٔ مرور جدا نگه دارید.
