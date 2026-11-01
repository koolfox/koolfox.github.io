(() => {
    const frame = document.querySelector('[data-code-runtime]');
    if (!frame) return;
    const status = document.querySelector('[data-workbench-status]');
    const controls = [...document.querySelectorAll('[data-workbench-action]')];
    let observer;
    let initialized = false;
    let busy = false;
    let restarting = false;
    let pendingProject = null;
    let revision = 0;

    function message(text, error = false) {
        status.textContent = text;
        status.dataset.error = String(error);
    }

    function nativeButton(label) {
        return [...frame.contentDocument.querySelectorAll('button[aria-label]')]
            .find(button => button.getAttribute('aria-label').startsWith(label));
    }

    function refresh() {
        const run = nativeButton('Re-run app');
        const ready = Boolean(run && !run.disabled);
        const editorReady = Boolean(frame.contentDocument.querySelector('.cm-content'));
        for (const control of controls) {
            const action = control.dataset.workbenchAction;
            control.disabled = busy || (action !== 'reset' && (restarting || !(action === 'run' ? ready : editorReady)));
        }
        if (ready && !initialized) {
            initialized = true;
            if (revision === 0) message('ویرایشگر آماده است. تغییر کد را اجرا کن؛ خروجی کنار آن و پیام‌ها در کنسول دیده می‌شوند.');
        }
    }

    function projectFiles() {
        return new Promise((resolve, reject) => {
            const channel = new MessageChannel();
            const timeout = setTimeout(() => {
                channel.port1.close();
                reject(new Error('ویرایشگر پاسخ نداد؛ کمی صبر کن و دوباره تلاش کن.'));
            }, 5000);
            channel.port1.onmessage = event => {
                clearTimeout(timeout);
                channel.port1.close();
                const files = event.data?.files;
                if (!Array.isArray(files) || files.length === 0) {
                    reject(new Error('فایل‌های پروژه هنوز آماده نیستند.'));
                } else resolve(files);
            };
            frame.contentWindow.postMessage({ type: 'getFiles' }, location.origin, [channel.port2]);
        });
    }

    function setProject(files) {
        pendingProject = files;
        restarting = true;
        const url = new URL(frame.src);
        url.searchParams.set('_danna-run', String(++revision));
        frame.src = url.href;
    }

    function downloadProject(files) {
        // ZIP32 stored entries: preserve exact text and binary files without a service.
        const encoder = new TextEncoder();
        const chunks = [], directory = [];
        let offset = 0, directorySize = 0;
        if (files.length > 65535) throw new Error('تعداد فایل‌ها برای دریافت یک پروژه بیش از حد است.');
        const crc32 = bytes => {
            let crc = 0xffffffff;
            for (const byte of bytes) {
                crc ^= byte;
                for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
            }
            return (crc ^ 0xffffffff) >>> 0;
        };
        for (const file of files) {
            if (!file.name || file.name.startsWith('/') || file.name.includes('\\') || file.name.split('/').some(part => part === '..' || !part)) {
                throw new Error('نام یکی از فایل‌ها مسیر نسبی معتبر نیست؛ نام آن را در ویرایشگر اصلاح کن.');
            }
            const name = encoder.encode(file.name);
            const bytes = file.type === 'text' ? encoder.encode(file.content)
                : typeof file.content === 'string' ? Uint8Array.from(atob(file.content), c => c.charCodeAt(0))
                : new Uint8Array(file.content);
            if (name.length > 65535 || bytes.length > 0xffffffff) throw new Error('فایل برای این دریافت بیش از حد بزرگ است.');
            const crc = crc32(bytes);
            const local = new Uint8Array(30), lv = new DataView(local.buffer);
            lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true);
            lv.setUint16(6, 0x800, true); lv.setUint16(12, 0x21, true);
            lv.setUint32(14, crc, true); lv.setUint32(18, bytes.length, true);
            lv.setUint32(22, bytes.length, true); lv.setUint16(26, name.length, true);
            const central = new Uint8Array(46), cv = new DataView(central.buffer);
            cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
            cv.setUint16(8, 0x800, true); cv.setUint16(14, 0x21, true); cv.setUint32(16, crc, true);
            cv.setUint32(20, bytes.length, true); cv.setUint32(24, bytes.length, true);
            cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true);
            chunks.push(local, name, bytes); directory.push(central, name);
            offset += local.length + name.length + bytes.length;
            directorySize += central.length + name.length;
        }
        const end = new Uint8Array(22), ev = new DataView(end.buffer);
        ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
        ev.setUint32(12, directorySize, true); ev.setUint32(16, offset, true);
        const url = URL.createObjectURL(new Blob([...chunks, ...directory, end], { type: 'application/zip' }));
        const anchor = document.createElement('a');
        anchor.href = url; anchor.download = 'deep-learning-project.zip';
        document.body.append(anchor); anchor.click(); anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    function liveConfig() {
        const viewer = frame.contentDocument.querySelector('.shinylive-viewer iframe');
        const view = viewer?.contentWindow;
        const state = view?.dannaLab?.state || view?.dannaNetwork?.state
            || view?.dannaConvolution || view?.dannaOperations;
        if (!state?.config) throw new Error('اجرای معتبری برای دریافت تنظیمات وجود ندارد؛ ابتدا خطای کد یا ورودی را برطرف کن.');
        return state.config;
    }

    function pythonLiteral(value, level = 0) {
        const indent = '    '.repeat(level);
        const next = indent + '    ';
        if (value === null) return 'None';
        if (typeof value === 'boolean') return value ? 'True' : 'False';
        if (typeof value === 'number' && Number.isFinite(value)) return String(value);
        if (typeof value === 'string') return JSON.stringify(value);
        if (Array.isArray(value)) return '[' + value.map(item => pythonLiteral(item, level)).join(', ') + ']';
        if (typeof value === 'object') {
            return '{\n' + Object.entries(value).map(([key, item]) =>
                next + JSON.stringify(key) + ': ' + pythonLiteral(item, level + 1) + ','
            ).join('\n') + '\n' + indent + '}';
        }
        throw new Error('این مقدار را نمی‌توان به پارامتر پایتون تبدیل کرد.');
    }

    async function captureConfiguration() {
        const config = liveConfig();
        const files = await projectFiles();
        const experiment = files.find(file => file.name === 'experiment.py');
        const begin = '# BEGIN CONFIG';
        const end = '# END CONFIG';
        const source = experiment?.content;
        if (typeof source !== 'string' || source.split(begin).length !== 2 || source.split(end).length !== 2) {
            throw new Error('نشان‌های BEGIN CONFIG و END CONFIG در experiment.py باید یک‌بار وجود داشته باشند؛ کد سفارشی تو تغییر نکرد.');
        }
        const start = source.indexOf(begin);
        const finish = source.indexOf(end);
        if (finish < start) throw new Error('ترتیب نشان‌های CONFIG درست نیست؛ کد تغییر نکرد.');
        experiment.content = source.slice(0, start) + begin + '\nCONFIG = '
            + pythonLiteral(config) + '\n' + end + source.slice(finish + end.length);
        setProject(files);
        message('تنظیمات فعلی در CONFIG ثبت شد؛ اجرای تازه از همان بذر آغاز می‌شود. کد توابع دیگر حفظ شد.');
    }

    async function perform(action) {
        busy = true;
        refresh();
        try {
            if (action === 'run') {
                setProject(await projectFiles());
                message('اجرای کد درخواست شد. نتیجه را در پنجرهٔ خروجی و خطاها را در کنسول بررسی کن.');
            } else if (action === 'download') {
                downloadProject(await projectFiles());
                message('دریافت پروژه با ویرایش‌های فعلی درخواست شد. این فایل شامل کد مدل و رابط است.');
            } else if (action === 'capture') {
                await captureConfiguration();
            } else if (action === 'reset') {
                const response = await fetch(new URL('./app.json', frame.src));
                if (!response.ok) throw new Error('کد اولیه دریافت نشد؛ اتصال را بررسی کن و دوباره تلاش کن.');
                setProject(await response.json());
                message('تمام فایل‌ها به کد اولیه برگشتند؛ اجرای تازه آغاز می‌شود.');
            }
        } catch (error) {
            message(error.message || 'عملیات انجام نشد؛ صفحهٔ آزمایشگاه را دوباره باز کن.', true);
        } finally {
            busy = false;
            refresh();
        }
    }

    for (const control of controls) {
        control.addEventListener('click', () => perform(control.dataset.workbenchAction));
    }
    window.addEventListener('message', event => {
        if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
        if (event.data?.type === 'danna-code-boot') {
            frame.contentWindow.postMessage({ type: 'danna-code-files', files: pendingProject }, location.origin);
            pendingProject = null;
        } else if (event.data?.type === 'danna-code-run' && !busy && !restarting) {
            perform('run');
        } else if (event.data?.type === 'danna-code-error') {
            restarting = false;
            message(event.data.message, true);
            refresh();
        }
    });
    frame.addEventListener('load', () => {
        observer?.disconnect();
        initialized = false;
        restarting = false;
        observer = new MutationObserver(refresh);
        observer.observe(frame.contentDocument, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled'] });
        refresh();
    });
})();
