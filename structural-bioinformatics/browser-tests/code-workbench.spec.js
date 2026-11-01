import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

function readState(page, lab) {
    return page.evaluate(lab => {
        const runtime = document.querySelector('[data-code-runtime]')?.contentDocument;
        const view = runtime?.querySelector('.shinylive-viewer iframe')?.contentWindow;
        return lab === 'neuron-xor' ? view?.dannaLab?.state
            : lab === 'network-playground' ? view?.dannaNetwork?.state
            : view?.dannaConvolution;
    }, lab);
}

async function ready(page, lab) {
    await page.goto(`/deep-learning/playgrounds/${lab}/code/`);
    await expect(page.getByRole('button', { name: 'اجرای کد', exact: true })).toBeEnabled({ timeout: 90000 });
    await expect.poll(() => readState(page, lab), { timeout: 90000 }).toBeTruthy();
    const runtime = page.frameLocator('[data-code-runtime]');
    await expect(runtime.locator('.editor-files button.selected .editor-filename')).toHaveText('experiment.py');
    const response = await page.request.get(`/deep-learning/runtime/${lab}/app.json`);
    const files = await response.json();
    return {
        runtime,
        viewer: runtime.frameLocator('.shinylive-viewer iframe'),
        code: files.find(file => file.name === 'experiment.py').content,
    };
}

async function edit(page, runtime, code) {
    const editor = runtime.locator('.cm-content[contenteditable=true]');
    await editor.click();
    await editor.press('ControlOrMeta+A');
    await page.keyboard.insertText(code);
}

async function downloadedExperiment(page) {
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'دریافت پروژه با ویرایش‌ها', exact: true }).click();
    const download = await pending;
    const path = await download.path();
    expect(await download.failure()).toBeNull();
    return execFileSync('python3', ['-c',
        'import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);name=next(n for n in z.namelist() if n.endswith("experiment.py"));print(z.read(name).decode())', path],
        { encoding: 'utf8' });
}

for (const lab of ['neuron-xor', 'network-playground', 'convolution']) {
    test(`${lab} opens editable experiment code beside its actual result`, async ({ page }) => {
        test.setTimeout(150000);
        const { runtime, viewer } = await ready(page, lab);
        await expect(viewer.locator('[data-code-controls]')).not.toHaveAttribute('open');
        await expect(page.getByRole('button', { name: 'دریافت پروژه با ویرایش‌ها', exact: true })).toBeEnabled();
        const selected = runtime.locator('.editor-files button.selected');
        await expect(selected).toContainText('experiment.py');
        expect(await readState(page, lab)).toBeTruthy();
    });
}

test('precise code parameters, GUI capture and edited-project download share one real experiment', async ({ page }) => {
    test.setTimeout(150000);
    const { runtime, viewer, code } = await ready(page, 'network-playground');
    const changed = code.replace('"learning_rate": 0.03', '"learning_rate": 0.01234567')
        .replace('"hidden": [4, 4]', '"hidden": [3]')
        .replace('"max_epochs": 1000', '"max_epochs": 5')
        + '\n# preserved custom function note\n';
    expect(changed).not.toBe(code);
    await edit(page, runtime, changed);
    await page.getByRole('button', { name: 'اجرای کد', exact: true }).click();
    await expect.poll(async () => (await readState(page, 'network-playground'))?.config.learning_rate).toBe(0.01234567);
    expect((await readState(page, 'network-playground')).config.hidden).toEqual([3]);
    await viewer.getByRole('button', { name: 'شروع / ادامه', exact: true }).click();
    await expect.poll(async () => (await readState(page, 'network-playground'))?.epoch).toBe(5);
    const before = await readState(page, 'network-playground');
    expect(Number.isFinite(before.train.loss)).toBeTruthy();
    await viewer.locator('[data-code-controls] > summary').click();
    await viewer.getByText('تنظیمات داده و روش یادگیری', { exact: true }).click();
    await viewer.locator('#learning_rate').fill('0.02345678');
    await viewer.locator('#learning_rate').press('Tab');
    await expect.poll(async () => (await readState(page, 'network-playground'))?.config.learning_rate).toBe(0.02345678);
    await page.getByRole('button', { name: 'تنظیمات فعلی به کد', exact: true }).click();
    await expect(page.locator('[data-workbench-status]')).toContainText('در CONFIG ثبت شد');
    await expect.poll(async () => (await readState(page, 'network-playground'))?.epoch).toBe(0);
    const saved = await downloadedExperiment(page);
    expect(saved).toContain('"learning_rate": 0.02345678');
    expect(saved).toContain('"hidden": [3]');
    expect(saved).toContain('# preserved custom function note');
    expect(saved).toContain('def train_epochs');
});

test('editing the convolution function changes the actual image and every computed product', async ({ page }) => {
    test.setTimeout(150000);
    const { runtime, code } = await ready(page, 'convolution');
    const initial = await readState(page, 'convolution');
    const changed = code.replace('image = pattern(config["pattern"])',
        'image = pattern(config["pattern"])\n    image = [[2 * value for value in row] for row in image]');
    expect(changed).not.toBe(code);
    await edit(page, runtime, changed);
    await page.getByRole('button', { name: 'اجرای کد', exact: true }).click();
    await expect.poll(async () => (await readState(page, 'convolution'))?.image.flat().some(value => value === 2)).toBeTruthy();
    const actual = await readState(page, 'convolution');
    expect(actual.image).toEqual(initial.image.map(row => row.map(value => value * 2)));
    expect(actual.raw.output).toEqual(initial.raw.output.map(row => row.map(value => value * 2)));
    expect(await downloadedExperiment(page)).toContain('2 * value');
});

test('a real Python syntax error is visible and resetting restores the runnable source', async ({ page }) => {
    test.setTimeout(150000);
    const { runtime, code } = await ready(page, 'neuron-xor');
    await edit(page, runtime, code + '\nthis is not valid python !!!\n');
    await page.getByRole('button', { name: 'اجرای کد', exact: true }).click();
    await expect(runtime.locator('.xterm-rows')).toContainText('SyntaxError', { timeout: 20000 });
    await page.getByRole('button', { name: 'بازنشانی کد اولیه', exact: true }).click();
    await expect.poll(async () => (await readState(page, 'neuron-xor'))?.config.max_epochs, { timeout: 30000 }).toBe(6000);
    const saved = await downloadedExperiment(page);
    expect(saved.trim()).toBe(code.trim());
});

test('phone code and result panes stack without horizontal page overflow', async ({ page }) => {
    test.setTimeout(150000);
    await page.setViewportSize({ width: 390, height: 844 });
    const { runtime } = await ready(page, 'network-playground');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    expect(await runtime.locator('html').evaluate(node => node.scrollWidth <= innerWidth)).toBeTruthy();
    const editor = await runtime.locator('.shinylive-editor').boundingBox();
    const viewer = await runtime.locator('.shinylive-viewer').boundingBox();
    expect(viewer.y).toBeGreaterThan(editor.y + editor.height - 2);
});
