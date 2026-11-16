# بازبینی اکتشافی پپتید و TNF

برنامه Shiny Python برای خروجی ایستای Shinylive؛ بدون درخواست به اینترنت در زمان اجرا. منبع عمومی گیرنده [7TA3 در RCSB PDB](https://www.rcsb.org/structure/7TA3) است؛ گیرنده آماده‌شده فقط مونومر TNF زنجیره B است، نه کمپلکس کامل. پپتید TWNSGHID قطعه انتخابی آدالیموماب و DIHGNSWT توالی درهم‌ریخته با ترکیب یکسان است؛ وضعیت اتصال آن تجربی معلوم نیست. نتایج از اجرای سوم موجود، ۱۶ نوامبر ۲۰۲۶، با یک conformer، بذر ۴۲، جعبه ثابت، حداکثر ۲۵۰۰۰ ارزیابی و ۵۰۰۰ گام MMFF94 انتخاب شده‌اند. امتیازها و کنترل‌های هندسی اثبات اتصال، مهار یا اعتبارسنجی نیستند. برای محدودیت‌های بیشتر متن برنامه را ببینید.

فقط سه فایل PDBQT مجاز کپی شده‌اند (فایل‌های پپتید هر کدام سه MODEL دارند):

| فایل | SHA-256 |
|---|---|
| receptor.pdbqt | ef6112549c988297f3911490d9a5466cfcb9fbce65c262608f1b4963e7785e06 |
| TWNSGHID.pdbqt | 1c5d911727d7115ad49341f5ff39373cdab7c6c603cccdcba34595a100a4ff01 |
| DIHGNSWT.pdbqt | fa1b974526208e754b8bc52940f7eb1ef63ca0c4f9ed92617818ea3198cf937f |

## قرارداد صادرکننده و DOM

صادرکننده فایل‌های `assets/vendor/three.module.js` و `three.core.js` را به `www/vendor/` و فونت `assets/fonts/arad.woff2` را به `www/arad.woff2` کپی می‌کند. `viewer.js` مستقیماً ماژول Three را با مسیر نسبی وارد می‌کند؛ importmap یا OrbitControls لازم نیست. فایل molecular-scene.js ممکن است توسط صادرکننده کپی شود اما این نمایشگر به دلیل import bare در آن از آن استفاده نمی‌کند. هیچ کتابخانه‌ای اینجا vendored نشده است. منابع لازم باید پیش از export در app stage باشند. اجرای محلی Shiny و اجرای صادرشده نیازمند ارائه `www` روی HTTP یا سرور ایستای Shinylive است؛ باز کردن مستقیم file:// کافی نیست. پیوند RCSB صرفاً منبع اختیاری است و برای عملکرد برنامه درخواست نمی‌شود.

صادرکننده مورد اعتماد باید شش فایل `www/data/TWNSGHID-{1,2,3}.pml` و `www/data/DIHGNSWT-{1,2,3}.pml` را تولید و در stage بگذارد؛ این پوشه آنها را تولید نمی‌کند. پیوندها به این نام‌ها اشاره می‌کنند و پیش از staging ممکن است 404 باشند. اجرای PyMOL و سازگاری واقعی فایل‌ها تست نشده است.

شناسه‌های ورودی Shiny: `candidate`, `pose`. خروجی‌های Shiny: `result`, `pose_download`, `pymol_download`. فرزند `result-values` دارای `data-candidate` و `data-pose` است. `molecule-viewer` پس از رسم دارای `data-state="ready"` و `data-candidate` و `data-pose` متناظر است؛ خطای WebGL یا فایل `data-state="error"` می‌دهد. نمایش فقط اتم‌های سنگین بدون پیوند است و نباید با نمایش شیمیایی کامل اشتباه گرفته شود. برای تست iframe، تا ready صبر کنید، هر دو select را تغییر دهید و هم داده‌های viewer و هم result-values را بررسی کنید.
