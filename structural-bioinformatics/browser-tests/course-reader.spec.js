import {test, expect} from '@playwright/test';

const root = '/structural-bioinformatics/';
async function open(page, topic = 8) {
  await page.goto(`${root}course.html?topic=${topic}`);
  await expect(page.locator('body')).toHaveClass(/course-reader-ready/);
}

test('all thirty lessons retain every source word, code example and syllabus topic', async ({page, request}) => {
  test.setTimeout(120000);
  await page.setViewportSize({width:390, height:844});
  const course = await (await request.get(root + 'data/metadata/learning-course.json')).json();
  await open(page, 1);
  await expect(page.locator('#sessions > details')).toHaveCount(9);
  await expect(page.locator('#sessions a[data-topic]')).toHaveCount(30);
  for (const topic of course.sessions) {
    await expect(page.locator('#session-title')).toHaveText(topic.title);
    await expect(page.locator('body')).toHaveClass(/course-reader-ready/);
    const source = await (await request.get(root + topic.path)).text();
    const unchanged = await page.evaluate(source => {
      const expected = document.createElement('div');
      expected.innerHTML = window.markdownit({html:false, linkify:false}).render(source.split('\n').slice(1).join('\n'));
      const actual = document.querySelector('#lesson').cloneNode(true);
      actual.querySelectorAll('[data-reader-ui],#interactive-lab').forEach(node => node.remove());
      const normalize = text => text.replace(/\s+/g, '');
      return normalize(actual.textContent) === normalize(expected.textContent);
    }, source);
    expect(unchanged, topic.title).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), topic.title).toBe(true);
    await expect(page.locator('#lesson-reading-tools')).toHaveCount(1);
    if (topic.session < course.sessions.length) await page.locator('#next').click();
  }
});

test('the example leads to its existing lab and section URLs keep their original targets', async ({page}) => {
  await open(page);
  await expect(page.locator('#lesson-outline [aria-current=location]')).toHaveText('ابتدا «متناظر» را تعریف کنیم');
  const previousHeading = await page.locator('#interactive-lab').evaluate(lab => lab.previousElementSibling.querySelector('h2')?.textContent);
  expect(previousHeading).toBe('مثال آموزشی');
  await page.locator('#lesson-outline a').filter({hasText:'کار عملی'}).click();
  await expect(page).toHaveURL(/#lesson-8-section-4$/);
  await expect(page.locator('#lesson-8-section-4')).toBeInViewport();
  await expect(page.locator('#lesson-outline [aria-current=location]')).toContainText('کار عملی');
  await page.reload();
  await expect(page.locator('#lesson-8-section-4')).toBeInViewport();
});

test('reading preferences and explicit bookmarks survive without changing study or research records', async ({page}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('structural-education-progress-v1')) {
      localStorage.setItem('structural-education-progress-v1', JSON.stringify({'8':'read'}));
      localStorage.setItem('tnf-course-quizzes-v1', '{"sentinel":"keep research notes"}');
    }
  });
  await open(page);
  await page.locator('#reading-size').selectOption('larger');
  await expect(page.locator('#lesson')).toHaveCSS('font-size', '23px');
  await page.locator('#lesson-outline a').filter({hasText:'کار عملی'}).click();
  await open(page, 9);
  await open(page, 8);
  await expect(page.locator('#reading-size')).toHaveValue('larger');
  await page.locator('#reading-resume').click();
  await expect(page).toHaveURL(/#lesson-8-section-4$/);
  await expect(page.locator('#progress')).toHaveValue('read');
  expect(await page.evaluate(() => localStorage.getItem('tnf-course-quizzes-v1'))).toBe('{"sentinel":"keep research notes"}');
});

test('answers reveal on demand, printing preserves them and figures return keyboard focus', async ({page}) => {
  await open(page);
  const answer = page.locator('.lesson-answer').first();
  await expect(answer).not.toHaveAttribute('open');
  await answer.locator('summary').press('Enter');
  await expect(answer).toHaveAttribute('open', '');
  await answer.locator('summary').press('Enter');
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await expect(answer).toHaveAttribute('open', '');
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(answer).not.toHaveAttribute('open');
  const figure = page.locator('.lesson-figure').first();
  const original = await figure.locator('img').getAttribute('src');
  await figure.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').locator('img')).toHaveAttribute('src', original);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(figure).toBeFocused();
});

test('code copying has a usable fallback and blocked storage leaves reading controls working', async ({page}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {get(){throw Error('storage blocked');}});
    Object.defineProperty(navigator, 'clipboard', {value:{writeText:async () => {throw Error('clipboard blocked');}}});
  });
  await open(page);
  await page.locator('#reading-size').selectOption('large');
  await expect(page.locator('#lesson')).toHaveCSS('font-size', '21px');
  await expect(page.locator('#reader-status')).toContainText('اجازهٔ ذخیره');
  const code = page.locator('.reader-code').first();
  const expected = await code.locator('pre').textContent();
  await code.locator('button').click();
  await expect(code.locator('button')).toContainText('کد انتخاب شد');
  expect((await page.evaluate(() => getSelection().toString())).trimEnd()).toBe(expected.trimEnd());
});

test('copy writes only the original code to the clipboard', async ({page, context}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page);
  const code = page.locator('.reader-code').first();
  const expected = await code.locator('pre').textContent();
  await code.locator('button').click();
  await expect(code.locator('button')).toHaveText('کپی شد');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
});

test('a failed next lesson never displays the previous lesson under its new title', async ({page}) => {
  await open(page);
  await page.route('**/docs/course/session-09.fa.md', route => route.abort());
  await page.locator('#next').click();
  await expect(page.locator('#retry')).toBeVisible();
  await expect(page.locator('#lesson')).toBeHidden();
  await expect(page.locator('#progress')).toBeDisabled();
  await page.unroute('**/docs/course/session-09.fa.md');
  await page.locator('#retry').click();
  await expect(page.locator('#lesson')).toBeVisible();
  await expect(page.locator('#session-title')).toContainText('شعاع');
  await expect(page.locator('#progress')).toBeEnabled();
});

for (const width of [1440, 390]) {
  test(`the lesson starts in the first viewport and remains readable at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height:900});
    await open(page);
    await page.screenshot({path:test.info().outputPath(`reading-${width}.png`),fullPage:false});
    const top = await page.locator('#lesson p').first().evaluate(node => node.getBoundingClientRect().top);
    expect(top).toBeLessThan(width === 390 ? 580 : 500);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390) {
      await expect(page.locator('#lesson-map')).not.toHaveAttribute('open');
      await page.locator('#lesson-map>summary').click();
      await expect(page.locator('#lesson-outline a').first()).toBeVisible();
    }
  });
}
