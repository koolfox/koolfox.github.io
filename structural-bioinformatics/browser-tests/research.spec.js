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

test("offline cartoon models preserve the deposited coordinates and model scope", async ({ page, context }) => {
    test.setTimeout(90000);
    const errors = [];
    const externalRequests = [];
    page.on("pageerror", error => errors.push(error.message));
    const base = new URL(test.info().project.use.baseURL).origin;
    await context.route("**/*", route => {
        const url = route.request().url();
        if (url.startsWith(base + "/")) return route.continue();
        externalRequests.push(url);
        return route.abort();
    });
    await ready(page);
    await page.selectOption("#representation-select", "cartoon");
    for (const id of ["3WD5", "1TNF", "1B09", "4FM9"]) {
        await page.selectOption("#structure-select", id);
        await expect(page.locator("#reference-stage")).toHaveAttribute("data-state", "ready", { timeout: 20000 });
        const frame = page.frames().find(frame => frame.url().includes("reference-viewer.html"));
        const model = await frame.evaluate(() => {
            const { state, model } = window.referenceViewer;
            const hierarchy = model.atomicHierarchy;
            const conformation = model.atomicConformation;
            const points = [];
            for (let index = 0; index < conformation.x.length; index++) {
                const atom = hierarchy.atoms.label_atom_id.value(index);
                if (!["CA", "P"].includes(atom) || conformation.occupancy.value(index) <= 0) continue;
                const residue = hierarchy.residueAtomSegments.index[index];
                const chain = hierarchy.chainAtomSegments.index[index];
                points.push({
                    atom,
                    chain: hierarchy.chains.auth_asym_id.value(chain),
                    number: hierarchy.residues.auth_seq_id.value(residue),
                    insertion: hierarchy.residues.pdbx_PDB_ins_code.value(residue),
                    xyz: [conformation.x[index], conformation.y[index], conformation.z[index]],
                });
            }
            return { state, points };
        });
        expect(model.state.structureId).toBe(id);
        expect(model.state.scope).toBe("deposited_model");
        expect(model.state.representationLabel).toBe("Cartoon");
        const traces = await page.evaluate(() => window.molecularViewer.structure.chains);
        expect(model.state.authorChains).toEqual(traces.map(chain => chain.id));
        for (const chain of traces) {
            for (const point of chain.residues) {
                const candidates = model.points.filter(atom => atom.chain === chain.id && atom.number === point.number && atom.insertion === (point.insertion || ""));
                expect(candidates.some(atom => atom.xyz.every((coordinate, axis) => Math.abs(coordinate - point.xyz[axis]) < 0.001))).toBe(true);
            }
        }
        if (id === "3WD5") {
            expect(model.state.atomCount).toBe(4466);
            expect(model.state.polymerResidueCount).toBe(579);
            const cameraBefore = await frame.evaluate(() => Array.from(window.referenceViewer.plugin.canvas3d.camera.state.position));
            await page.locator("#zoom-in").click();
            await expect.poll(() => frame.evaluate(() => Array.from(window.referenceViewer.plugin.canvas3d.camera.state.position))).not.toEqual(cameraBefore);
            await page.locator("#reset-button").click();
            const beforeRotation = await frame.evaluate(() => Array.from(window.referenceViewer.plugin.canvas3d.camera.state.position));
            await frame.locator("canvas").press("ArrowLeft");
            await expect.poll(() => frame.evaluate(() => Array.from(window.referenceViewer.plugin.canvas3d.camera.state.position))).not.toEqual(beforeRotation);
        }
    }
    await page.selectOption("#representation-select", "trace");
    await expect(page.locator("#reference-frame")).toHaveCount(0);
    await expect(page.locator("canvas.molecular-canvas")).toBeVisible();
    await expect(page.locator("#chain-legend")).toBeVisible();
    expect(externalRequests).toEqual([]);
    expect(errors).toEqual([]);
});

test("cartoon download failure recovers to the working trace", async ({ page }) => {
    await page.route("**/assets/3wd5.pdb", route => route.abort());
    await ready(page);
    await page.selectOption("#representation-select", "cartoon");
    await expect(page.locator("#reference-stage")).toHaveAttribute("data-state", "error");
    await expect(page.locator("#reference-load-status")).toContainText("مسیر Cα");
    await page.selectOption("#representation-select", "trace");
    await expect(page.locator("canvas.molecular-canvas")).toBeVisible();
    await expect(page.locator("#interface-button")).toBeEnabled();
    await page.unroute("**/assets/3wd5.pdb");
    await page.selectOption("#representation-select", "cartoon");
    await expect(page.locator("#reference-stage")).toHaveAttribute("data-state", "ready", { timeout: 20000 });
});

test("beginner mechanism and deeper paper explanations are reachable in the notebook", async ({ page }) => {
    await page.goto(`${route}#binding-explainer`);
    await expect(page.locator("#binding-diagram svg")).toBeVisible();
    await page.locator('[data-binding-step="1"]').click();
    await expect(page.locator("#binding-explanation")).toContainText("Fab");
    await page.locator('[data-binding-step="2"]').click();
    await expect(page.locator("#binding-explanation")).toContainText("پیش‌بینی نمی‌کند");
    await page.getByRole('link', { name: 'شرح قدم‌به‌قدم اتصال، میل اتصال و اثر درمان' }).click();
    await expect(page.locator("#reading-status")).toHaveAttribute("data-state", "ready");
    await expect(page.locator("#markdown-content")).toContainText("سلول");
    await page.selectOption("#document-select", "paper-explanations.fa.md");
    await expect(page.locator("#reading-status")).toHaveAttribute("data-document", "paper-explanations.fa.md");
    await expect(page.locator("#markdown-content")).toBeVisible();
});

test('reference codons connect real CDS positions to amino acids and stop', async ({ page }) => {
    await page.goto(`${route}?tab=sequences#codon-lesson`);
    await expect(page.locator('#codon-status')).toHaveAttribute('data-state', 'ready');
    await expect(page.locator('#codon-strip button')).toHaveCount(12);
    await expect(page.locator('#codon-readout')).toContainText('NM_000594.4');
    await expect(page.locator('#codon-readout')).toContainText('178–180');
    await expect(page.locator('#codon-readout')).toContainText('Met / M');
    await page.locator('#codon-strip button').nth(3).click();
    await expect(page.locator('#codon-strip button').nth(3)).toBeFocused();
    await expect(page.locator('#codon-readout')).toContainText('Glu / E');
    await page.selectOption('#codon-gene', 'TOP2A');
    await expect(page.locator('#codon-readout')).toContainText('106–108');
    await expect(page.locator('#codon-note')).toContainText('NP_001058.2');
    await page.locator('#codon-stop').click();
    await expect(page.locator('#codon-readout')).toContainText('UAA');
    await expect(page.locator('#codon-readout')).toContainText('آمینواسید اضافه نمی‌شود');
    await expect(page.locator('#codon-code-body tr')).toHaveCount(64);
    await page.locator('#codon-strip button').first().click();
    await expect(page.locator('#codon-stop')).toHaveAttribute('aria-pressed', 'false');
});

test('unavailable codon data can retry while reference FASTA remains usable', async ({ page }) => {
    await page.route('**/data/processed/codon-lesson.json', request => request.abort());
    await page.goto(`${route}?tab=sequences#codon-lesson`);
    await expect(page.locator('#codon-status')).toHaveAttribute('data-state', 'error');
    await expect(page.locator('#sequence-record')).toBeVisible();
    await expect(page.locator('#sequence-copy')).toBeEnabled();
    await page.unroute('**/data/processed/codon-lesson.json');
    await page.locator('#codon-status').getByRole('button', { name: 'تلاش دوباره' }).click();
    await expect(page.locator('#codon-status')).toHaveAttribute('data-state', 'ready');
    await expect(page.locator('#codon-strip button')).toHaveCount(12);
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
    await expect(page.locator("#datasets-body tr")).toHaveCount(26);
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

for (const width of [1440, 390]) {
    test(`glossary links keep text color and open the exact definition at ${width}px`, async ({ page, context }) => {
        const origin = new URL(test.info().project.use.baseURL).origin;
        await context.route('**/*', request => request.request().url().startsWith(origin) ? request.continue() : request.abort());
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${route}?document=class-presentation.fa.md&chapter=chapter-3#reading`);
        await expect(page.locator('#reading-status')).toHaveAttribute('data-state', 'ready');
        await expect(page.locator('#markdown-content')).toContainText('آنتی‌بادی، پروتئینی');
        const term = page.locator('#markdown-content').getByRole('link', { name: 'IgG1', exact: true });
        const before = await term.evaluate(link => ({
            color: getComputedStyle(link).color,
            parentColor: getComputedStyle(link.parentElement).color,
            underline: getComputedStyle(link).textDecorationLine,
        }));
        expect(before.color).toBe(before.parentColor);
        expect(before.underline).toBe('underline');
        await term.hover();
        expect(await term.evaluate(link => getComputedStyle(link).color)).toBe(before.color);
        await term.press('Enter');
        await expect(page.locator('#reading-status')).toHaveAttribute('data-document', 'glossary.fa.md');
        await expect(page.locator('#reading-status')).toHaveAttribute('data-chapter', 'chapter-2');
        await expect(page.locator('#markdown-content h2')).toContainText('IgG1');
        await expect(page.locator('#markdown-content')).toContainText('نوع مولکول IgG1 و هدف اتصال آن TNF');
        await page.goBack();
        await expect(page.locator('#reading-status')).toHaveAttribute('data-document', 'class-presentation.fa.md');
        await expect(page.locator('#reading-status')).toHaveAttribute('data-chapter', 'chapter-3');
        await page.goto(`${route}presentation.html#slide-4`);
        await expect(page.locator('#deck')).toHaveAttribute('data-state', 'ready');
        const slideLink = page.locator('.slide:visible').getByRole('link', { name: 'IgG1', exact: true });
        expect(await slideLink.evaluate(link => getComputedStyle(link).color === getComputedStyle(link.parentElement).color)).toBe(true);
        const popupPromise = page.waitForEvent('popup');
        await slideLink.click();
        const definition = await popupPromise;
        await expect(definition.locator('#reading-status')).toHaveAttribute('data-document', 'glossary.fa.md');
        await expect(definition.locator('#reading-status')).toHaveAttribute('data-chapter', 'chapter-2');
        await expect(page).toHaveURL(/#slide-4$/);
        await definition.close();
    });
}

test("guided class presentation advances one step and resumes after the laboratory", async ({ page }) => {
    await ready(page);
    await page.locator("#start-presentation").click();
    await expect(page.locator("#reading-status")).toHaveAttribute("data-document", "class-presentation.fa.md");
    await expect(page.locator("#reading-status")).toHaveAttribute("data-chapter", "chapter-1");
    await expect(page.locator("#reading-status")).toContainText("گام ۱ از ۲۳");
    await expect(page.locator("body")).toHaveAttribute("data-presentation-mode", "true");
    await expect(page.locator("#document-select")).toBeHidden();
    await expect(page.locator("#chapter-prev")).toBeDisabled();
    await page.keyboard.press("PageDown");
    await expect(page.locator("#reading-status")).toHaveAttribute("data-chapter", "chapter-2");
    await expect(page.locator("#markdown-content")).toContainText("سلول");
    await page.selectOption("#chapter-select", "chapter-5");
    await expect(page.locator("#reading-status")).toHaveAttribute("data-chapter", "chapter-5");
    await page.getByRole("link", { name: "باز کردن آزمایشگاه سه‌بعدی", exact: true }).click();
    await expect(page.locator("#molecular-stage")).toHaveAttribute("data-state", "ready");
    await expect(page.locator("#tab-lab")).toHaveAttribute("aria-selected", "true");
    await page.locator("#tab-reading").click();
    await expect(page.locator("#reading-status")).toHaveAttribute("data-chapter", "chapter-5");
    await page.selectOption("#chapter-select", "chapter-4");
    await expect(page.locator("#reading-status")).toHaveAttribute("data-optional-render", "ready");
    await expect(page.locator("#markdown-content .mermaid-diagram svg")).toBeVisible();
    await page.selectOption("#chapter-select", "chapter-23");
    await expect(page.locator("#chapter-next")).toBeDisabled();
    await page.locator("#chapter-prev").click();
    await expect(page.locator("#reading-status")).toHaveAttribute("data-chapter", "chapter-22");
    await page.locator("#presentation-view").click();
    await expect(page.locator("body")).toHaveAttribute("data-presentation-mode", "false");
    await expect(page.locator("#document-select")).toBeVisible();
    await page.selectOption("#document-select", "research-questions.fa.md");
    await expect(page.locator("#reading-status")).toHaveAttribute("data-document", "research-questions.fa.md");
    await expect(page.locator("#presentation-help")).toBeHidden();
    await expect(page.locator("#chapter-next")).toHaveText("فصل بعدی");
    await page.locator("#tab-basics").click();
    await page.locator("#start-presentation").click();
    await expect(page.locator("#reading-status")).toHaveAttribute("data-document", "class-presentation.fa.md");
    await expect(page.locator("#reading-status")).toHaveAttribute("data-chapter", "chapter-1");
    await page.selectOption("#chapter-select", "chapter-5");
    await page.locator("#slide-launch").click();
    await expect(page).toHaveURL(/presentation\.html#slide-1$/);
    await expect(page.locator("#deck")).toHaveAttribute("data-state", "ready");
    await expect(page.locator(".cover")).toBeVisible();
    await expect(page.locator("#slide-prev")).toBeDisabled();
});

test("executed surface analysis is readable as an optional numerical report", async ({ page }) => {
    await page.goto(`${route}?document=structural-feasibility-results.fa.md&chapter=all#reading`);
    await expect(page.locator("#reading-status")).toHaveAttribute("data-state", "ready");
    await expect(page.locator("#reading-status")).toHaveAttribute("data-optional-render", "ready");
    await expect(page.locator("#markdown-content .katex-display").first()).toBeVisible();
    await expect(page.locator("#markdown-content img")).toHaveAttribute("src", /structural-feasibility\.svg$/);
    await expect(page.locator("#markdown-content")).toContainText("785.89");
    await expect(page.locator("#markdown-content")).toContainText("0.355");
    await expect(page.locator("#markdown-content")).toContainText("MD نیست");
    await expect(page.locator("#presentation-help")).toBeHidden();
});

for (const width of [1440, 390]) {
    test(`audience slides navigate offline with readable local media at ${width}px`, async ({ page, context }) => {
        await page.setViewportSize({ width, height: 900 });
        const origin = new URL(test.info().project.use.baseURL).origin;
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
        await page.goto(`${route}presentation.html#slide-1`);
        await expect(page.locator('#deck')).toHaveAttribute('data-state', 'ready');
        await expect(page.locator('.slide')).toHaveCount(24);
        await expect(page.locator('#deck')).not.toContainText('برای گفتن');
        await expect(page.locator('#slide-prev')).toBeDisabled();
        await expect(page.locator('.cover .cover-details')).toContainText('شینی');
        await expect(page.locator('.cover .cover-details')).toContainText('دکتر فرزانه محمدی فارسانی');
        await expect(page.locator('.cover .cover-details')).not.toContainText('زمان ارائه');
        await expect(page.locator('.cover .slide-footer > p').last()).toHaveText('پاییز ۱۴۰۵');
        await expect(page.locator('.cover .supervisor-profile')).toHaveAttribute('href', 'https://scholar.google.com/citations?user=VA1rZ7MAAAAJ&hl=en');
        for (let index = 0; index < 24; index++) {
            await page.selectOption('#slide-select', String(index));
            await expect(page.locator('.slide:visible')).toHaveCount(1);
            await expect(page).toHaveURL(new RegExp(`#slide-${index + 1}$`));
            const active = page.locator('.slide:visible');
            for (const img of await active.locator('img').all()) {
                await expect.poll(() => img.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
            }
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            await expect(active.locator('.slide-course')).toHaveText('درس بیوانفورماتیک ساختاری');
            const logo = await active.locator('.university-logo').boundingBox();
            const institution = await active.locator('.slide-institution').boundingBox();
            expect(logo.x + logo.width).toBeLessThan(institution.x);
            await expect(active.locator('.slide-footer')).toContainText('آدالیموماب');
            if (width === 1440) expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(902);
            if (index > 0 && index < 23) expect(await active.locator('.slide-references a[href^="https://"]').count()).toBeGreaterThan(0);
            for (const label of await active.locator('.nodeLabel').all()) {
                if (/[\u0600-\u06ff]/.test(await label.textContent())) {
                    expect(await label.evaluate(node => getComputedStyle(node).direction)).toBe('rtl');
                }
            }
            if (index === 5) await expect(active.locator('h1 bdi').filter({ hasText: /^3WD5$/ })).toHaveText('3WD5');
            if (index === 21) await expect(active.locator('strong bdi').filter({ hasText: '4.5 Å' })).toHaveAttribute('dir', 'ltr');
            if (index === 23) {
                for (const accession of ['3WD5', '1TNF', '4FM9']) {
                    await expect(active.locator('a bdi').filter({ hasText: new RegExp('^' + accession + '$') })).toHaveAttribute('dir', 'ltr');
                }
            }
        }
        await expect(page.locator('#slide-next')).toBeDisabled();
        await page.keyboard.press('Home');
        await expect(page).toHaveURL(/#slide-1$/);
        await page.keyboard.press('ArrowLeft');
        await expect(page).toHaveURL(/#slide-2$/);
        await page.keyboard.press('PageUp');
        await expect(page).toHaveURL(/#slide-1$/);
        await page.locator('#sources-link').click();
        await expect(page).toHaveURL(/#slide-24$/);
        await page.emulateMedia({ media: 'print' });
        await expect(page.locator('.slide:visible')).toHaveCount(24);
        expect(errors).toEqual([]);
    });
}


for (const width of [1440, 390]) {
    test(`in-slide figures and experimental models enlarge offline at ${width}px`, async ({ page, context }) => {
        test.setTimeout(60000); // Two local molecular models on CI's software renderer.
        await page.setViewportSize({ width, height: 900 });
        const origin = new URL(test.info().project.use.baseURL).origin;
        await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
        await page.goto(`${route}presentation.html#slide-1`);
        await expect(page.locator('#deck')).toHaveAttribute('data-state', 'ready');
        await page.selectOption('#slide-select', '3');
        const enlarge = page.locator('.slide:visible').getByRole('button', { name: 'بزرگ‌نمایی شکل', exact: true });
        await enlarge.click();
        await expect(page.locator('#slide-media-dialog')).toBeVisible();
        await expect(page.locator('#slide-media-stage img')).toBeVisible();
        expect((await page.locator('#slide-media-stage').boundingBox()).width).toBeGreaterThan(width * .7);
        await page.keyboard.press('Escape');
        await expect(page.locator('#slide-media-dialog')).not.toBeVisible();
        await expect(enlarge).toBeFocused();
        await expect(page).toHaveURL(/#slide-4$/);
        await page.selectOption('#slide-select', '5');
        await page.getByRole('button', { name: 'مدل سه‌بعدی 3WD5', exact: true }).click();
        const modelFrame = page.frameLocator('#slide-media-stage iframe');
        await expect(modelFrame.locator('body')).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
        expect(await page.evaluate(() => document.querySelector('#slide-media-stage iframe').contentWindow.referenceViewer.state.polymerResidueCount)).toBe(579);
        await page.getByRole('button', { name: 'بستن و بازگشت به اسلاید' }).click();
        await expect(page).toHaveURL(/#slide-6$/);
        await expect(page.locator('.slide:visible')).toContainText('Fc');
        await page.selectOption('#slide-select', '14');
        await page.getByRole('button', { name: 'مدل سه‌بعدی 4FM9', exact: true }).click();
        await expect(modelFrame.locator('body')).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
        expect(await page.evaluate(() => document.querySelector('#slide-media-stage iframe').contentWindow.referenceViewer.state.scope)).toBe('deposited_model');
        await page.getByRole('button', { name: 'بستن و بازگشت به اسلاید' }).click();
    });
}

test('browser PDF keeps the 24 complete slides on 24 pages', async ({ page }) => {
    test.setTimeout(60000); // PDF/font serialization has a separate bounded budget.
    await page.goto(`${route}presentation.html#slide-1`);
    await expect(page.locator('#deck')).toHaveAttribute('data-state', 'ready');
    for (const image of await page.locator('.slide img').all()) {
        await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
    }
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    expect(pdf.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(24);
});

test('slide source failure can be retried without losing notebook access', async ({ page }) => {
    await page.route('**/docs/class-presentation.fa.md', route => route.abort());
    await page.goto(`${route}presentation.html`);
    await expect(page.locator('#deck')).toHaveAttribute('data-state', 'error');
    await expect(page.locator('#notebook-link')).toBeVisible();
    await page.unroute('**/docs/class-presentation.fa.md');
    await page.locator('#retry-deck').click();
    await expect(page.locator('#deck')).toHaveAttribute('data-state', 'ready');
});
