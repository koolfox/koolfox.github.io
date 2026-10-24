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

    await expect(fallback.locator("#stat-atom-contacts")).toHaveText("۲۵۲");
    await fallback.goto(`${route}?unit=4&part=practice&tool=datasets`);
    await expect(fallback.locator("#datasets-table")).toHaveAttribute("data-state", "ready");
    await context.close();
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
    await page.goto(`${route}?unit=3&part=practice&tool=lab`);
    await expect(page.locator("#molecular-stage")).toHaveAttribute("data-state", "ready");
    await expect(page.locator("canvas.molecular-canvas")).toBeVisible();
    await expect(page.locator("#stat-atom-contacts")).toHaveText("۲۵۲");
});

test("research Markdown renders chapters, actual LaTeX and Mermaid inside the page", async ({ page }) => {
    const requests = [];
    page.on("request", request => requests.push(request.url()));
    await ready(page);
    expect(requests.some(url => url.includes("mermaid.min.js"))).toBe(false);
    await page.goto(`${route}?unit=3&part=research&document=structural-method.fa.md`);
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
    await page.locator('#markdown-content a[href*="document=sequences-primer.fa.md"]').click();
    await expect(page.locator("#reading-status")).toHaveAttribute("data-document", "sequences-primer.fa.md");
    await expect(page).toHaveURL(/document=sequences-primer\.fa\.md.*#reading$/);
    await page.goto(`${route}?unit=3&part=research&document=visualization-tools.fa.md`);
    await expect(page.locator("#markdown-content")).toHaveAttribute("data-document", "visualization-tools.fa.md");
    await page.selectOption("#chapter-select", "all");
    await page.locator('#markdown-content a[href*="document=anatomy-evaluation.fa.md"]').first().click();
    await expect(page.locator("#reading-status")).toHaveAttribute("data-document", "anatomy-evaluation.fa.md");
    await expect(page.locator("#document-select")).toHaveValue("anatomy-evaluation.fa.md");
});

test("optional diagram failure preserves Markdown and its original code", async ({ page }) => {
    await page.route("**/vendor/mermaid/mermaid.min.js", request => request.fulfill({ status: 404, body: "Not found" }));
    await page.goto(`${route}?document=structural-method.fa.md&chapter=all#reading`);
    await expect(page.locator("#reading-status")).toHaveAttribute("data-state", "ready");
    await expect(page.locator("#reading-status")).toHaveAttribute("data-optional-render", "partial");
    await expect(page.locator("#markdown-content code").filter({ hasText: "flowchart TD" })).toBeVisible();
    await page.goto(`${route}?unit=3&part=practice&tool=lab`);
    await expect(page.locator("#molecular-stage")).toHaveAttribute("data-state", "ready");
    await expect(page.locator("canvas.molecular-canvas")).toBeVisible();
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

test("docking validation shows its gates and names the one that failed", async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${route}?unit=8&part=practice&tool=docking`);
    await expect(page.locator("#docking-validation")).toHaveAttribute("data-state", "ready");
    const rows = page.locator("#docking-gates-body tr");
    await expect(rows).toHaveCount(3);
    // The two gates that passed and the one that failed are all visible.
    await expect(rows.nth(0)).toHaveAttribute("data-passed", "true");
    await expect(rows.nth(1)).toHaveAttribute("data-passed", "true");
    await expect(rows.nth(2)).toHaveAttribute("data-passed", "false");
    await expect(page.locator("#docking-gates-body")).toContainText("۱٫۱۵۵");
    await expect(page.locator("#docking-status")).toContainText("قبول نشد");
    // A failed gate is never dressed up as a pass.
    await expect(page.locator('#docking-gates-body tr[data-passed="false"] td:last-child')).toHaveText("خیر");
    expect(errors).toEqual([]);
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
        await expect(page.locator('.slide')).toHaveCount(39);
        await expect(page.locator('#deck')).not.toContainText('برای گفتن');
        await expect(page.locator('#slide-prev')).toBeDisabled();
        await expect(page.locator('.cover .cover-details')).toContainText('شینی');
        await expect(page.locator('.cover .cover-details')).toContainText('دکتر فرزانه محمدی فارسانی');
        await expect(page.locator('.cover .cover-details')).not.toContainText('زمان ارائه');
        await expect(page.locator('.cover .slide-footer > p').last()).toHaveText('پاییز ۱۴۰۵');
        await expect(page.locator('.cover .supervisor-profile')).toHaveAttribute('href', 'https://scholar.google.com/citations?user=VA1rZ7MAAAAJ&hl=en');
        for (let index = 0; index < 39; index++) {
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
            if (index > 0 && await active.getAttribute('data-chapter') !== '29') expect(await active.locator('.slide-references a[href^="https://"]').count()).toBeGreaterThan(0);
            for (const label of await active.locator('.nodeLabel').all()) {
                if (/[\u0600-\u06ff]/.test(await label.textContent())) {
                    expect(await label.evaluate(node => getComputedStyle(node).direction)).toBe('rtl');
                }
            }
            if (await active.getAttribute('data-chapter') === '13') await expect(active.locator('h1 bdi').filter({ hasText: /^3WD5$/ })).toHaveText('3WD5');
            if (await active.getAttribute('data-chapter') === '12') await expect(active.locator('strong bdi').filter({ hasText: '4.5 Å' })).toHaveAttribute('dir', 'ltr');
            if (await active.getAttribute('data-chapter') === '29') {
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
        await expect(page.locator('.slide:visible')).toHaveAttribute('data-chapter','29');
        await page.emulateMedia({ media: 'print' });
        await expect(page.locator('.slide:visible')).toHaveCount(39);
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
        await page.selectOption('#slide-select', await page.locator('.slide[data-chapter="5"]').evaluate(el=>String([...el.parentElement.children].indexOf(el))));
        const enlarge = page.locator('.slide:visible').getByRole('button', { name: 'بزرگ‌نمایی شکل', exact: true });
        await enlarge.click();
        await expect(page.locator('#slide-media-dialog')).toBeVisible();
        await expect(page.locator('#slide-media-stage img')).toBeVisible();
        expect((await page.locator('#slide-media-stage').boundingBox()).width).toBeGreaterThan(width * .7);
        await page.keyboard.press('Escape');
        await expect(page.locator('#slide-media-dialog')).not.toBeVisible();
        await expect(enlarge).toBeFocused();
        await expect(page.locator('.slide:visible')).toHaveAttribute('data-chapter','5');
        await page.selectOption('#slide-select', await page.locator('.slide[data-chapter="13"]').evaluate(el=>String([...el.parentElement.children].indexOf(el))));
        await page.getByRole('button', { name: 'مدل سه‌بعدی 3WD5', exact: true }).click();
        const modelFrame = page.frameLocator('#slide-media-stage iframe');
        await expect(modelFrame.locator('body')).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
        expect(await page.evaluate(() => document.querySelector('#slide-media-stage iframe').contentWindow.referenceViewer.state.polymerResidueCount)).toBe(579);
        await page.getByRole('button', { name: 'بستن و بازگشت به اسلاید' }).click();
        await expect(page.locator('.slide:visible')).toHaveAttribute('data-chapter','13');
        await expect(page.locator('.slide:visible')).toContainText('Fab');
        await page.selectOption('#slide-select', await page.locator('.slide[data-chapter="33"]').evaluate(el=>String([...el.parentElement.children].indexOf(el))));
        await page.getByRole('button', { name: 'مدل سه‌بعدی 4FM9', exact: true }).click();
        await expect(modelFrame.locator('body')).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
        expect(await page.evaluate(() => document.querySelector('#slide-media-stage iframe').contentWindow.referenceViewer.state.scope)).toBe('deposited_model');
        await page.getByRole('button', { name: 'بستن و بازگشت به اسلاید' }).click();
    });
}

test('browser PDF keeps the 39 complete slides on 39 pages', async ({ page }) => {
    test.setTimeout(60000); // PDF/font serialization has a separate bounded budget.
    await page.goto(`${route}presentation.html#slide-1`);
    await expect(page.locator('#deck')).toHaveAttribute('data-state', 'ready');
    for (const image of await page.locator('.slide img').all()) {
        await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
    }
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    expect(pdf.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(39);
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

test("epitope mini-experiments re-threshold contacts, list partners and truncate side chains", async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${route}?unit=3&part=practice&tool=epitope`);
    await page.locator("#epitope-lab").scrollIntoViewIfNeeded();
    await expect(page.locator("#epitope-lab")).toHaveAttribute("data-state", "ready");
    // Default 4.5 Å reproduces data/processed/full-epitope.json.
    await expect(page.locator("#epitope-stat-atoms")).toHaveText("۳۶۵");
    await expect(page.locator("#epitope-stat-own")).toHaveText("۲۵۲");
    await expect(page.locator("#epitope-stat-neighbour")).toHaveText("۱۱۳");
    await expect(page.locator("#epitope-types")).toContainText("تحلیل اصلی");
    await page.locator("#epitope-cutoff").fill("3.5");
    await expect(page.locator("#epitope-cutoff-value")).toHaveText("3.5 Å");
    const tight = Number(await page.locator("#epitope-lab").getAttribute("data-contacts"));
    expect(tight).toBeGreaterThan(0);
    expect(tight).toBeLessThan(365);
    await page.locator("#epitope-cutoff").fill("4.5");
    // Gln21 is preselected: its partners are the light-chain residues reported in the paper draft.
    await expect(page.locator("#epitope-residue")).toHaveValue(/\d+/);
    await expect(page.locator("#epitope-partners")).toContainText("L:ASP1");
    await expect(page.locator("#epitope-partners")).toContainText("L:ARG93");
    await expect(page.locator("#epitope-residue-summary")).toContainText("75.2 Å²");
    await page.locator("#epitope-alanine").click();
    await expect(page.locator("#epitope-alanine")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#epitope-alanine-result")).toContainText("جفت اتم حذف شد");
    expect(Number(await page.locator("#epitope-lab").getAttribute("data-contacts"))).toBeLessThan(365);
    // 3D trimer with three Fabs; the two other Fabs can be hidden.
    await expect(page.locator("#epitope-stage")).toHaveAttribute("data-state", "ready");
    const data = await page.evaluate(() => fetch("data/processed/epitope-lab.json").then(r => r.json()));
    const total = data.trace.reduce((sum, chain) => sum + chain.residues.length, 0);
    const other = data.trace.filter(c => ["I", "M", "J", "N"].includes(c.id)).reduce((s, c) => s + c.residues.length, 0);
    expect((await page.evaluate(() => window.epitopeScene.getState())).pointCount).toBe(total);
    await page.locator("#epitope-other-fabs").uncheck();
    expect((await page.evaluate(() => window.epitopeScene.getState())).visiblePointCount).toBe(total - other);
    // A different residue resets truncation and updates the partner table.
    await page.selectOption("#epitope-residue", { label: "A:GLN67" });
    await expect(page.locator("#epitope-alanine")).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#epitope-residue-summary")).toContainText("A:GLN67");
    expect(errors).toEqual([]);
});

test("epitope experiments keep working without WebGL", async ({ page }) => {
    await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...options) {
            return type.startsWith("webgl") ? null : original.call(this, type, ...options);
        };
    });
    await page.goto(`${route}?unit=3&part=practice&tool=epitope`);
    await page.locator("#epitope-lab").scrollIntoViewIfNeeded();
    await expect(page.locator("#epitope-stage")).toHaveAttribute("data-state", "error");
    await expect(page.locator("#epitope-fallback")).toBeVisible();
    await expect(page.locator("#epitope-stat-atoms")).toHaveText("۳۶۵");
    await page.locator("#epitope-alanine").click();
    await expect(page.locator("#epitope-alanine-result")).toContainText("جفت اتم حذف شد");
});

test("RNA-seq response groups show only aggregates and switch genes", async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${route}?tab=methods#rnaseq-groups`);
    await page.locator("#rnaseq-groups").scrollIntoViewIfNeeded();
    await expect(page.locator("#rnaseq-groups")).toHaveAttribute("data-state", "ready");
    await expect(page.locator("#rnaseq-chart")).toHaveAttribute("data-gene", "TNF");
    await expect(page.locator("#rnaseq-chart .rnaseq-row")).toHaveCount(3);
    await expect(page.locator("#rnaseq-body tr")).toHaveCount(3);
    await expect(page.locator("#rnaseq-body")).toContainText("۱۸");
    await page.selectOption("#rnaseq-gene", "TOP2A");
    await expect(page.locator("#rnaseq-chart")).toHaveAttribute("data-gene", "TOP2A");
    await expect(page.locator("#rnaseq-gene-role")).toContainText("TOP2A");
    expect(errors).toEqual([]);
});
