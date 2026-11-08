import { test, expect } from '@playwright/test';

// This experiment does not alter the production layout or its readability guard.
test('measure obstacle-bounded left expansion on representative slides', async ({ page }) => {
  test.setTimeout(180000);
  const samples = [['s02', 11], ['s03', 15], ['s04', 36], ['s05', 40], ['s09', 1]];
  let candidateCount = 0;
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [session, number] of samples) {
      await page.goto(`/deep-learning/terms/spring-2026/${session}/slides/#page=${number}`);
      await page.waitForFunction(n => window.sourceSlideReader?.ready && window.sourceSlideReader.page === n, number);
      const result = await page.evaluate(async () => {
        const config = JSON.parse(document.querySelector('#source-reader-config').textContent);
        const record = (await (await fetch(config.translationUrl)).json()).pages[window.sourceSlideReader.page - 1];
        const { sourceLayoutPlan, createSourceLayout, fitSourceLayout } = await import('/deep-learning/assets/slide-content.js');
        const plan = sourceLayoutPlan(record, config);
        if (plan.reason) return { reason: plan.reason, candidates: 0, collisions: 0 };
        const intersects = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
        const proposed = structuredClone(plan);
        let candidates = 0, collisions = 0;
        for (const region of proposed.regions) {
          const [left, top, right, bottom] = region.slot;
          const owned = new Set(region.block.source_lines);
          const obstacles = [...record.source_layout.images, ...(record.source_layout.graphics || []),
            ...record.source_layout.lines.filter(line => !owned.has(line.index)),
            ...proposed.regions.filter(other => other !== region).map(other => ({ rect: other.slot }))].map(x => x.rect);
          if (obstacles.some(rect => intersects(region.slot, rect))) continue;
          const newLeft = Math.max(.03, left - (right - left) * .5,
            ...obstacles.filter(rect => rect[1] < bottom && rect[3] > top && rect[2] <= left).map(rect => rect[2] + .004));
          const slot = [newLeft, top, right, bottom];
          if (newLeft >= left) continue;
          if (obstacles.some(rect => intersects(slot, rect))) { collisions++; continue; }
          region.slot = slot;
          candidates++;
        }
        const host = document.createElement('div');
        Object.assign(host.style, { position: 'fixed', left: '-10000px', top: '0', visibility: 'hidden' });
        document.body.append(host);
        const available = Math.max(280, document.querySelector('.reader-translation').clientWidth - 32);
        async function measure(value) {
          const slide = createSourceLayout(record, value);
          const scale = available / slide.width;
          slide.holder.style.width = `${available}px`;
          slide.holder.style.height = `${slide.height * scale}px`;
          slide.stage.style.transform = `scale(${scale})`;
          host.replaceChildren(slide.holder);
          await document.fonts.ready;
          return fitSourceLayout(slide.stage);
        }
        const baselineFits = await measure(plan);
        const candidateFits = await measure(proposed);
        host.remove();
        return { candidates, collisions, baselineFits, candidateFits };
      });
      console.log(JSON.stringify({ session, number, width, ...result }));
      expect(result.reason).toBeUndefined();
      expect(result.collisions).toBe(0);
      candidateCount += result.candidates;
    }
  }
  expect(candidateCount).toBeGreaterThan(0);
});
