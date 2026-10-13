import { expect, test } from "@playwright/test";

const route = "/structural-bioinformatics/";

async function ready(page) {
    await page.goto(route);
    await expect(page.locator("html")).toHaveAttribute("data-research-state", "ready");
    await expect(page.locator("#molecular-stage")).toHaveAttribute("data-state", "ready");
}

test("experimental structures render with actual occupied points and working controls", async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await ready(page);
    const counts = { "3WD5": 573, "1TNF": 456, "1B09": 1030, "4FM9": 756 };
    for (const [id, count] of Object.entries(counts)) {
        await page.selectOption("#structure-select", id);
        await expect(page.locator("#molecular-stage")).toHaveAttribute("data-structure-id", id);
        const state = await page.evaluate(() => window.molecularViewer.getState());
        expect(state.pointCount).toBe(count);
        expect(state.coordinateUnits).toBe("angstrom");
    }
    await page.selectOption("#structure-select", "3WD5");
    await page.locator('[data-chain="H"][type="checkbox"]').uncheck();
    expect((await page.evaluate(() => window.molecularViewer.getState())).visiblePointCount).toBe(363);
    await page.locator('[data-chain="H"][type="checkbox"]').check();
    const before = await page.evaluate(() => window.molecularViewer.camera.position.toArray());
    await page.locator("#spin-button").click();
    await expect(page.locator("#spin-button")).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => page.evaluate(() => window.molecularViewer.camera.position.toArray())).not.toEqual(before);
    await page.locator("#spin-button").click();
    await expect(page.locator("#spin-button")).toHaveAttribute("aria-pressed", "false");
    await page.selectOption("#residue-select", { index: 1 });
    await expect(page.locator("#residue-readout")).toContainText("Å");
    expect(errors).toEqual([]);
});

test("curated evidence and dataset search keep available measurements distinct", async ({ page }) => {
    await ready(page);
    await expect(page.locator("#stat-residue-pairs")).toHaveText("۴۰");
    await expect(page.locator("#stat-atom-contacts")).toHaveText("۲۵۲");
    await expect(page.locator("#stat-interface-residues")).toHaveText("۱۷");
    await page.locator("#dataset-search").fill("GSE138746");
    await expect(page.locator("#datasets-body tr")).toHaveCount(1);
    await expect(page.locator("#datasets-body")).toContainText("GSE138746");
    await page.locator("#dataset-search").fill("nonexistent-accession-for-check");
    await expect(page.locator("#dataset-status")).toContainText("۰");
    await page.locator("#clear-filters").click();
    await expect(page.locator("#datasets-body tr")).toHaveCount(24);
    await expect(page.locator('a[href*="10.2147/JIR.S497734"]')).toBeVisible();
    await expect(page.locator('a[href*="10.1038/s41590-025-02386-2"]')).toBeVisible();
});

for (const width of [390, 1440]) {
    test(`Persian direction, font and narrow layout at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await ready(page);
        await page.evaluate(() => document.fonts.ready);
        const actual = await page.evaluate(() => ({
            lang: document.documentElement.lang,
            direction: getComputedStyle(document.body).direction,
            font: getComputedStyle(document.body).fontFamily,
            fontLoaded: document.fonts.check("16px arad"),
            overflow: document.documentElement.scrollWidth > window.innerWidth,
            latinDirection: getComputedStyle(document.querySelector("#model-source bdi")).direction,
        }));
        expect(actual.lang).toBe("fa");
        expect(actual.direction).toBe("rtl");
        expect(actual.font.toLowerCase()).toContain("arad");
        expect(actual.fontLoaded).toBe(true);
        expect(actual.overflow).toBe(false);
        expect(actual.latinDirection).toBe("ltr");
        await expect(page.locator("canvas.molecular-canvas")).toBeVisible();
    });
}

test("reduced motion starts still and WebGL failure retains the evidence", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await ready(page);
    expect((await page.evaluate(() => window.molecularViewer.getState())).spinning).toBe(false);
    await page.close();
    const fallback = await context.newPage();
    await fallback.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...options) {
            return type.startsWith("webgl") ? null : original.call(this, type, ...options);
        };
    });
    await fallback.goto(route);
    await expect(fallback.locator("#molecular-stage")).toHaveAttribute("data-state", "error");
    await expect(fallback.locator("#model-fallback")).toBeVisible();
    await expect(fallback.locator("#structure-select")).toBeDisabled();
    await expect(fallback.locator("#datasets-table")).toHaveAttribute("data-state", "ready");
    await expect(fallback.locator("#stat-atom-contacts")).toHaveText("۲۵۲");
    await context.close();
});
