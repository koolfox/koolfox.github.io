const key = 'tnf-dataset-notebook-v1';
let payload, panel;
let revision = 0;
function element(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}
function paragraph(parent, title, text) {
  parent.append(element('h4', title), element('p', text));
}
function readNotes() {
  try { const notes = JSON.parse(localStorage.getItem(key) || '{}'); return notes && typeof notes === 'object' && !Array.isArray(notes) ? notes : {}; }
  catch { return {}; }
}
export async function renderDatasetWorkflow(container, unit) {
  const ticket = ++revision;
  payload ||= fetch('data/metadata/dataset-workflows.json').then(r => { if (!r.ok) throw Error('dataset workflow'); return r.json(); });
  const data = await payload;
  const item = data.chapters.find(row => row.unit === unit);
  const section = element('section'); section.className = 'dataset-workflow';
  section.append(element('h3', item.title));
  paragraph(section, 'پرسش تمرین', item.question);
  const files = element('ul');
  for (const file of item.files) {
    const li = element('li'), a = element('a', file.label);
    a.href = file.path; a.target = '_blank'; a.rel = 'noopener';
    li.append(a, element('code', file.path)); files.append(li);
  }
  section.append(element('h4', 'فایل‌های این تمرین'), files);
  if (item.source_url) { const a = element('a', 'دریافت ماتریس اصلی از GEO'); a.href = item.source_url; section.append(a); }
  const guide = element('a', 'راهنمای نصب و اجرای دستورها');
  guide.href = 'library.html?document=software-workbook.fa.md&chapter=all#reading';
  section.append(element('p', 'فایل‌ها را می‌توانید بدون نصب بخوانید. برای بازاجرای محاسبات، راهنمای نرم‌افزار را دنبال کنید.'), guide);
  const steps = element('ol'); item.steps.forEach(text => steps.append(element('li', text)));
  section.append(element('h4', 'انجام تمرین'), steps);
  if (item.command) {
    section.append(element('p', 'این دستور را در ترمینال، از پوشهٔ اصلی مخزن اجرا کنید. محیط Python باید طبق راهنمای نرم‌افزار نصب شده باشد.'));
    const pre = element('pre'); pre.dir = 'ltr'; pre.append(element('code', item.command)); section.append(pre);
  }
  paragraph(section, 'مقایسه با نتیجهٔ ثبت‌شده', item.expected);
  if (unit === 4) {
    panel ||= fetch('data/processed/top2a-panel-inspection.json').then(r => { if (!r.ok) throw Error('RNA panel'); return r.json(); });
    const result = await panel;
    const label = element('label', 'ژن برای مقایسه: '), select = element('select'); select.id = 'workflow-gene';
    result.panel.forEach(row => { const option = element('option', row.gene); option.value = row.gene; select.append(option); });
    const output = element('p'); output.id = 'workflow-gene-result';
    const update = () => { const row = result.panel.find(row => row.gene === select.value); output.textContent = `${row.gene}: در ${row.lower_cpm_pairs} از ${row.n_pairs} جفت، CPM کمتر است؛ میانهٔ نسبت تیمار به کنترل ${row.median_paired_cpm_ratio.toFixed(3)} است.`; };
    select.addEventListener('change', update); label.append(select); section.append(label, output); update();
    paragraph(section, 'این عدد را چطور بخوانیم؟', 'CPM یعنی سهم شمارش یک ژن از مجموع شمارش‌های کتابخانه، ضرب در یک میلیون. نسبت کمتر از یک یعنی سهم کمتر در تیمار؛ مثلاً ۰٫۷۵۴ به معنی حدود ۲۵٪ سهم کمتر است، نه ۲۵٪ مهار آنزیم. نسبت هر اهداکننده جدا محاسبه و سپس میانه گرفته شده است.');
  }
  paragraph(section, 'از تمرین به مقاله', item.paper);
  paragraph(section, 'حدود نتیجه', item.limit);
  const label = element('label', 'گزارش من: چه کردم، چه دیدم، چه نتیجه‌ای می‌توان گرفت؟');
  const notes = element('textarea'); notes.id = 'dataset-notes'; notes.rows = 5;
  notes.value = typeof readNotes()[unit] === 'string' ? readNotes()[unit] : '';
  label.append(notes);
  const status = element('p', 'یادداشت فقط در همین مرورگر ذخیره می‌شود؛ برای نگهداری مستقل، خروجی بگیرید.'); status.setAttribute('role', 'status');
  notes.addEventListener('input', () => {
    try { const saved = readNotes(); saved[unit] = notes.value; localStorage.setItem(key, JSON.stringify(saved)); status.textContent = 'یادداشت در این مرورگر ذخیره شد.'; }
    catch { status.textContent = 'مرورگر اجازهٔ ذخیره نداد؛ پیش از خروج، یادداشت‌ها را دریافت کنید.'; }
  });
  const download = element('button', 'دریافت یادداشت‌های تمرین‌ها'); download.type = 'button';
  download.addEventListener('click', () => {
    const saved = readNotes(); saved[unit] = notes.value;
    const text = data.chapters.map(row => `# ${row.title}\n\n${saved[row.unit] || 'هنوز یادداشتی نوشته نشده است.'}`).join('\n\n');
    const url = URL.createObjectURL(new Blob([text], {type: 'text/plain;charset=utf-8'}));
    const a = element('a'); a.href = url; a.download = 'dataset-notebook.fa.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  section.append(label, status, download);
  if (ticket === revision && container.isConnected) container.replaceChildren(section);
}
