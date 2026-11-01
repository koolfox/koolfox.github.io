import {createPythonEditor} from './vendor/python-editor/editor.mjs';

let notebookCount = 0;

function node(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const link = node('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// A stored ZIP keeps the notebook beside its exact native Python modules.
// No package download or remote source lookup is needed when opening it later.
export function storedZip(files) {
  const encoder = new TextEncoder(), local = [], central = [];
  let offset = 0, directorySize = 0;
  function header(size) { const bytes = new Uint8Array(size); return [bytes, new DataView(bytes.buffer)]; }
  for (const [name, text] of Object.entries(files)) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) throw Error('Invalid notebook filename');
    const filename = encoder.encode(name), bytes = encoder.encode(text);
    let checksum = 0xffffffff;
    for (const byte of bytes) {
      checksum ^= byte;
      for (let bit = 0; bit < 8; bit++) checksum = (checksum >>> 1) ^ ((checksum & 1) ? 0xedb88320 : 0);
    }
    checksum = (checksum ^ 0xffffffff) >>> 0;
    const [entry, view] = header(30);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true);
    view.setUint16(6, 0x800, true); view.setUint32(14, checksum, true);
    view.setUint16(12, 33, true);
    view.setUint32(18, bytes.length, true); view.setUint32(22, bytes.length, true);
    view.setUint16(26, filename.length, true);
    local.push(entry, filename, bytes);
    const [record, fields] = header(46);
    fields.setUint32(0, 0x02014b50, true); fields.setUint16(4, 20, true); fields.setUint16(6, 20, true);
    fields.setUint16(8, 0x800, true); fields.setUint32(16, checksum, true);
    fields.setUint16(14, 33, true);
    fields.setUint32(20, bytes.length, true); fields.setUint32(24, bytes.length, true);
    fields.setUint16(28, filename.length, true); fields.setUint32(42, offset, true);
    central.push(record, filename); directorySize += record.length + filename.length;
    offset += entry.length + filename.length + bytes.length;
  }
  const [end, fields] = header(22), count = Object.keys(files).length;
  fields.setUint32(0, 0x06054b50, true); fields.setUint16(8, count, true); fields.setUint16(10, count, true);
  fields.setUint32(12, directorySize, true); fields.setUint32(16, offset, true);
  return new Blob([...local, ...central, end], {type: 'application/zip'});
}

function validCells(value) {
  return Array.isArray(value) && value.length > 0 && value.length <= 12
    && value.every(cell => cell && typeof cell.title === 'string' && cell.title.length <= 100
      && typeof cell.source === 'string')
    && value.reduce((count, cell) => count + cell.source.length, 0) <= 50000;
}

export function mountNotebook(root, options) {
  const questions = options.questions || [];
  const defaults = structuredClone(options.cells), storageKey = 'danna:notebook:v1:' + options.key;
  const identity = 'notebook-' + (++notebookCount);
  let cells = structuredClone(defaults), selected = 0, versions = [], answers = [], record = null;
  let ready = false, busy = false, activeRequest = null, paused = false;
  try {
    const raw = localStorage.getItem(storageKey);
    const saved = raw && raw.length <= 1000000 ? JSON.parse(raw) : null;
    if (saved?.schema_version === 1 && validCells(saved.cells)) {
      cells = saved.cells;
      answers = Array.isArray(saved.answers) ? saved.answers.map((value,index)=>Number.isInteger(value)&&value>=0&&value<(questions[index]?.options.length||0)?value:null) : [];
      versions = Array.isArray(saved.versions) ? saved.versions.filter(v => validCells(v.cells)).slice(-8) : [];
    }
  } catch { /* Download remains available when browser storage is blocked. */ }

  root.classList.add('student-notebook'); root.replaceChildren();
  const modes = node('div', 'nb-modes'), codeMode = node('button', '', 'سلول‌های کد');
  const quizMode = node('button', '', 'آزمون تستی');
  modes.setAttribute('role', 'tablist'); modes.setAttribute('aria-label', 'بخش دفترچه');
  const code = node('section', 'nb-code'), quiz = node('section', 'nb-quiz');
  for (const [button, panel, name] of [[codeMode, code, 'code'], [quizMode, quiz, 'quiz']]) {
    button.type = 'button'; button.id = identity + '-tab-' + name;
    panel.id = identity + '-panel-' + name; button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panel.id); panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', button.id); modes.append(button);
  }
  quizMode.hidden = questions.length === 0;
  const list = node('div', 'nb-cells'), add = node('button', '', 'افزودن سلول');
  add.type = 'button'; add.dataset.notebookAdd = '';
  let editors = [], cellRows = [];
  const actions = node('div', 'nb-actions'), runAll = node('button', 'primary', 'اجرای همهٔ سلول‌ها');
  const stop = node('button', '', 'توقف پایتون');
  const capture = node('button', '', 'کنترل‌ها به تنظیمات'), restart = node('button', '', 'راه‌اندازی پایتون');
  for (const button of [runAll, capture, add, stop, restart]) { button.type = 'button'; actions.append(button); }
  runAll.dataset.notebookRunAll = '';
  capture.hidden = !options.capture; stop.hidden = true; restart.hidden = true;
  const status = node('p', 'nb-status', 'هر اجرا، سلول‌های قبلی را از ابتدا محاسبه می‌کند؛ نتیجهٔ پنهان از اجرای قبل باقی نمی‌ماند.');
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const hint = node('p', 'nb-editor-help', 'تکمیل کد: Ctrl+Space · اجرای سلول: Ctrl+Enter · اجرا و سلول بعد: Shift+Enter');
  const errorOutput = node('pre', 'nb-output nb-error'); errorOutput.dir = 'ltr'; errorOutput.hidden = true;
  const tools = node('details', 'nb-tools'), summary = node('summary', '', 'نسخه‌ها و دریافت نوت‌بوک');
  const versionRow = node('div', 'nb-version-tools'), versionName = node('input');
  versionName.type = 'text'; versionName.maxLength = 60; versionName.placeholder = 'نام نسخه، اختیاری';
  versionName.setAttribute('aria-label', 'نام نسخه');
  const saveVersion = node('button', '', 'ذخیرهٔ نسخه'), versionPicker = node('select');
  versionPicker.setAttribute('aria-label', 'نسخه‌های ذخیره‌شده');
  const exportBook = node('button', '', 'دریافت برای Jupyter');
  for (const button of [saveVersion, exportBook]) button.type = 'button';
  exportBook.dataset.notebookDownload = ''; saveVersion.dataset.notebookSave = '';
  versionRow.append(versionName, saveVersion, versionPicker, exportBook); tools.append(summary, versionRow);
  code.append(actions, status, hint, errorOutput, list, tools);
  root.append(modes, code, quiz);

  function message(text, error = false) { status.textContent = text; status.dataset.error = String(error); }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({schema_version: 1, cells, versions, answers})); }
    catch { message('ذخیرهٔ مرورگر ممکن نیست؛ پیش از بستن صفحه، نوت‌بوک را دریافت کن.', true); }
  }
  function controls() {
    runAll.disabled = !ready || busy;
    editors.forEach(editor => editor.setReadOnly(busy));
    cellRows.forEach(row => { row.run.disabled = !ready || busy; row.reset.disabled = busy; });
    add.disabled = busy || cells.length >= 12;
    capture.disabled = !ready || busy; saveVersion.disabled = busy;
    versionPicker.disabled = busy || versions.length === 0;
    stop.hidden = !busy; restart.hidden = !paused;
  }
  function showOutput() {
    cellRows.forEach((row, index) => {
      const value = record?.outputs?.find(item => item.index === index);
      const pieces = value ? [value.stdout, value.error, value.result === null || value.result === undefined ? '' : JSON.stringify(value.result, null, 2)] : [];
      const text = pieces.filter(Boolean).join('\n');
      row.output.textContent = text; row.output.hidden = !text;
      row.execution.textContent = value ? (value.error ? 'خطا' : 'اجرا شد') : 'اجرا نشده';
    });
    errorOutput.textContent = record?.error || ''; errorOutput.hidden = !record?.error;
  }
  function focusCell(index) { selected = index; editors[index]?.focus(); }
  function draw() {
    editors.forEach(editor => editor.destroy()); editors = []; cellRows = []; list.replaceChildren();
    cells.forEach((cell, index) => {
      const number = new Intl.NumberFormat('fa-IR').format(index + 1);
      const section = node('section', 'nb-cell'), bar = node('div', 'nb-cell-bar');
      section.dataset.notebookCell = String(index);
      const title = node('h3', '', `${number} · ${cell.title}`); title.id = identity + '-cell-' + index;
      section.setAttribute('aria-labelledby', title.id);
      const execution = node('span', 'nb-execution'), runCell = node('button', '', 'اجرا');
      runCell.type = 'button'; runCell.dataset.notebookRunCell = String(index);
      runCell.setAttribute('aria-label', `اجرا تا سلول ${number}`);
      runCell.addEventListener('click', () => run(index));
      const resetCell = node('button', '', 'کد اولیه'); resetCell.type = 'button';
      resetCell.setAttribute('aria-label', `بازگرداندن سلول ${number}`);
      resetCell.addEventListener('click', () => { cells[index].source = defaults[index]?.source || '# آزمایش من\n'; changed(); draw(); focusCell(index); });
      bar.append(title, execution, runCell, resetCell);
      const editorHost = node('div', 'nb-cell-editor'), output = node('pre', 'nb-output');
      output.dir = 'ltr'; output.hidden = true; output.dataset.notebookOutput = String(index);
      section.append(bar, editorHost, output); list.append(section);
      const editor = createPythonEditor(editorHost, {source: cell.source, label: `کد سلول ${number} پایتون`,
        getSource: () => cells.map(item => item.source).join('\n'),
        onFocus: () => { selected = index; },
        onChange: source => { cells[index].source = source; selected = index; changed(); },
        onRun: async advance => { if (await run(index) && advance && index + 1 < cells.length) focusCell(index + 1); },
      });
      editors.push(editor); cellRows.push({run: runCell, reset: resetCell, execution, output});
    });
    showOutput(); controls();
  }
  function changed() {
    record = null; showOutput(); save();
    message(options.capture ? 'کد تغییر کرده؛ نمودار و مقدارهای آزمایش هنوز متعلق به آخرین اجرای موفق‌اند.' : 'کد تغییر کرده؛ برای دیدن خروجی، سلول را اجرا کن.');
  }
  function mode(name) {
    code.hidden = name !== 'code'; quiz.hidden = name !== 'quiz';
    for (const [button, current] of [[codeMode, 'code'], [quizMode, 'quiz']]) {
      button.setAttribute('aria-selected', String(name === current)); button.tabIndex = name === current ? 0 : -1;
    }
  }
  function drawVersions() {
    versionPicker.replaceChildren(node('option', '', 'بازیابی یک نسخه…')); versionPicker.firstChild.value = '';
    versions.forEach((version, index) => { const option = node('option', '', version.name); option.value = String(index); versionPicker.append(option); });
    versionPicker.disabled = versions.length === 0;
  }
  async function run(until) {
    if (!ready || busy) return;
    save(); busy = true; record = null; showOutput(); controls();
    const id = crypto.randomUUID(); activeRequest = id;
    message(`در حال اجرای سلول‌های ۱ تا ${until + 1}…`);
    try {
      const result = await options.execute({id, cells: structuredClone(cells), until}, message);
      if (activeRequest !== id) return;
      record = result; showOutput();
      if (!result.ok) message('پایتون خطا داد؛ شمارهٔ سلول و خط را در خروجی بخوان، اصلاح کن و دوباره اجرا کن.', true);
      else message(`سلول‌های ۱ تا ${until + 1} اجرا شدند${result.python ? ' · Python ' + result.python : ''}. ${result.applied_to_lab === false ? 'مدل با اجرای سلول ساخت و محاسبه به‌روز می‌شود.' : 'خروجی از همین کد محاسبه شده است.'}`);
      return result.ok;
    } catch (error) { if (activeRequest === id) message(String(error.message || error), true); }
    finally { if (activeRequest === id) { busy = false; activeRequest = null; controls(); } }
  }
  add.addEventListener('click', () => { if (cells.length >= 12) return; cells.push({title: 'آزمایش من', source: '# یک تغییر کوچک را اینجا بررسی کن.\n'}); selected = cells.length - 1; changed(); draw(); focusCell(selected); });
  runAll.addEventListener('click', () => run(cells.length - 1));
  stop.addEventListener('click', () => { activeRequest = null; busy = false; controls(); options.stop?.(); message('اجرا متوقف شد؛ کدها حفظ شده‌اند.'); });
  restart.addEventListener('click', () => options.restart?.());
  capture.addEventListener('click', () => { try { cells[0].source = options.capture(cells[0].source); selected = 0; changed(); draw(); } catch (error) { message(error.message, true); } });
  codeMode.addEventListener('click', () => mode('code')); quizMode.addEventListener('click', () => mode('quiz'));
  modes.addEventListener('keydown', event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || quizMode.hidden) return; event.preventDefault(); const next = event.key === 'Home' ? 'code' : event.key === 'End' ? 'quiz' : code.hidden ? 'code' : 'quiz'; mode(next); (next === 'code' ? codeMode : quizMode).focus(); });
  saveVersion.addEventListener('click', () => {
    versions.push({name: versionName.value.trim() || `نسخهٔ ${versions.length + 1}`, cells: structuredClone(cells), saved_at_utc: new Date().toISOString()});
    versions = versions.slice(-8); save(); drawVersions(); message('نسخهٔ کد ذخیره شد؛ بازیابی آن اجرای خودکار ندارد.');
  });
  versionPicker.addEventListener('change', () => { if (!versionPicker.value) return; cells = structuredClone(versions[Number(versionPicker.value)].cells); selected = 0; changed(); draw(); });
  exportBook.addEventListener('click', async () => {
    try {
      const notebook = {nbformat: 4, nbformat_minor: 5, metadata: {kernelspec: {display_name: 'Python 3', language: 'python', name: 'python3'}, language_info: {name: 'python', ...(record?.python ? {version: record.python} : {})}}, cells: []};
      for (let index = 0; index < cells.length; index++) {
        const cell = cells[index], actual = record?.outputs?.find(item => item.index === index), outputs = [];
        if (actual?.stdout) outputs.push({output_type: 'stream', name: 'stdout', text: actual.stdout});
        if (actual?.result !== undefined && actual.result !== null) outputs.push({output_type: 'execute_result', execution_count: index + 1, metadata: {}, data: {'text/plain': JSON.stringify(actual.result, null, 2)}});
        if (actual?.error) outputs.push({output_type: 'error', ename: 'PythonError', evalue: actual.error, traceback: actual.error.split('\n')});
        notebook.cells.push({cell_type: 'code', id: 'cell-' + (index + 1), metadata: {title: cell.title}, execution_count: actual ? index + 1 : null, source: cell.source.match(/[^\n]*\n|[^\n]+$/g) || [], outputs});
      }
      const name = options.filename || 'learning-notebook', files = {...(await options.getFiles?.() || {})};
      if (options.license_text) files['LICENSE.txt'] = options.license_text;
      files[name + '.ipynb'] = JSON.stringify(notebook, null, 2);
      const sourceHashes = {};
      for (const [filename, source] of Object.entries(files)) {
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
        sourceHashes[filename] = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
      }
      files['notebook-execution.json'] = JSON.stringify({schema_version: 1, notebook: options.key, execution: record, source_files_sha256: sourceHashes, exported_at_utc: new Date().toISOString()}, null, 2);
      files['README.txt'] = 'پوشه را استخراج کن و فایل .ipynb را با Jupyter باز کن. فایل‌های .py را کنار آن نگه دار و سلول‌ها را از ابتدا به ترتیب اجرا کن. مثال‌های پایه فقط به کتابخانهٔ استاندارد Python 3.11 یا جدیدتر نیاز دارند. سلول ویرایش‌شده تا اجرای دوباره خروجی ذخیره‌شده ندارد. مجوز کد در LICENSE.txt است.\n';
      const zip = storedZip(files); download(name + '.zip', zip, 'application/zip');
    } catch (error) { message('دریافت نوت‌بوک انجام نشد: ' + error.message, true); }
  });
  if (options.source_pages?.length && options.goToSource) {
    const sources = node('details', 'nb-source-questions'), summary = node('summary', '', 'پرسش‌ها و فعالیت‌های خود اسلایدها');
    const links = node('div', 'nb-actions');
    for (const page of options.source_pages) {
      const activity = options.activity_pages?.includes(page);
      const button = node('button', '', `${activity ? 'فعالیت' : 'صفحهٔ'} ${new Intl.NumberFormat('fa-IR').format(page)}`);
      button.type = 'button'; button.addEventListener('click', () => options.goToSource(page)); links.append(button);
    }
    sources.append(summary, links); quiz.append(sources);
  }
  questions.forEach((question, index) => {
    const form = node('form', 'nb-question'), title = node('legend', '', question.prompt), fieldset = node('fieldset'); fieldset.append(title);
    question.options.forEach((option, choice) => { const label = node('label', 'choice'), input = node('input'); input.type = 'radio'; input.name = 'answer'; input.value = String(choice); input.required = true; input.checked = answers[index] === choice; const text=node('span','',option);text.dir=/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(option)?'ltr':'auto';label.append(input,text);fieldset.append(label); });
    const check = node('button', '', 'بررسی پاسخ'), feedback = node('p', 'feedback'); check.type = 'submit'; feedback.setAttribute('role', 'status');
    form.append(fieldset, check, feedback); form.dataset.notebookQuestion = String(index);
    form.addEventListener('submit', event => { event.preventDefault(); const answer = new FormData(form).get('answer'); if (answer === null) return; answers[index] = Number(answer); save(); const correct = Number(answer) === question.correct; feedback.textContent = (correct ? 'درست است. ' : 'دوباره مقایسه کن. ') + question.explanation; feedback.dataset.state = correct ? 'correct' : 'incorrect'; });
    if (question.source_page && options.goToSource) {
      const source = node('button', '', `اسلاید مرتبط · صفحهٔ ${question.source_page}`); source.type = 'button';
      source.addEventListener('click', () => options.goToSource(question.source_page)); form.append(source);
    }
    quiz.append(form);
  });
  if (options.tip) {
    const tip = node('article', 'nb-question nb-code-tip');
    tip.append(node('h3', '', 'نکته با کد'), node('p', '', options.tip.explanation));
    const details = node('details'), summary = node('summary', '', 'کد این نکته');
    const sample = node('pre', 'nb-output', options.tip.code); sample.dir = 'ltr';
    details.append(summary, sample); tip.append(details); quiz.append(tip);
  }
  mode('code'); drawVersions(); draw();
  return {
    setReady(value) { ready = Boolean(value); controls(); },
    setPaused(value) { paused = Boolean(value); controls(); },
    get cells() { return structuredClone(cells); },
    get record() { return structuredClone(record); },
    showQuiz() { mode('quiz'); },
    showCode() { mode('code'); },
    focusCell,
  };
}
