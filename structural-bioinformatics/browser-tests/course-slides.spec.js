import { test, expect } from '@playwright/test';

const root = '/structural-bioinformatics/';

for (const width of [390, 1280]) {
  test(`assembly choice explains every answer at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height:844});
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(root + 'assets/course-slides.html?topic=12');
    await expect(page.locator('#lesson-deck')).toHaveAttribute('aria-busy', 'false');
    const index = await page.locator('#slide-select option[data-kind=assembly-choice]').getAttribute('value');
    await page.locator('#slide-select').selectOption(index);
    const slide = page.locator('#lesson-slide section:visible');
    const button = slide.getByRole('button', {name:'بررسی انتخاب'});
    await button.click();
    await expect(slide.getByRole('status')).toContainText('ابتدا یک گزینه');
    for (const [choice, expected] of [['asu', 'فقط یک نسخه'], ['assembly', 'به تنهایی عملکرد را ثابت نمی‌کند'], ['neighbors', 'هر همسایه شریک زیستی']]) {
      await page.locator('#assembly-choice').selectOption(choice);
      await expect(slide.getByRole('status')).toBeEmpty();
      await button.click();
      await expect(slide.getByRole('status')).toContainText(expected);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(errors).toEqual([]);
  });
}

test('the crystallography exercise explains each model choice on mobile', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto(root + 'assets/course-slides.html?topic=11');
  await expect(page.locator('#lesson-deck')).toHaveAttribute('aria-busy', 'false');
  const index = await page.locator('#slide-select option[data-kind=structure-interpretation]').getAttribute('value');
  await page.locator('#slide-select').selectOption(index);
  const slide = page.locator('#lesson-slide section:visible');
  await slide.getByRole('button', {name:'بررسی انتخاب'}).click();
  await expect(slide.getByRole('status')).toContainText('ابتدا یک گزینه');
  await page.locator('#structure-choice').selectOption('a');
  await slide.getByRole('button', {name:'بررسی انتخاب'}).click();
  await expect(slide.getByRole('status')).toContainText('مختصات حلقه وجود ندارد');
  await page.locator('#structure-choice').selectOption('b');
  await expect(slide.getByRole('status')).toBeEmpty();
  await slide.getByRole('button', {name:'بررسی انتخاب'}).click();
  await expect(slide.getByRole('status')).toContainText('به‌تنهایی کافی نیست');
  await page.locator('#structure-choice').selectOption('either');
  await slide.getByRole('button', {name:'بررسی انتخاب'}).click();
  await expect(slide.getByRole('status')).toContainText('اطلاعات یکسانی ندارند');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('the course opens a slide view of its own general lesson', async ({page}) => {
  await page.goto(root + 'course.html?topic=1');
  const link = page.locator('#course-slide-link');
  await expect(link).toHaveAttribute('href', 'assets/course-slides.html?topic=1');
  await link.click();
  await expect(page.locator('#lesson-title')).toHaveText('آشنایی با بیوانفورماتیک ساختاری');
  await expect(page.locator('#lesson-slide')).toContainText('چرا دو پروتئین');
  await expect(page.locator('#lesson-select optgroup')).toHaveCount(9);
  await expect(page.locator('#slide-select option').last()).toContainText('آزمایش و کد');
  await page.locator('#next-slide').click();
  await expect(page.locator('#slide-progress')).toContainText('۲');
  await expect(page).toHaveURL(/#slide-2$/);
});

test('the slide reader retains every non-heading lesson block in order', async ({page}) => {
  await page.goto(root + 'assets/course-slides.html?topic=7');
  await expect(page.locator('#lesson-deck')).toHaveAttribute('aria-busy','false');
  const expected = await page.evaluate(async () => {
    const source = await (await fetch('../docs/course/session-07.fa.md')).text();
    const container = document.createElement('div');
    container.innerHTML = window.markdownit({html:false,linkify:false}).render(source.split('\n').slice(1).join('\n'));
    return [...container.children].filter(node=>!/^H[2-6]$/.test(node.tagName)).map(node=>node.textContent.trim());
  });
  const actual = [];
  for (let index = 0; index < expected.length; index++) {
    await page.locator('#slide-select').selectOption(String(index));
    actual.push((await page.locator('#lesson-slide section:visible').evaluate(node=>node.lastElementChild.textContent)).trim());
  }
  expect(actual).toEqual(expected);
  expect(actual.some(text => text.includes('atomselect'))).toBeTruthy();
});

test('self-check notes persist locally and the lesson lab loads only on request', async ({page}) => {
  await page.goto(root + 'assets/course-slides.html?topic=1');
  await expect(page.locator('#lesson-deck')).toHaveAttribute('aria-busy','false');
  const checkIndex = await page.locator('#slide-select option[data-kind=check]').getAttribute('value');
  await page.locator('#slide-select').selectOption(String(checkIndex));
  await page.locator('#own-slide-answer').fill('توالی و ساختار دو نوع داده‌اند');
  await page.locator('summary').click();
  await expect(page.locator('#lesson-slide details')).toContainText('خیر');
  await page.reload();
  await expect(page.locator('#own-slide-answer')).toHaveValue('توالی و ساختار دو نوع داده‌اند');
  const labIndex = await page.locator('#slide-select option[data-kind=lab]').getAttribute('value');
  await page.locator('#slide-select').selectOption(String(labIndex));
  await expect(page.locator('#lesson-slide iframe')).toHaveCount(0);
  await page.route('**/runtime/concepts/**', route => route.fulfill({status:200,contentType:'text/html',body:'<p>lab test</p>'}));
  await page.getByRole('button',{name:'بارگذاری آزمایشگاه در همین اسلاید'}).click();
  await expect(page.locator('#lesson-slide iframe')).toHaveAttribute('src', /experiment=sequence&topic=1/);
  const frame = page.frameLocator('#lesson-slide iframe');
  await expect(frame.locator('p')).toHaveText('lab test');
  await frame.locator('p').evaluate(node => { node.textContent = 'state retained'; });
  await page.locator('#previous-slide').click();
  await page.locator('#next-slide').click();
  await expect(frame.locator('p')).toHaveText('state retained');
});

test('a missing lesson shows a recoverable error without stale content on mobile', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto(root + 'assets/course-slides.html?topic=1');
  await expect(page.locator('#lesson-slide')).toContainText('چرا دو پروتئین');
  await page.route('**/docs/course/session-02.fa.md', route => route.fulfill({status:404,body:'missing'}));
  await page.locator('#lesson-select').selectOption('2');
  await expect(page.locator('#slide-status')).toContainText('نمایش داده نشد');
  await expect(page.locator('#lesson-slide')).toBeEmpty();
  await expect(page.locator('#retry-lesson')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('all course topics render from their existing lesson and docking points to its workshop', async ({page}) => {
  test.setTimeout(90000);
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  for (let topic=1; topic<=30; topic++) {
    await page.goto(root + `assets/course-slides.html?topic=${topic}`);
    await expect(page.locator('#lesson-deck')).toHaveAttribute('aria-busy','false');
    await expect(page.locator('#lesson-slide section:visible')).toBeVisible();
    await expect(page.locator('#slide-select option[data-kind=check]')).toHaveCount(1);
  }
  await page.goto(root + 'assets/course-slides.html?topic=26');
  await expect(page.locator('#lesson-deck')).toHaveAttribute('aria-busy','false');
  const lab = await page.locator('#slide-select option[data-kind=lab]').getAttribute('value');
  await page.locator('#slide-select').selectOption(lab);
  await expect(page.getByRole('link',{name:'بازکردن کارگاه داکینگ'})).toHaveAttribute('href','../docking.html');
  expect(errors).toEqual([]);
});

test('the slide opens the real code workbench and runs its existing energy experiment', async ({page}) => {
  test.setTimeout(120000);
  await page.goto(root + 'assets/course-slides.html?topic=14');
  await expect(page.locator('#lesson-deck')).toHaveAttribute('aria-busy','false');
  const lab = await page.locator('#slide-select option[data-kind=lab]').getAttribute('value');
  await page.locator('#slide-select').selectOption(lab);
  await page.getByRole('button',{name:'بارگذاری آزمایشگاه در همین اسلاید'}).click();
  const frame = page.frameLocator('#lesson-slide iframe').frameLocator('iframe');
  await expect(frame.locator('#code-run')).toBeEnabled({timeout:90000});
  await frame.locator('#code-run').click();
  await expect(frame.locator('#code-comparison table')).toBeVisible({timeout:90000});
});

test('evidence exercise checks answers and restores choices on mobile', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto(root + 'assets/course-slides.html?topic=1');
  await expect(page.locator('#lesson-deck')).toHaveAttribute('aria-busy','false');
  const evidence = await page.locator('#slide-select option[data-kind=evidence]').getAttribute('value');
  await page.locator('#slide-select').selectOption(evidence);
  await page.locator('#evidence-0').selectOption('coordinates');
  await page.locator('#evidence-1').selectOption('coordinates');
  await page.locator('#evidence-2').selectOption('experiment');
  await page.getByRole('button',{name:'بررسی پاسخ‌ها'}).click();
  const feedback = page.locator('.evidence-question p');
  await expect(feedback.nth(0)).toContainText('دوباره بررسی');
  await expect(feedback.nth(1)).toContainText('درست است');
  await expect(feedback.nth(2)).toContainText('تصویر به‌تنهایی کافی نیست');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.reload();
  await expect(page.locator('#evidence-0')).toHaveValue('coordinates');
  await expect(page.locator('#evidence-2')).toHaveValue('experiment');
});

test('evidence exercise remains usable when browser storage is blocked', async ({page}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new Error('blocked'); };
  });
  await page.goto(root + 'assets/course-slides.html?topic=1');
  await expect(page.locator('#lesson-deck')).toHaveAttribute('aria-busy','false');
  const evidence = await page.locator('#slide-select option[data-kind=evidence]').getAttribute('value');
  await page.locator('#slide-select').selectOption(evidence);
  await page.locator('#evidence-0').selectOption('sequence');
  await expect(page.locator('#lesson-slide section:visible [role=status]')).toContainText('ذخیره در مرورگر ممکن نشد');
  await page.getByRole('button',{name:'بررسی پاسخ‌ها'}).click();
  await expect(page.locator('.evidence-question p').first()).toContainText('درست است');
});

test('answer slides retain their parent heading and keyboard navigation moves focus', async ({page}) => {
  await page.goto(root + 'assets/course-slides.html?topic=1');
  await expect(page.locator('#lesson-deck')).toHaveAttribute('aria-busy','false');
  const slides = page.locator('#lesson-slide section[data-kind=lesson]');
  const answer = slides.filter({has: page.locator('h3').filter({hasText:'توضیح پاسخ'})}).first();
  await expect(answer.locator('h2')).toHaveText('خودآزمایی');
  await page.locator('body').click({position:{x:5,y:5}});
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#lesson-slide')).toBeFocused();
});

test('missing laboratory shows a retryable explanation', async ({page}) => {
  await page.goto(root + 'assets/course-slides.html?topic=1');
  await expect(page.locator('#lesson-deck')).toHaveAttribute('aria-busy','false');
  const lab = await page.locator('#slide-select option[data-kind=lab]').getAttribute('value');
  await page.locator('#slide-select').selectOption(lab);
  await page.route('**/runtime/concepts/**', route => route.fulfill({status:404,body:'missing'}));
  const button = page.getByRole('button',{name:'بارگذاری آزمایشگاه در همین اسلاید'});
  await button.click();
  await expect(page.locator('#lesson-slide section:visible [role=status]')).toContainText('در این نشانی در دسترس نیست');
  await expect(button).toBeEnabled();
  await expect(page.locator('#lesson-slide iframe')).toHaveCount(0);
});

test('biomolecule examples remain readable in their general lesson slides', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  for (const [topic, heading, term] of [
    [2, 'خانوادهٔ مونومر دیگر: نوکلئوتید', 'هیدروکسیل'],
    [3, 'مثال آموزشی', 'فرضی'],
  ]) {
    await page.goto(root + `assets/course-slides.html?topic=${topic}`);
    await expect(page.locator('#lesson-deck')).toHaveAttribute('aria-busy','false');
    const option = page.locator('#slide-select option').filter({hasText:heading}).first();
    const index = await option.getAttribute('value');
    await page.locator('#slide-select').selectOption(index);
    await expect(page.locator('#lesson-slide section:visible')).toContainText(term);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
});

test('reverse complement exercise checks arbitrary DNA and saves locally', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto(root + 'assets/course-slides.html?topic=5');
  await expect(page.locator('#lesson-deck')).toHaveAttribute('aria-busy','false');
  const index = await page.locator('#slide-select option[data-kind=reverse-complement]').getAttribute('value');
  await page.locator('#slide-select').selectOption(index);
  await page.locator('#dna-input').fill('CGTAA');
  await page.locator('#dna-answer').fill('GCATT');
  await page.getByRole('button',{name:'بررسی مکمل معکوس'}).click();
  await expect(page.locator('#lesson-slide section:visible [role=status]').first()).toContainText('دوباره');
  await page.locator('#dna-answer').fill('ttacg');
  await page.getByRole('button',{name:'بررسی مکمل معکوس'}).click();
  await expect(page.locator('#lesson-slide section:visible [role=status]').first()).toContainText('5′-TTACG-3′');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.reload();
  await expect(page.locator('#dna-input')).toHaveValue('CGTAA');
  await expect(page.locator('#dna-answer')).toHaveValue('ttacg');
  await page.locator('#dna-input').fill('AUX');
  await page.getByRole('button',{name:'بررسی مکمل معکوس'}).click();
  await expect(page.locator('#lesson-slide section:visible [role=status]').first()).toContainText('فقط با حروف');
});

test('reverse complement remains usable if local storage fails', async ({page}) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
  await page.goto(root + 'assets/course-slides.html?topic=5');
  await expect(page.locator('#lesson-deck')).toHaveAttribute('aria-busy','false');
  const index = await page.locator('#slide-select option[data-kind=reverse-complement]').getAttribute('value');
  await page.locator('#slide-select').selectOption(index);
  await page.locator('#dna-answer').fill('CAGCT');
  await expect(page.locator('#lesson-slide section:visible [role=status]').last()).toContainText('ذخیره ممکن نشد');
  await page.getByRole('button',{name:'بررسی مکمل معکوس'}).click();
  await expect(page.locator('#lesson-slide section:visible [role=status]').first()).toContainText('درست است');
});

test('reverse-complement feedback is cleared after changing either sequence', async ({page}) => {
  await page.goto(root + 'assets/course-slides.html?topic=5');
  await expect(page.locator('#lesson-deck')).toHaveAttribute('aria-busy','false');
  const index = await page.locator('#slide-select option[data-kind=reverse-complement]').getAttribute('value');
  await page.locator('#slide-select').selectOption(index);
  await page.locator('#dna-input').fill('A');
  await page.locator('#dna-answer').fill('T');
  await page.getByRole('button',{name:'بررسی مکمل معکوس'}).click();
  const feedback = page.locator('#lesson-slide section:visible [role=status]').first();
  await expect(feedback).toContainText('درست است');
  await page.locator('#dna-input').fill('C');
  await expect(feedback).toBeEmpty();
  await page.getByRole('button',{name:'بررسی مکمل معکوس'}).click();
  await expect(feedback).toContainText('دوباره');
});
