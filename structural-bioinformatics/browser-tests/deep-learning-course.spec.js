import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';

const route = '/deep-learning/';
const key = 'koolfox.deep-learning.spring2026.v1';
const inventory = JSON.parse(readFileSync(new URL('../../deep-learning/assets/data/curriculum.json', import.meta.url), 'utf8'));
const ids = inventory.lessons.filter(lesson => lesson.kind === 'lecture_slides').map(lesson => lesson.id);
async function ready(page, hash = '') {
    await page.goto(`${route}${hash}`);
    await expect(page.locator('#lesson-content')).toBeVisible();
    await expect(page.locator('#lesson-nav .lesson-link')).toHaveCount(ids.length);
}
async function select(page, id) {
    if (await page.locator('#lesson-select').isVisible()) await page.selectOption('#lesson-select', id);
    else await page.locator(`.lesson-link[data-lesson="${id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
}

test('all Spring 2026 lectures display exact executed code, output, and downloadable Python', async ({ page, request }) => {
    test.setTimeout(120000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const examples = await (await request.get(`${route}assets/data/lessons.json`)).json();
    const curriculum = await (await request.get(`${route}assets/data/curriculum.json`)).json();
    expect(curriculum.term).toBe('Spring 2026');
    expect(curriculum.lessons.filter(lesson => lesson.kind === 'lecture_slides').map(lesson => lesson.number)).toEqual([...Array.from({ length: 17 }, (_, index) => index + 1), 20, 21, 23, 28]);
    expect(curriculum.lessons.filter(lesson => lesson.kind === 'lecture_slides').map(lesson => lesson.id)).toEqual(ids);
    expect(curriculum.additional_sessions).toHaveLength(7);
    expect(examples.lessons.map(lesson => lesson.id)).toEqual(ids);
    expect(examples.lessons.flatMap(lesson => lesson.source_exercises || [])).toEqual([]);
    await ready(page);
    for (const lesson of examples.lessons) {
        await select(page, lesson.id);
        expect(await page.locator('#lesson-code').textContent()).toBe(lesson.code.trimEnd());
        expect(await page.locator('#lesson-output').textContent()).toBe(lesson.output.trimEnd());
        await expect(page.locator('#lesson-code')).toHaveAttribute('dir', 'ltr');
        await expect(page.locator('#lesson-command')).toHaveText(`python3 ${lesson.filename}`);
        await expect(page.locator('#complete-lesson')).not.toBeChecked();
        await expect(page.locator('#lesson-explanation')).not.toBeEmpty();
        await expect(page.locator('#lesson-practice')).not.toBeEmpty();
        await expect(page.locator('#lesson-limit')).not.toBeEmpty();
        const sourceExercises = lesson.source_exercises || [];
        await expect(page.locator('#source-exercise-items article')).toHaveCount(sourceExercises.length);
        if (sourceExercises.length) {
            await expect(page.locator('#source-exercises')).toBeVisible();
            for (let index = 0; index < sourceExercises.length; index += 1) {
                const item = page.locator('#source-exercise-items article').nth(index);
                await expect(item).toContainText(sourceExercises[index].prompt);
                await expect(item).toContainText(sourceExercises[index].file);
                await expect(item).toContainText(String(sourceExercises[index].page));
            }
        } else await expect(page.locator('#source-exercises')).toBeHidden();

        expect(lesson.source_path).toMatch(/^python\/spring2026\/lesson_\d{2}\.py$/);
        const source = await request.get(`${route}${lesson.source_path}`);
        expect(source.ok()).toBe(true);
        expect(await source.text()).toBe(lesson.code);
        const pending = page.waitForEvent('download');
        await page.locator('#download-code').click();
        const download = await pending;
        expect(download.suggestedFilename()).toBe(lesson.filename);
        expect(await readFile(await download.path(), 'utf8')).toBe(lesson.code);
        const entry = curriculum.lessons.find(item => item.id === lesson.id);
        await expect(page.locator('#lesson-sources a').first()).toHaveAttribute('href', entry.source_url);
        await expect(page.locator('#learning-meter')).toHaveAttribute('value', '0');
    }
    expect(errors).toEqual([]);
});

test('reading-first landing, sequential boundaries, deep links, history, and keyboard navigation', async ({ page }) => {
    await ready(page);
    await expect(page).toHaveURL(/#spring2026-01$/);
    await expect(page.locator('#gate')).toHaveCount(0);
    await page.locator('.source-details summary').click();
    await expect(page.locator('#extra-sessions a')).toHaveCount(7);
    await expect(page.locator('#extra-sessions input')).toHaveCount(0);
    await expect(page.locator('a[href="lab.html"]')).toBeVisible();
    await expect(page.locator('#previous-lesson')).toBeDisabled();
    await page.locator('#next-lesson').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#spring2026-02$/);
    await expect(page.locator('#lesson')).toBeFocused();
    await page.click('#next-lesson');
    await page.goBack();
    await expect(page.locator('#lesson-select')).toHaveValue('spring2026-02');
    await page.goForward();
    await expect(page.locator('#lesson-select')).toHaveValue('spring2026-03');
    await ready(page, '#spring2026-28');
    await expect(page.locator('#next-lesson')).toBeDisabled();
    await expect(page.locator('#previous-lesson')).toBeEnabled();
    await page.click('#previous-lesson');
    await expect(page).toHaveURL(/#spring2026-23$/);
    await ready(page, '#not-a-lesson');
    await expect(page).toHaveURL(/#spring2026-01$/);
});

test('progress is explicit, persisted, exportable and isolated from old laboratory progress', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('koolfox.deep-learning.lessons.v1', JSON.stringify({ version: 1, completed: ['lesson-01'] })));
    await ready(page);
    await expect(page.locator('#learning-meter')).toHaveAttribute('value', '0');
    await page.evaluate(() => localStorage.setItem('koolfox.deep-learning.progress.v1', 'unchanged-lab'));
    await page.locator('#complete-lesson').check();
    await page.click('#next-lesson');
    await expect(page.locator('#complete-lesson')).not.toBeChecked();
    await page.reload();
    await expect(page.locator('#learning-meter')).toHaveAttribute('value', '1');
    await page.click('#previous-lesson');
    await expect(page.locator('#complete-lesson')).toBeChecked();
    await page.locator('.progress-tools summary').click();
    const pending = page.waitForEvent('download');
    await page.click('#export-learning');
    const path = await (await pending).path();
    page.on('dialog', dialog => dialog.accept());
    await page.click('#reset-learning');
    await expect(page.locator('#complete-lesson')).not.toBeChecked();
    await page.locator('#import-learning').setInputFiles(path);
    await expect(page.locator('#complete-lesson')).toBeChecked();
    await page.locator('#import-learning').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1,"completed":["spring2026-99"]}') });
    await expect(page.locator('#learning-status')).toContainText('معتبر نیست');
    await expect(page.locator('#complete-lesson')).toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('koolfox.deep-learning.progress.v1'))).toBe('unchanged-lab');
});

for (const mode of ['corrupt', 'blocked']) {
    test(`${mode} learning storage leaves content and navigation usable`, async ({ page }) => {
        await page.addInitScript(({ mode, key }) => {
            if (mode === 'corrupt') localStorage.setItem(key, '{broken');
            else {
                Storage.prototype.getItem = () => { throw new Error('Storage unavailable'); };
                Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
            }
        }, { mode, key });
        await ready(page);
        await page.locator('#complete-lesson').check();
        await expect(page.locator('#learning-meter')).toHaveAttribute('value', '1');
        await page.click('#next-lesson');
        await expect(page.locator('#lesson-code')).not.toBeEmpty();
        await expect(page.locator('#complete-lesson')).not.toBeChecked();
    });
}

for (const filename of ['lessons.json', 'curriculum.json']) {
    test(`missing ${filename} explains failure and retains official and laboratory links`, async ({ page }) => {
        await page.route(`**/assets/data/${filename}`, route => route.abort());
        await page.goto(route);
        await expect(page.locator('#lesson-error')).toBeVisible();
        await expect(page.locator('#lesson-content')).toBeHidden();
        for (const id of ['export-learning', 'import-learning', 'reset-learning']) {
            await expect(page.locator(`#${id}`)).toBeDisabled();
        }
        await expect(page.locator('a[href="lab.html"]')).toBeVisible();
        await expect(page.locator('.source-line a')).toHaveAttribute('href', /dannagurari\.colorado\.edu\/course\/neural-networks-and-deep-learning-spring-2026\//);
    });
}

for (const width of [390, 320]) {
    test(`all lessons remain readable and controls fit ${width}px without RTL overflow`, async ({ page, request }) => {
        test.setTimeout(90000);
        await page.setViewportSize({ width, height: 844 });
        await ready(page);
        for (const id of ids) {
            await select(page, id);
            expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
            for (const selector of ['#lesson-select', '#copy-code', '#download-code', '#previous-lesson', '#next-lesson', '.python-code', '.python-output']) {
                const box = await page.locator(selector).boundingBox();
                expect(box.x, `${id}: ${selector} left edge`).toBeGreaterThanOrEqual(-1);
                expect(box.x + box.width, `${id}: ${selector} right edge`).toBeLessThanOrEqual(width + 1);
            }
        }
        const examples = await (await request.get(`${route}assets/data/lessons.json`)).json();
        const visualLesson = examples.lessons.find(lesson => lesson.visual);
        expect(visualLesson).toBeTruthy();
        await select(page, visualLesson.id);
        await expect(page.locator('#lesson-visual')).toBeVisible();
        const visualBox = await page.locator('#lesson-visual').boundingBox();
        expect(visualBox.x).toBeGreaterThanOrEqual(-1);
        expect(visualBox.x + visualBox.width).toBeLessThanOrEqual(width + 1);
        await page.screenshot({ path: test.info().outputPath(`learning-visual-mobile-${width}.png`), fullPage: true });
        await select(page, 'spring2026-01');
        await page.screenshot({ path: test.info().outputPath(`learning-mobile-${width}.png`), fullPage: true });
    });
}

test('desktop lesson presents code and genuine recorded output, not an invented completion dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await ready(page);
    await expect(page.locator('#lesson-code')).toBeVisible();
    await expect(page.locator('#lesson-output')).toBeVisible();
    await expect(page.locator('#learning-meter')).toHaveAttribute('value', '0');
    await expect(page.locator('#execution-note')).toContainText('اجرای واقعی');
    await page.screenshot({ path: test.info().outputPath('learning-desktop.png'), fullPage: true });
});


test('unexecuted lesson records are rejected instead of presenting invented output', async ({ page }) => {
    await page.route('**/assets/data/lessons.json', async route => {
        const response = await route.fetch();
        const data = await response.json();
        data.lessons[0].verified = false;
        await route.fulfill({ response, json: data });
    });
    await page.goto(route);
    await expect(page.locator('#lesson-error')).toBeVisible();
    await expect(page.locator('#lesson-content')).toBeHidden();
});

test('clipboard failure offers a usable download instead of claiming success', async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Clipboard blocked'); } } });
    });
    await ready(page);
    await page.click('#copy-code');
    await expect(page.locator('#learning-status')).toContainText('کپی خودکار در دسترس نیست');
    await expect(page.locator('.python-code')).toBeFocused();
    await expect(page.locator('#download-code')).toBeVisible();
});

test('each optional visual explains actual numbers and cites the exact code that produced them', async ({ page, request }) => {
    const examples = await (await request.get(`${route}assets/data/lessons.json`)).json();
    const visualLessons = examples.lessons.filter(lesson => lesson.visual);
    expect(visualLessons.map(lesson => lesson.number)).toEqual([3, 5, 7, 8, 10, 12, 15, 17, 20, 21]);
    expect(visualLessons.every(lesson => ids.includes(lesson.id))).toBe(true);
    await ready(page);
    for (const lesson of visualLessons) {
        await select(page, lesson.id);
        await expect(page.locator('#lesson-visual')).toBeVisible();
        await expect(page.locator('.visual-caption')).toHaveText(lesson.visual.caption);
        await expect(page.locator('.visual-limitations')).toHaveText(lesson.visual.limitations);
        expect(await page.locator('.visual-code-reference').textContent()).toBe(lesson.visual.code_reference);
        expect(lesson.code).toContain(lesson.visual.code_reference);
        if (lesson.visual.type === 'matrix') {
            await expect(page.locator('#lesson-visual table').first()).toBeVisible();
        } else if (lesson.visual.type === 'spectrum') {
            await expect(page.locator('#lesson-visual svg')).toBeVisible();
            await page.locator('#lesson-visual summary').click();
            await expect(page.locator('#lesson-visual table')).toBeVisible();
        } else {
            for (const series of lesson.visual.data.series) {
                await expect(page.locator('#lesson-visual')).toContainText(series.label);
            }
        }
    }
    await page.screenshot({ path: test.info().outputPath('learning-final-visual.png'), fullPage: true });
    await select(page, 'spring2026-01');
    await expect(page.locator('#lesson-visual')).toBeHidden();
    await expect(page.locator('.visual-caption')).toHaveCount(0);
});
