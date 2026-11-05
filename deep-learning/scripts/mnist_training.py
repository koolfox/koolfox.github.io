"""Generate the explicit live-MNIST training entry without changing sources."""

from pathlib import Path
from html import escape


def build_mnist_training(root, output, asset_revision=""):
    target = Path(output) / "playgrounds/cnn-mnist/train/index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    revision = escape(str(asset_revision), quote=True)
    target.write_text(f"""<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>آموزش CNN روی MNIST · دیپ لرنینگ</title><link rel="stylesheet" href="/deep-learning/assets/course.css"><link rel="stylesheet" href="/deep-learning/assets/mnist-training.css?v={revision}"><script type="module" src="/deep-learning/assets/mnist-training.js?v={revision}"></script></head>
<body class="mnist-app" data-tab="train"><header><h1>آموزش CNN روی MNIST</h1><p>۲٬۰۰۰ تصویر آموزش · ۵۰۰ تصویر اعتبارسنجی · از بخش آموزشی MNIST</p>
<nav aria-label="نمای آزمایشگاه"><button data-tab-button="train" aria-pressed="true">آموزش</button><button data-tab-button="data" aria-pressed="false">داده‌ها</button><button data-tab-button="code" aria-pressed="false">کد پایتون</button></nav></header>
<div class="mnist-toolbar"><button class="primary" data-load>آماده‌سازی داده و مدل</button><button class="primary" data-start disabled>شروع</button><button data-pause hidden>مکث</button><button data-step disabled>یک دسته</button><button data-validate disabled>اعتبارسنجی مدل</button><button data-reset disabled>از نو</button><button data-save disabled>ذخیرهٔ اجرا</button><span data-status role="status">بارگیری: ۳٫۸ مگابایت داده و کتابخانه؛ با انتخاب آماده‌سازی.</span></div>
<p class="mnist-error" data-error role="alert" hidden></p><main>
<aside class="mnist-settings"><fieldset data-settings><legend>تنظیمات آموزش</legend><div class="mnist-fields">
<label>تابع فعال‌ساز<select name="activation"><option value="relu">ReLU</option><option value="tanh">tanh</option><option value="sigmoid">sigmoid</option></select></label>
<label>نرخ یادگیری<input name="learningRate" type="number" min="0.0001" max="0.05" step="0.0001" value="0.001" dir="ltr"></label>
<label>اندازهٔ دسته<select name="batchSize"><option>16</option><option selected>32</option><option>64</option></select></label>
<label>تعداد دوره<input name="epochs" type="number" min="1" max="100" value="3" dir="ltr"></label>
<label>محل اجرا<select name="backend"><option value="webgpu">WebGPU</option><option value="cpu">CPU</option></select></label></div></fieldset>
<p class="mnist-small">تغییر فعال‌ساز، نرخ یادگیری، دسته یا محل اجرا، وزن‌ها را از نو می‌سازد.</p>
<h2>نمونهٔ انتخاب‌شده</h2><div class="mnist-selected"><canvas width="28" height="28" data-selected aria-label="تصویر رقم انتخاب‌شده"></canvas><p data-selected-caption>پس از آماده‌سازی، یک تصویر را انتخاب کن.</p></div>
<h2>انتخاب رقم اعتبارسنجی</h2><div class="mnist-strip" data-strip></div><p class="mnist-small">برای دیدن نقشه‌های همان تصویر، روی آن بزن.</p><p class="mnist-small" data-backend></p></aside>
<section class="mnist-results"><p class="mnist-architecture" dir="ltr">28×28×1 → Conv8 → Pool → Conv16 → Pool → Dense10</p>
<div class="mnist-readouts"><span>دسته: <output data-batches>۰</output></span><span>دوره: <output data-epochs>۰</output></span><span>زیان: <output data-loss>—</output></span><span>دقت اعتبارسنجی: <output data-accuracy>—</output></span></div>
<section class="mnist-validation" aria-labelledby="validation-title"><h2 id="validation-title">ارزیابی مدل</h2><p data-validation-summary role="status">برای ارزیابی مدل فعلی روی ۵۰۰ تصویر اعتبارسنجی، «اعتبارسنجی مدل» را بزن.</p><div data-validation-details hidden><div class="mnist-validation-table"><table><thead><tr><th scope="col">رقم</th><th scope="col">پیش‌بینی درست</th><th scope="col">تعداد</th><th scope="col">دقت</th></tr></thead><tbody data-validation-classes></tbody></table></div></div></section>
<div class="mnist-plots"><figure><figcaption>زیان <bdi>(Cross-entropy)</bdi></figcaption><svg viewBox="0 0 320 150" data-loss-chart role="img" aria-label="زیان واقعی دسته‌ها و اعتبارسنجی"></svg></figure><figure><figcaption>دقت</figcaption><svg viewBox="0 0 320 150" data-accuracy-chart role="img" aria-label="دقت واقعی دسته‌ها و اعتبارسنجی"></svg></figure></div><p class="mnist-legend"><span>آبی: دستهٔ آموزش</span><span>نارنجی: اعتبارسنجی در پایان دوره</span></p><details class="mnist-history" data-history><summary>جدول مقادیر آموزش</summary><div class="mnist-history-scroll" tabindex="0" role="region" aria-label="تاریخچه آموزش"><table><thead><tr><th scope="col">دسته</th><th scope="col">زیان آموزش</th><th scope="col">دقت آموزش (۰ تا ۱)</th><th scope="col">زیان اعتبارسنجی</th><th scope="col">دقت اعتبارسنجی (۰ تا ۱)</th></tr></thead><tbody data-history-rows></tbody></table></div></details>
<h2>خروجی کانولوشن اول</h2><div class="mnist-features" data-features></div><p class="mnist-small">مقیاس رنگ هر نقشه از کمینه تا بیشینهٔ همان نقشه است.</p>
<h2>فیلترهای آموخته‌شدهٔ ۳ × ۳</h2><div class="mnist-filters" data-filters></div><p class="mnist-small">آبی: وزن مثبت · نارنجی: وزن منفی · مقیاس مشترک میان فیلترها</p>
</section>
<section class="mnist-data"><h2>دستهٔ آموزش جاری</h2><p class="mnist-small" data-batch-info>اولین دسته با «یک دسته» یا «شروع» نمایش داده می‌شود.</p><div class="mnist-digits" data-training-digits></div><h2>تصاویر اعتبارسنجی و پیش‌بینی فعلی</h2><div class="mnist-digits" data-validation-digits></div><p class="mnist-small">تصاویر از مجموعهٔ آموزش رسمی انتخاب شده‌اند؛ شاخص‌های آموزش و اعتبارسنجی جدا هستند. دادهٔ آزمون استفاده نمی‌شود.</p><h2>مرور داده‌ها</h2><p class="mnist-small">۲٬۰۰۰ تصویر برای آموزش و ۵۰۰ تصویر جدا برای اعتبارسنجی؛ داده آزمون رسمی استفاده نمی‌شود. با انتخاب یک تصویر اعتبارسنجی، پیش‌بینی و نقشه‌های آن را ببین.</p><div class="mnist-browse-controls"><label>مجموعه <select data-browse-split><option value="train">آموزش</option><option value="validation">اعتبارسنجی</option></select></label><label>رقم <select data-browse-label><option value="all">همه</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option></select></label><button data-browse-previous disabled>صفحه قبل</button><span data-browse-page role="status">—</span><button data-browse-next disabled>صفحه بعد</button></div><div class="mnist-digits" data-browse-digits></div></section>
<section class="mnist-code"><h2>کد پایتون معادل</h2><p>اجرای این صفحه با TensorFlow.js است. این فایل همان معماری و پیش‌پردازش را در PyTorch آموزش می‌دهد؛ بذر و ترتیب تصادفی دو کتابخانه یکسان نیست.</p><a class="button" href="/deep-learning/labs/cnn-mnist/browser_train.py" download>دانلود کد پایتون</a><div data-python-code>در حال بارگیری کد…</div></section>
</main><noscript>برای آموزش زنده، جاوااسکریپت را فعال کن.</noscript></body></html>""")
    return target
