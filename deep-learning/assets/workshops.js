(() => {
  'use strict';
  document.querySelectorAll('[data-workshop]').forEach(section => {
    const config = JSON.parse(section.querySelector('[data-workshop-config]').textContent);
    const editor = section.querySelector('[data-workshop-code]');
    const status = section.querySelector('[data-workshop-status]');
    const output = section.querySelector('[data-workshop-result]');
    const consoleOutput = section.querySelector('[data-workshop-console]');
    const run = section.querySelector('[data-workshop-run]');
    const stop = section.querySelector('[data-workshop-stop]');
    const recordButton = section.querySelector('[data-workshop-record]');
    let worker = null, timer = null, record = null;
    function finish() {
      if (worker) worker.terminate();
      worker = null;
      clearTimeout(timer);
      run.disabled = false;
      stop.disabled = true;
      editor.readOnly = false;
      section.removeAttribute('aria-busy');
    }
    function clearResult() {
      output.replaceChildren();
      consoleOutput.hidden = true;
      consoleOutput.textContent = '';
      record = null;
      recordButton.disabled = true;
    }
    function fail(message, detail = '') {
      finish(); clearResult();
      status.textContent = message;
      if (detail) { consoleOutput.textContent = detail; consoleOutput.hidden = false; }
    }
    function download(name, text, type) {
      const url = URL.createObjectURL(new Blob([text], {type}));
      const a = document.createElement('a'); a.href = url; a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function showResult(result) {
      const table = document.createElement('table');
      table.className = 'workshop-output';
      const caption = document.createElement('caption');
      caption.textContent = 'خروجی دیکشنری result از اجرای فعلی'; table.append(caption);
      const tbody = document.createElement('tbody'); table.append(tbody);
      for (const [key, value] of Object.entries(result)) {
        const row = document.createElement('tr'), label = document.createElement('th'), cell = document.createElement('td');
        label.scope = 'row'; label.textContent = key; label.dir = 'ltr';
        const text = document.createElement('pre'); text.dir = 'ltr';
        text.textContent = JSON.stringify(value, null, 2); cell.append(text);
        row.append(label, cell); tbody.append(row);
      }
      output.append(table);
    }
    editor.addEventListener('input', () => {
      clearResult(); status.textContent = 'کد تغییر کرده است؛ برای دیدن نتیجهٔ تازه، دوباره اجرا کن.';
    });
    run.addEventListener('click', () => {
      finish(); clearResult();
      const source = editor.value;
      if (!source.trim() || source.length > 30000) {
        status.textContent = 'کد باید بین یک تا ۳۰٬۰۰۰ نویسه داشته باشد.'; return;
      }
      run.disabled = true; stop.disabled = false; editor.readOnly = true;
      section.setAttribute('aria-busy','true');
      status.textContent = 'در حال بارگیری پایتون؛ دریافت نخست محیط ممکن است کمی طول بکشد…';
      const instance = new Worker('/deep-learning/assets/workshop-worker.mjs', {type:'module'});
      worker = instance;
      timer = setTimeout(() => fail('پایتون در زمان مقرر بارگیری نشد. اتصال را بررسی و دوباره اجرا کن؛ دریافت کد همچنان در دسترس است.'), 60000);
      instance.onerror = () => { if (worker === instance) fail('محیط پایتون بارگیری نشد؛ اتصال را بررسی و دوباره اجرا کن.'); };
      instance.onmessage = ({data}) => {
        if (worker !== instance) return;
        if (data.type === 'ready') {
          clearTimeout(timer);
          status.textContent = 'پایتون آماده است؛ کد شما در حال اجراست…';
          timer = setTimeout(() => fail('اجرا پس از پنج ثانیه متوقف شد. حلقه یا اندازهٔ مسئله را بررسی کن و دوباره اجرا کن.'), 5000);
          instance.postMessage({type:'run',source});
        } else if (data.type === 'error') {
          fail('پایتون خطا داد. پیام و شمارهٔ خط را بخوان، کد را اصلاح کن و دوباره اجرا کن.', data.message);
        } else if (data.type === 'result') {
          finish();
          record = {schema_version:1, workshop:section.dataset.workshop, source_code:source,
            starter_sha256:config.starter_sha256, python:data.value.python,
            result:data.value.result, stdout:data.value.stdout, executed_at_utc:new Date().toISOString()};
          showResult(record.result);
          if (record.stdout) { consoleOutput.textContent = record.stdout; consoleOutput.hidden = false; }
          recordButton.disabled = false;
          status.textContent = `اجرا تمام شد · Python ${record.python}. خروجی متعلق به همین کد است؛ آن را با پیش‌بینی و نتیجهٔ مرجع مقایسه کن.`;
        }
      };
      instance.postMessage({type:'load'});
    });
    stop.addEventListener('click', () => fail('اجرا متوقف شد. می‌توانی کد را ویرایش و دوباره اجرا کنی.'));
    section.querySelector('[data-workshop-reset]').addEventListener('click', () => {
      finish(); clearResult(); editor.value = config.code;
      status.textContent = 'کد اولیه برگشت؛ برای محاسبهٔ نتیجه، اجرا کن.';
    });
    section.querySelector('[data-workshop-download]').addEventListener('click', () => download(section.dataset.workshop.replace('/','-')+'.py', editor.value, 'text/x-python'));
    recordButton.addEventListener('click', () => { if (record) download('workshop-result.json', JSON.stringify(record,null,2), 'application/json'); });
    window.addEventListener('pagehide',finish);
  });
})();
