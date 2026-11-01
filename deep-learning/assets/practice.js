import {mountNotebook} from './notebook.js';

const config = JSON.parse(document.querySelector('#practice-config').textContent);
let worker, timer, rejectRun;
function finish() { clearTimeout(timer); worker?.terminate(); worker = null; }
function goToSource(page) {
  if (parent !== window) parent.postMessage({type: 'danna-source-page', page}, location.origin);
  else location.href = config.reader + '#page=' + page;
}
const book = mountNotebook(document.querySelector('#practice-notebook'), {
  ...config, goToSource,
  execute(request, status) {
    finish();
    return new Promise((resolve, reject) => {
      rejectRun = reject;
      const current = new Worker(new URL('./notebook-worker.mjs', import.meta.url), {type: 'module'}); worker = current;
      status('در حال آماده‌سازی پایتون…');
      timer = setTimeout(() => { finish(); reject(Error('پایتون دریافت نشد؛ اتصال را بررسی و دوباره اجرا کن.')); }, 60000);
      current.onerror = () => { finish(); reject(Error('راه‌اندازی پایتون انجام نشد؛ کد و دریافت نوت‌بوک همچنان در دسترس‌اند.')); };
      current.onmessage = ({data}) => {
        if (worker !== current) return;
        if (data.type === 'ready') {
          clearTimeout(timer); status('در حال اجرای کد…');
          timer = setTimeout(() => { finish(); reject(Error('اجرا پس از پنج ثانیه متوقف شد؛ حلقه یا اندازهٔ محاسبه را بررسی کن.')); }, 5000);
          current.postMessage({type: 'run', request});
        } else if (data.type === 'result') { finish(); resolve(data.value); }
        else if (data.type === 'error') { finish(); reject(Error(data.message)); }
      };
      current.postMessage({type: 'load'});
    });
  },
  stop() { finish(); rejectRun?.(Error('اجرا متوقف شد.')); },
  getFiles() { return {'starter.py': config.starter, 'source-reference.json': JSON.stringify({source_url: config.source_url, source_sha256: config.source_sha256, starter_sha256: config.starter_sha256}, null, 2)}; },
});
book.setReady(true); window.studentNotebook = book;
function section() { if (location.hash === '#questions') book.showQuiz(); else book.showCode(); }
section(); window.addEventListener('hashchange', section);
document.querySelector('[data-return-slide]').addEventListener('click', event => { if (parent !== window) { event.preventDefault(); goToSource(config.source_page); } });
for (const lab of config.related_labs) {
  const link = document.createElement('a'); link.textContent = 'آزمایش زندهٔ مرتبط';
  link.href = lab.url;
  link.title = lab.goal_fa; link.target = '_top'; document.querySelector('[data-related-labs]').append(link);
}
window.addEventListener('pagehide', finish);
