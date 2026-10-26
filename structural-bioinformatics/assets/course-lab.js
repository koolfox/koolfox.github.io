const labs = {
  sequence: ['توالی و جهت رشته‌ها', 'رشته را تغییر بده و مکمل معکوس، RNA آموزشی و درصد GC را مقایسه کن.'],
  geometry: ['هم‌ترازی و شکل مولکول', 'انتقال، چرخش و تغییر موضعی را جدا امتحان کن و اثر آن‌ها را بر RMSD و شعاع دوران ببین.'],
  energy: ['انرژی آزاد و احتمال', 'اختلاف انرژی آزاد دو حالت را تغییر بده و پیش از دیدن نتیجه، تغییر جمعیت آن‌ها را حدس بزن.'],
  minimization: ['کمینه‌سازی انرژی', 'اندازهٔ گام را تغییر بده و مسیر نزدیک‌شدن، نوسان یا دورشدن از کمینه را دنبال کن.'],
  sampling: ['نمونه‌برداری و میانگین‌ها', 'دادهٔ ساختگی را با بذر ثابت بساز و ببین میانگین کل چه تفاوت‌هایی را میان بازه‌ها پنهان می‌کند.'],
  graph: ['شبکهٔ تماس', 'آستانه و گره انتخاب‌شده را تغییر بده؛ یال‌ها و جدول همسایه‌ها از مختصات دوباره محاسبه می‌شوند.'],
};

export function appendCourseLab(article, topic) {
  const mode = topic.laboratory;
  if (!Object.hasOwn(labs, mode)) return;
  const [title, description] = labs[mode], section = document.createElement('section');
  section.id = 'interactive-lab'; section.className = 'course-laboratory';
  const heading = document.createElement('h2'); heading.textContent = 'آزمایش تعاملی: ' + title;
  const text = document.createElement('p'); text.textContent = description;
  const action = document.createElement('a'); action.id = 'course-lab-open';
  action.href = `runtime/concepts/?experiment=${mode}&topic=${topic.session}`;
  action.textContent = 'بازکردن آزمایشگاه در مرورگر';
  const help = document.createElement('p'); help.className = 'lab-loading-note';
  help.textContent = 'اجرای نخست به دریافت محیط Python نیاز دارد و ممکن است کمی طول بکشد. نتیجه، تنظیمات و یادداشت‌ها در آزمایشگاه قابل دریافت‌اند.';
  const source = document.createElement('a'); source.href = 'assets/course/interactive_lab.py';
  source.textContent = 'دریافت کد محاسبه برای اجرای محلی'; source.setAttribute('download', 'interactive_lab.py');
  section.append(heading, text, action, help, source); article.append(section);
}
