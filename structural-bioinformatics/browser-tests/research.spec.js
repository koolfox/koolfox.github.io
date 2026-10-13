import { expect, test } from "@playwright/test";

const route = "/structural-bioinformatics/";

async function ready(page) {
    await page.goto(`${route}#lab`);
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
    await page.locator("#tab-methods").click();
    await page.locator("#future-work > summary").click();
    await page.locator("#dataset-search").fill("GSE138746");
    await expect(page.locator("#datasets-body tr")).toHaveCount(1);
    await expect(page.locator("#datasets-body")).toContainText("GSE138746");
    await page.locator("#dataset-search").fill("nonexistent-accession-for-check");
    await expect(page.locator("#dataset-status")).toContainText("۰");
    await page.locator("#clear-filters").click();
    await expect(page.locator("#datasets-body tr")).toHaveCount(25);
    await page.locator("#tab-literature").click();
    await expect(page.locator('a[href*="10.3389/fimmu.2025.1680199"]')).toBeVisible();
    await expect(page.locator('a[href*="10.3389/fimmu.2025.1668361"]')).toBeVisible();
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
        for (const panel of ["basics", "sequences", "literature", "methods", "reading"]) {
            await page.locator(`#tab-${panel}`).click();
            await expect(page.locator(`#panel-${panel}`)).toBeVisible();
            if (panel === "reading") await expect(page.locator("#reading-status")).toHaveAttribute("data-state", "ready");
            expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
        }
        if (width === 390) {
            for (const tab of await page.locator('[role="tab"]').all()) {
                const box = await tab.boundingBox();
                expect(box.x).toBeGreaterThanOrEqual(0);
                expect(box.x + box.width).toBeLessThanOrEqual(width);
            }
        }
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
    await fallback.goto(`${route}#lab`);
    await expect(fallback.locator("#molecular-stage")).toHaveAttribute("data-state", "error");
    await expect(fallback.locator("#model-fallback")).toBeVisible();
    await expect(fallback.locator("#structure-select")).toBeDisabled();
    await expect(fallback.locator("#datasets-table")).toHaveAttribute("data-state", "ready");
    await expect(fallback.locator("#stat-atom-contacts")).toHaveText("۲۵۲");
    await context.close();
});

test("presentation tabs support keyboard navigation and direct links", async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("#tab-basics")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator('[role="tabpanel"]:visible')).toHaveCount(1);
    await page.locator("#tab-basics").focus();
    await page.keyboard.press("End");
    await expect(page.locator("#tab-reading")).toBeFocused();
    await expect(page.locator("#tab-reading")).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Home");
    await expect(page.locator("#tab-basics")).toBeFocused();
    await expect(page.locator("#tab-basics")).toHaveAttribute("aria-selected", "true");
    await page.locator("#tab-sequences").click();
    await expect(page).toHaveURL(/#sequences$/);
    await page.reload();
    await expect(page.locator("#tab-sequences")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-sequences")).toBeVisible();
    await expect(page.locator("#panel-basics")).toBeHidden();
});

test("verified RNA examples preserve downloaded FASTA and label letter conversion", async ({ page }) => {
    await page.goto(`${route}#sequences`);
    await expect(page.locator("#sequence-status")).toHaveAttribute("data-state", "ready");
    await page.selectOption("#sequence-select", "TNF_NM_000594.4");
    await expect(page.locator("#sequence-accession")).toContainText("NM_000594.4");
    await expect.poll(async () => (await page.locator("#sequence-length").textContent()).replace(/[٬,\s]/g, "")).toContain("۱۶۷۸");
    const original = await (await page.request.get(`${route}data/sequences/TNF_NM_000594.4.fasta`)).text();
    const letters = original.split(/\r?\n/).filter(line => line && !line.startsWith(">")).join("");
    const displayed = await page.locator("#sequence-preview").textContent();
    expect(displayed.replace(/\s/g, "")).toContain(letters.slice(0, 60));
    await page.locator("#rna-display").check();
    const converted = await page.locator("#sequence-preview").textContent();
    expect(converted.replace(/\s/g, "")).toContain(letters.slice(0, 60).replaceAll("T", "U"));
    await expect(page.locator("#sequence-download")).toHaveAttribute("href", /TNF_NM_000594\.4\.fasta$/);
    await page.selectOption("#sequence-select", "3WD5_H_resolved");
    await expect(page.locator("#rna-display")).toBeDisabled();
    await expect(page.locator("#sequence-length")).toContainText("۲۱۴");
    await expect(page.locator("#sequence-accession")).toContainText("3WD5");
    await expect(page.locator("#sequence-status")).toHaveAttribute("data-hash-verified", "true");
});

test("unavailable FASTA leaves other teaching panels usable", async ({ page }) => {
    await page.route("**/data/sequences/*.fasta", request => request.fulfill({ status: 404, body: "Not found" }));
    await page.goto(`${route}#sequences`);
    await expect(page.locator("#sequence-status")).toHaveAttribute("data-state", "error");
    await page.locator("#tab-lab").click();
    await expect(page.locator("#molecular-stage")).toHaveAttribute("data-state", "ready");
    await expect(page.locator("canvas.molecular-canvas")).toBeVisible();
    await expect(page.locator("#stat-atom-contacts")).toHaveText("۲۵۲");
});

test("research Markdown renders chapters, actual LaTeX and Mermaid inside the page", async ({ page }) => {
    const requests = [];
    page.on("request", request => requests.push(request.url()));
    await ready(page);
    expect(requests.some(url => url.includes("mermaid.min.js"))).toBe(false);
    await page.locator("#tab-reading").click();
    await expect(page.locator("#reading-status")).toHaveAttribute("data-state", "ready");
    await page.selectOption("#document-select", "structural-method.fa.md");
    await expect(page.locator("#markdown-content")).toHaveAttribute("data-document", "structural-method.fa.md");
    await page.selectOption("#chapter-select", "all");
    await expect(page.locator("#reading-status")).toHaveAttribute("data-chapter", "all");
    await expect(page.locator("#reading-status")).toHaveAttribute("data-optional-render", "ready");
    await expect(page.locator("#markdown-content .katex-display").first()).toBeVisible();
    await expect(page.locator("#markdown-content .mermaid-diagram svg")).toBeVisible();
    await expect(page.locator("#markdown-content table")).toContainText("445");
    expect(await page.locator("#markdown-content .katex-display").count()).toBeGreaterThanOrEqual(4);
    const mathDirection = await page.locator("#markdown-content .katex").first().evaluate(element => getComputedStyle(element).direction);
    expect(mathDirection).toBe("ltr");
    await expect(page).toHaveURL(/document=structural-method\.fa\.md.*#reading$/);
    await page.reload();
    await expect(page.locator("#document-select")).toHaveValue("structural-method.fa.md");
    await expect(page.locator("#chapter-select")).toHaveValue("all");
    await expect(page.locator("#reading-status")).toHaveAttribute("data-optional-render", "ready");
    await page.locator('#markdown-content a[href$="/sequences-primer.fa.md"]').click();
    await expect(page.locator("#reading-status")).toHaveAttribute("data-document", "sequences-primer.fa.md");
    await expect(page).toHaveURL(/document=sequences-primer\.fa\.md.*#reading$/);
    await page.selectOption("#document-select", "visualization-tools.fa.md");
    await expect(page.locator("#markdown-content")).toHaveAttribute("data-document", "visualization-tools.fa.md");
    await page.selectOption("#chapter-select", "all");
    await page.locator('#markdown-content a[href$="/anatomy-evaluation.fa.md"]').first().click();
    await expect(page.locator("#reading-status")).toHaveAttribute("data-document", "anatomy-evaluation.fa.md");
    await expect(page.locator("#document-select")).toHaveValue("anatomy-evaluation.fa.md");
});

test("optional diagram failure preserves Markdown and its original code", async ({ page }) => {
    await page.route("**/vendor/mermaid/mermaid.min.js", request => request.fulfill({ status: 404, body: "Not found" }));
    await page.goto(`${route}?document=structural-method.fa.md&chapter=all#reading`);
    await expect(page.locator("#reading-status")).toHaveAttribute("data-state", "ready");
    await expect(page.locator("#reading-status")).toHaveAttribute("data-optional-render", "partial");
    await expect(page.locator("#markdown-content code").filter({ hasText: "flowchart TD" })).toBeVisible();
    await page.locator("#tab-lab").click();
    await expect(page.locator("#molecular-stage")).toHaveAttribute("data-state", "ready");
    await expect(page.locator("canvas.molecular-canvas")).toBeVisible();
});
