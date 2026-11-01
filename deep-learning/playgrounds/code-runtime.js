import { runApp, runExportedApp as runViewer } from './shinylive/shinylive.js';

export async function runExportedApp(options) {
    if (!new URLSearchParams(location.search).has('_danna-code')) return runViewer(options);
    const response = await fetch('./app.json');
    if (!response.ok) throw new Error('دریافت پروژهٔ آزمایشگاه ناموفق بود.');
    let files = await response.json();
    if (window.parent !== window) {
        const supplied = await new Promise(resolve => {
            const timeout = setTimeout(() => { window.removeEventListener('message', receive); resolve(null); }, 5000);
            function receive(event) {
                if (event.source !== window.parent || event.origin !== location.origin || event.data?.type !== 'danna-code-files') return;
                clearTimeout(timeout); window.removeEventListener('message', receive); resolve(event.data.files);
            }
            window.addEventListener('message', receive);
            window.parent.postMessage({ type: 'danna-code-boot' }, location.origin);
        });
        if (Array.isArray(supplied) && supplied.length) files = supplied;
        else if (new URLSearchParams(location.search).has('_danna-run')) {
            const message = 'کد ویرایش‌شده دریافت نشد؛ بازنشانی کد اولیه را بزن و دوباره تلاش کن.';
            window.parent.postMessage({ type: 'danna-code-error', message }, location.origin);
            throw new Error(message);
        }
    }
    // A fresh worker per code execution also clears imported modules and failed apps.
    document.addEventListener('click', event => {
        if (event.target.closest('button[aria-label^="Re-run app"]')) {
            event.preventDefault(); event.stopImmediatePropagation();
            window.parent.postMessage({ type: 'danna-code-run' }, location.origin);
        }
    }, true);
    document.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Enter') {
            event.preventDefault(); event.stopImmediatePropagation();
            window.parent.postMessage({ type: 'danna-code-run' }, location.origin);
        }
    }, true);
    runApp(document.getElementById(options.id), 'editor-terminal-viewer', { startFiles: files }, 'python');
}
