import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";

const route = "/deep-learning/";
const labRoute = `${route}lab.html`;
const gates = ["AND", "OR", "NAND", "NOR", "XOR", "XNOR"];

function replay(checkpoint, inputs, activation) {
    let values = inputs;
    for (let layer = 0; layer < checkpoint.weights.length; layer += 1) {
        values = checkpoint.weights[layer].map((weights, i) => {
            const z = weights.reduce((sum, weight, j) => sum + weight * values[j], checkpoint.biases[layer][i]);
            return activation === "hard_threshold" ? Number(z >= 0) : 1 / (1 + Math.exp(-z));
        });
    }
    return values[0];
}

test("every Python checkpoint replays from its actual weights for all gates and models", async ({ request }) => {
    const response = await request.get(`${route}assets/data/gates.json`);
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(Object.keys(data.gates).sort()).toEqual([...gates].sort());
    expect(data.provenance.execution).toContain("actual Python training");
    const source = await request.get(`${route}python/logic_gates.py`);
    expect(source.ok()).toBe(true);
    expect(createHash("sha256").update(await source.body()).digest("hex")).toBe(data.provenance.source_sha256);
    for (const gate of gates) {
        const entry = data.gates[gate];
        for (const [name, model] of Object.entries(entry.models)) {
            expect(model.checkpoints.length).toBeGreaterThan(2);
            for (const checkpoint of model.checkpoints) {
                for (let row = 0; row < data.truth_table_inputs.length; row += 1) {
                    expect(replay(checkpoint, data.truth_table_inputs[row], model.config.activation), `${gate}/${name}/${checkpoint.epoch}/${row}`).toBeCloseTo(checkpoint.probabilities[row], 12);
                }
            }
            const final = model.final;
            expect(model.checkpoints.at(-1).weights).toEqual(final.weights);
            if (name === "mlp" || !["XOR", "XNOR"].includes(gate)) {
                expect(final.accuracy, `${gate}/${name}`).toBe(1);
                expect(final.predictions).toEqual(entry.targets);
            } else {
                expect(final.accuracy, `${gate}/${name} must not solve a nonlinear gate`).toBeLessThan(1);
            }
        }
    }
});

async function ready(page) {
    await page.goto(labRoute);
    await expect(page.locator("#gate")).toBeEnabled();
    await expect(page.locator("#truth-body tr")).toHaveCount(4);
}

async function goToFrame(page, value) {
    await page.locator("#frame").evaluate((element, index) => {
        element.value = String(index);
        element.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
}

test("six gates and all three models show genuine stored Python predictions", async ({ page, request }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const data = await (await request.get(`${route}assets/data/gates.json`)).json();
    await ready(page);
    for (const gate of gates) {
        await page.selectOption("#gate", gate);
        for (const modelName of ["perceptron", "linear", "mlp"]) {
            await page.selectOption("#model", modelName);
            const model = data.gates[gate].models[modelName];
            for (const index of [0, 7, model.checkpoints.length - 1]) {
                await goToFrame(page, index);
                const checkpoint = model.checkpoints[index];
                await expect(page.locator("#epoch")).toContainText(String(checkpoint.epoch));
                const rows = page.locator("#truth-body tr");
                for (let row = 0; row < 4; row += 1) {
                    const cells = await rows.nth(row).locator("td").allTextContents();
                    expect(Number(cells[2])).toBe(data.gates[gate].targets[row]);
                    expect(Number(cells[3])).toBeCloseTo(checkpoint.probabilities[row], 3);
                    expect(Number(cells[4])).toBe(Number(checkpoint.probabilities[row] >= 0.5));
                }
            }
        }
    }
    expect(errors).toEqual([]);
});

test("replay can be paused, stepped, restarted, interrupted, and finished", async ({ page }) => {
    await ready(page);
    await page.click("#reset");
    await expect(page.locator("#frame")).toHaveValue("0");
    await page.click("#step");
    await expect(page.locator("#frame")).toHaveValue("1");
    await page.click("#play");
    await expect.poll(() => page.inputValue("#frame")).not.toBe("1");
    await page.click("#play");
    const paused = await page.inputValue("#frame");
    await page.waitForTimeout(950);
    await expect(page.locator("#frame")).toHaveValue(paused);
    await page.click("#play");
    await page.selectOption("#gate", "OR");
    const interrupted = await page.inputValue("#frame");
    await page.waitForTimeout(950);
    await expect(page.locator("#frame")).toHaveValue(interrupted);
    await page.click("#finish");
    const maximum = await page.locator("#frame").getAttribute("max");
    await expect(page.locator("#frame")).toHaveValue(maximum);
    await page.click("#reset");
    await expect(page.locator("#frame")).toHaveValue("0");
});

test("Python source download is real, and code stays left-to-right in the RTL course", async ({ page }) => {
    await ready(page);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("#reproduce")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("#weights")).toHaveAttribute("dir", "ltr");
    const pending = page.waitForEvent("download");
    await page.locator("#python-download").click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe("logic_gates.py");
    expect(await download.failure()).toBeNull();
});

test("a failed Python artifact fetch explains the problem without fake results", async ({ page }) => {
    await page.route("**/assets/data/gates.json", route => route.abort());
    await page.goto(labRoute);
    await expect(page.locator("#lab-error")).toBeVisible();
    await expect(page.locator("#play")).toBeDisabled();
    await expect(page.locator("#truth-body tr")).toHaveCount(0);
    await expect(page.locator("#python-download")).toBeVisible();
});

test("progress persists, exports, imports, and resets without touching other courses", async ({ page }) => {
    await ready(page);
    const check = page.locator('[data-check="exercise-truth"]');
    await check.check();
    await page.reload();
    await expect(check).toBeChecked();
    const pending = page.waitForEvent("download");
    await page.click("#export-progress");
    const download = await pending;
    const path = await download.path();
    await page.evaluate(() => localStorage.setItem("koolfox.karpathy.progress.v1", "sentinel"));
    page.on("dialog", dialog => dialog.accept());
    await page.click("#clear-progress");
    await expect(check).not.toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem("koolfox.karpathy.progress.v1"))).toBe("sentinel");
    await page.locator("#import-progress").setInputFiles(path);
    await expect(check).toBeChecked();
    await page.reload();
    await expect(check).toBeChecked();
    await page.locator("#import-progress").setInputFiles({name:"invalid.json",mimeType:"application/json",buffer:Buffer.from('{"invalid":true}')});
    await expect(page.locator("#storage-status")).not.toBeEmpty();
    await expect(check).toBeChecked();
});

for (const mode of ["corrupt", "blocked"]) {
    test(`${mode} browser storage does not break the lesson or replay`, async ({ page }) => {
        await page.addInitScript(mode => {
            if (mode === "corrupt") localStorage.setItem("koolfox.deep-learning.progress.v1", "{broken");
            else {
                Storage.prototype.getItem = () => { throw new Error("Storage blocked"); };
                Storage.prototype.setItem = () => { throw new Error("Storage blocked"); };
            }
        }, mode);
        await ready(page);
        await page.locator('[data-check="exercise-truth"]').check();
        await expect(page.locator('[data-check="exercise-truth"]')).toBeChecked();
        await page.click("#step");
        await expect(page.locator("#frame")).toHaveValue("1");
    });
}

test("keyboard users can operate native controls and inspect the network", async ({ page }) => {
    await ready(page);
    await page.locator("#step").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#frame")).toHaveValue("1");
    await page.locator("#frame").focus();
    await page.keyboard.press("Home");
    await expect(page.locator("#frame")).toHaveValue("0");
    await page.locator(".weights summary").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#weights")).toBeVisible();
    await expect(page.locator("#weights")).not.toBeEmpty();
});

test.describe("reduced motion", () => {
    test.use({ contextOptions: { reducedMotion: "reduce" } });
    test("loads a static usable result, with no autoplay", async ({ page }) => {
        await ready(page);
        expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
        const initial = await page.inputValue("#frame");
        await page.waitForTimeout(950);
        await expect(page.locator("#frame")).toHaveValue(initial);
        await page.click("#play");
        await expect(page.locator("#frame")).toHaveValue(await page.locator("#frame").getAttribute("max"));
        await expect(page.locator("#truth-body tr")).toHaveCount(4);
        expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    });
});

test.describe("phone layout", () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test("does not overflow at 390px and all sections remain reachable", async ({ page }) => {
        await ready(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
        await page.locator(".weights summary").click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
        for (const selector of ["#gate", "#model", "#play", "#step", "#reset", "#finish", "#frame"]) {
            const bounds = await page.locator(selector).boundingBox();
            expect(bounds.x, `${selector} must not spill left in RTL`).toBeGreaterThanOrEqual(0);
            expect(bounds.x + bounds.width, `${selector} must fit the viewport`).toBeLessThanOrEqual(390);
        }
        for (const id of ["lab", "course", "exercises", "project", "sources"]) {
            await expect(page.locator(`#${id}`)).toBeVisible();
        }
        await page.screenshot({ path: test.info().outputPath("deep-learning-mobile.png"), fullPage: true });
    });
});

test("desktop course renders without runtime errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await ready(page);
    await expect(page.locator("#curriculum [data-check]")).toHaveCount(7);
    await expect(page.locator('[data-check="chapter-6"]')).toHaveCount(1);
    await expect(page.locator("#source-notes")).toContainText("۴۴۶");
    await page.click("#finish");
    await page.screenshot({ path: test.info().outputPath("deep-learning-desktop.png"), fullPage: true });
    expect(errors).toEqual([]);
});

test("all local course links and loaded resources resolve in the publication artifact", async ({ page, request }) => {
    const failures = [];
    page.on("response", response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
    await ready(page);
    const links = await page.locator("a[href]").evaluateAll(anchors => anchors.map(anchor => anchor.href));
    for (const href of new Set(links)) {
        const url = new URL(href);
        if (url.origin !== new URL(page.url()).origin) continue;
        const response = await request.get(url.href);
        expect(response.ok(), url.href).toBe(true);
        if (url.pathname === new URL(page.url()).pathname && url.hash) {
            expect(await page.locator(url.hash).count(), url.hash).toBe(1);
        }
    }
    expect(failures).toEqual([]);
});
