import { renderLessonVisual } from './visuals.js';

// Reading and navigation only. Python examples are executed during export, not here.
const byId = (id) => document.getElementById(id);
const storageKey = 'koolfox.deep-learning.spring2026.v1';
let lessons = [];
let inventory = null;
let execution = {};
let selectedIndex = 0;
let progress = { version: 1, completed: [] };

function status(message) {
    byId('learning-status').textContent = message;
}

function safeSource(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' && ['dannagurari.colorado.edu', 'home.cs.colorado.edu', 'home4.cs.colorado.edu'].includes(parsed.hostname)
            ? parsed.href : null;
    } catch {
        return null;
    }
}

function validateProgress(value) {
    const validIds = new Set(lessons.map((lesson) => lesson.id));
    if (!value || value.version !== 1 || !Array.isArray(value.completed)
        || value.completed.length > validIds.size
        || value.completed.some((id) => typeof id !== 'string' || !validIds.has(id))) {
        throw new Error('Invalid progress backup');
    }
    return { version: 1, completed: [...new Set(value.completed)] };
}

function readProgress() {
    try {
        const saved = localStorage.getItem(storageKey);
        if (saved) progress = validateProgress(JSON.parse(saved));
    } catch {
        status('پیشرفت ذخیره‌شده خوانده نشد. می‌توانی یک فایل پشتیبان معتبر بازیابی کنی؛ فایل قبلی بازنویسی نشده است.');
    }
}

function writeProgress() {
    try {
        localStorage.setItem(storageKey, JSON.stringify(progress));
        status('پیشرفت در همین مرورگر ذخیره شد.');
    } catch {
        status('ذخیره در مرورگر در دسترس نیست؛ برای نگه داشتن پیشرفت، نسخه پشتیبان دریافت کن.');
    }
    renderProgress();
}

function renderProgress() {
    const count = progress.completed.length;
    byId('learning-progress').textContent = `${count.toLocaleString('fa-IR')} از ${lessons.length.toLocaleString('fa-IR')} درس را بررسی کرده‌ام`;
    byId('learning-meter').max = lessons.length;
    byId('learning-meter').value = count;
    byId('complete-lesson').checked = progress.completed.includes(lessons[selectedIndex].id);
    document.querySelectorAll('.lesson-link').forEach((button) => {
        const completed = progress.completed.includes(button.dataset.lesson);
        button.querySelector('.completion-mark').textContent = completed ? 'خوانده شد' : '';
    });
}

function makeNavigation() {
    const nav = byId('lesson-nav');
    const select = byId('lesson-select');
    nav.replaceChildren();
    select.replaceChildren();
    lessons.forEach((lesson, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'lesson-link';
        button.dataset.lesson = lesson.id;
        const number = document.createElement('span');
        number.className = 'lesson-number';
        number.textContent = lesson.number.toLocaleString('fa-IR');
        const title = document.createElement('span');
        title.textContent = lesson.title_fa;
        const mark = document.createElement('span');
        mark.className = 'completion-mark';
        button.append(number, title, mark);
        button.addEventListener('click', () => showLesson(index, true));
        nav.append(button);
        select.add(new Option(`${lesson.number}. ${lesson.title_fa}`, lesson.id));
    });
    select.disabled = false;
    byId('lesson-count').textContent = `${lessons.length.toLocaleString('fa-IR')} موضوع`;
}

function renderParagraphs(target, value) {
    target.replaceChildren();
    const paragraphs = Array.isArray(value) ? value : [value];
    for (const text of paragraphs) {
        if (!text) continue;
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        target.append(paragraph);
    }
}

function renderSources(lesson) {
    const container = byId('lesson-sources');
    container.replaceChildren();
    const scheduleLink = document.createElement('a');
    scheduleLink.href = safeSource(lesson.source_url) || inventory.source_url;
    scheduleLink.target = '_blank';
    scheduleLink.rel = 'noopener noreferrer';
    scheduleLink.textContent = 'موضوع این درس در برنامه رسمی دوره';
    container.append(scheduleLink);
    if (safeSource(lesson.slide_url)) {
        const slides = document.createElement('a');
        slides.href = safeSource(lesson.slide_url);
        slides.target = '_blank';
        slides.rel = 'noopener noreferrer';
        slides.textContent = 'اسلاید رسمی این موضوع';
        container.append(slides);
    }
    const original = document.createElement('p');
    original.className = 'small';
    const title = document.createElement('bdi');
    title.dir = 'ltr';
    title.textContent = lesson.title;
    original.append('عنوان در مرجع: ', title);
    container.append(original);
}

function renderSourceExercises(exercises) {
    const items = byId('source-exercise-items');
    items.replaceChildren();
    const verifiedItems = Array.isArray(exercises) ? exercises : [];
    byId('source-exercises').hidden = verifiedItems.length === 0;
    for (const exercise of verifiedItems) {
        const article = document.createElement('article');
        const prompt = document.createElement('p');
        prompt.textContent = exercise.prompt;
        const reference = document.createElement('p');
        reference.className = 'small';
        const filename = document.createElement('bdi');
        filename.dir = 'ltr';
        filename.textContent = exercise.file;
        const kinds = { discussion: 'پرسش بحث', exercise: 'تمرین داخل منبع', assignment: 'تکلیف مشخص‌شده در منبع' };
        reference.append(`${kinds[exercise.kind] || exercise.kind} · صفحه ${exercise.page} · `, filename);
        article.append(prompt, reference);
        items.append(article);
    }
}

function showLesson(index, focus = false, updateHistory = true) {
    if (index < 0 || index >= lessons.length) return;
    selectedIndex = index;
    const lesson = lessons[index];
    byId('lesson-position').textContent = `جلسه ${lesson.number.toLocaleString('fa-IR')} در برنامه رسمی · مثال ${(index + 1).toLocaleString('fa-IR')} از ${lessons.length.toLocaleString('fa-IR')}`;
    byId('lesson-title').textContent = lesson.title_fa;
    byId('lesson-goal').textContent = lesson.goal;
    renderParagraphs(byId('lesson-explanation'), lesson.explanation);
    byId('lesson-code').textContent = lesson.code.trimEnd();
    byId('code-filename').textContent = lesson.filename;
    byId('lesson-command').textContent = `python3 ${lesson.filename}`;
    byId('lesson-output').textContent = lesson.output.trimEnd();
    byId('output-explanation').textContent = lesson.output_explanation || '';
    byId('execution-note').textContent = 'این خروجی از اجرای واقعی فایل پایتون ذخیره شده است. برای آزمایش تغییرات، فایل را روی رایانه خودت اجرا کن.';
    if (execution.python && execution.numpy) {
        const versions = document.createElement('bdi');
        versions.dir = 'ltr';
        versions.textContent = `Python ${execution.python} · NumPy ${execution.numpy}`;
        byId('execution-note').append(' نسخه اجرا: ', versions);
    }
    renderLessonVisual(byId('lesson-visual'), lesson.visual || null);
    byId('lesson-visual').hidden = !lesson.visual;
    byId('lesson-practice').textContent = lesson.practice;
    byId('lesson-limit').textContent = (Array.isArray(lesson.limitations) ? lesson.limitations.join(' ') : lesson.limitations) || 'این مثال کوتاه برای فهم یک مفهوم است؛ جای آموزش کامل یا ارزیابی یک مدل واقعی را نمی‌گیرد.';
    byId('download-code').href = lesson.source_path;
    byId('download-code').download = lesson.filename;
    renderSources(lesson);
    renderSourceExercises(lesson.source_exercises);
    byId('previous-lesson').disabled = index === 0;
    byId('next-lesson').disabled = index === lessons.length - 1;
    byId('lesson-select').value = lesson.id;
    document.querySelectorAll('.lesson-link').forEach((button) => {
        if (button.dataset.lesson === lesson.id) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
    });
    if (updateHistory) {
        const method = focus ? 'pushState' : 'replaceState';
        history[method](null, '', `#${lesson.id}`);
    }
    renderProgress();
    if (focus) {
        byId('lesson').focus({ preventScroll: true });
        byId('lesson').scrollIntoView({ block: 'start', behavior: 'auto' });
    }
}

window.addEventListener('popstate', () => {
    const index = lessons.findIndex((lesson) => `#${lesson.id}` === location.hash);
    if (index >= 0) showLesson(index, false, false);
});

byId('lesson-select').addEventListener('change', (event) => {
    showLesson(lessons.findIndex((lesson) => lesson.id === event.target.value), true);
});
byId('previous-lesson').addEventListener('click', () => showLesson(selectedIndex - 1, true));
byId('next-lesson').addEventListener('click', () => showLesson(selectedIndex + 1, true));
byId('complete-lesson').addEventListener('change', (event) => {
    const id = lessons[selectedIndex].id;
    const completed = new Set(progress.completed);
    if (event.target.checked) completed.add(id);
    else completed.delete(id);
    progress.completed = [...completed];
    writeProgress();
});
byId('copy-code').addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(lessons[selectedIndex].code);
        byId('copy-code').textContent = 'کپی شد';
        status('کد همین درس کپی شد.');
        setTimeout(() => { byId('copy-code').textContent = 'کپی کد'; }, 1800);
    } catch {
        status('کپی خودکار در دسترس نیست. متن کد را انتخاب و کپی کن یا فایل پایتون را دریافت کن.');
        byId('lesson-code').parentElement.focus();
    }
});
byId('export-learning').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'deep-learning-spring2026-progress.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
});
byId('import-learning').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
        if (file.size > 30000) throw new Error('Backup is too large');
        const next = validateProgress(JSON.parse(await file.text()));
        if (!window.confirm('پیشرفت فعلی با این فایل جایگزین شود؟')) return;
        progress = next;
        writeProgress();
    } catch {
        status('فایل معتبر نیست. پیشرفت فعلی تغییر نکرد.');
    } finally {
        event.target.value = '';
    }
});
byId('reset-learning').addEventListener('click', () => {
    if (!window.confirm('پیشرفت شخصی این مسیر در همین مرورگر پاک شود؟')) return;
    progress = { version: 1, completed: [] };
    writeProgress();
});

async function fetchJSON(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Cannot load ${path}`);
    return response.json();
}

async function initialize() {
    try {
        const [curriculum, examples] = await Promise.all([
            fetchJSON('assets/data/curriculum.json'),
            fetchJSON('assets/data/lessons.json'),
        ]);
        inventory = curriculum;
        execution = examples.execution || {};
        if (!Array.isArray(curriculum.lessons) || !curriculum.lessons.length
            || !Array.isArray(examples.lessons)) throw new Error('Invalid lesson manifest');
        const byLesson = new Map(examples.lessons.map((lesson) => [lesson.id, lesson]));
        lessons = curriculum.lessons.filter((entry) => entry.kind === 'lecture_slides').map((entry) => {
            const example = byLesson.get(entry.id);
            if (!example) throw new Error(`Missing example: ${entry.id}`);
            if (example.verified !== true) throw new Error(`Example not executed: ${entry.id}`);
            for (const field of ['goal', 'code', 'output', 'practice', 'filename', 'source_path']) {
                if (typeof example[field] !== 'string' || !example[field].trim()) throw new Error(`Invalid ${field}`);
            }
            if (!/^python\/spring2026\/[a-zA-Z0-9_-]+\.py$/.test(example.source_path)) {
                throw new Error('Invalid local example path');
            }
            return { ...entry, ...example, title_fa: example.title_fa || entry.title_fa, title: entry.title, slide_url: entry.slide_url };
        });
        byId('source-status-note').textContent = curriculum.source_note_fa || 'صفحه رسمی بهار ۲۰۲۶ خوانده شده است. دریافت متن فایل‌های PDF هنوز با خطای سرور روبه‌رو است؛ تمرین‌های داخل آن‌ها هنوز تایید نشده‌اند. مثال‌های این دفتر مستقل نوشته شده‌اند.';
        const sessions = byId('extra-sessions');
        sessions.replaceChildren();
        for (const session of (curriculum.additional_sessions || []).slice().sort((a, b) => a.number - b.number)) {
            const paragraph = document.createElement('p');
            const link = document.createElement('a');
            link.href = safeSource(session.source_url) || inventory.source_url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = `جلسه ${session.number.toLocaleString('fa-IR')}: ${session.title_fa}`;
            paragraph.append(link);
            sessions.append(paragraph);
        }
        const sessionNote = document.createElement('p');
        sessionNote.className = 'small';
        sessionNote.textContent = 'این هفت جلسه در برنامه رسمی حضور دارند، اما پیوند اسلاید ندارند؛ برای آن‌ها کد، نتیجه یا تکمیل ساختگی ثبت نمی‌شود. تاریخ‌های مرجع مربوط به همان نیمسال‌اند، نه موعدهای شخصی تو.';
        sessions.append(sessionNote);
        makeNavigation();
        readProgress();
        const hashIndex = lessons.findIndex((lesson) => `#${lesson.id}` === location.hash);
        showLesson(hashIndex < 0 ? 0 : hashIndex);
        for (const id of ['export-learning', 'import-learning', 'reset-learning']) byId(id).disabled = false;
        byId('lesson-content').hidden = false;
        byId('loading-note').hidden = true;
    } catch (error) {
        byId('loading-note').hidden = true;
        byId('lesson-error').hidden = false;
        byId('lesson-error').textContent = 'فایل درس‌ها یا مثال‌های پایتون بارگذاری نشد. صفحه را دوباره بارگذاری کن؛ برای اجرای محلی از وب‌سرور استفاده کن. منابع رسمی و آزمایشگاه گیت‌ها همچنان از پیوندهای صفحه در دسترس‌اند.';
        console.error('Course loading failed', error);
    }
}

initialize();
