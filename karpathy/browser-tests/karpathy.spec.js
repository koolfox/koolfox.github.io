import { expect, test } from "@playwright/test";

const route = "/karpathy/";

async function ready(page) {
    await page.goto(route);
    await expect(page.locator("#lab-result .result-value")).toBeVisible();
}

test("the workbench reproduces the upstream micrograd reference numbers", async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await ready(page);

    const reference = await page.evaluate(() => window.karpathyLab.referenceCheck());
    expect(reference.value).toBeCloseTo(24.7041, 4);
    expect(reference.da).toBeCloseTo(138.8338, 4);
    expect(reference.db).toBeCloseTo(645.5773, 4);
    expect(await page.evaluate(() => window.karpathyLab.referenceOk)).toBe(true);
    expect(errors).toEqual([]);
});

test("the graph draws the real dag and the backward pass fills every gradient", async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await ready(page);

    await page.fill("#expression", "a * b + b ** 3");
    await page.click("#run");
    await expect(page.locator("#lab-result .result-value dd")).toHaveText("33");

    const rows = page.locator(".gradient-table tbody tr");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0).locator("td")).toHaveText("3");
    await expect(rows.nth(1).locator("td")).toHaveText("29");
    await expect(rows.nth(2).locator("td")).toHaveText("0");

    const nodes = page.locator("#graph-sheet .graph-node");
    await expect(nodes).toHaveCount(5);
    await expect(page.locator("#graph-sheet .graph-edge")).toHaveCount(5);
    await expect(page.locator("#graph-sheet .graph-node.is-output")).toHaveCount(1);
    expect(errors).toEqual([]);
});

test("changing a variable changes the gradient, and a bad expression is explained", async ({ page }) => {
    await ready(page);
    await page.fill("#expression", "a * b");
    await page.fill("#variable-a", "5");
    await page.fill("#variable-b", "7");
    await page.click("#run");
    await expect(page.locator("#lab-result .result-value dd")).toHaveText("35");
    await expect(page.locator(".gradient-table tbody tr").nth(0)).toContainText("7");

    await page.fill("#expression", "a * ");
    await page.click("#run");
    await expect(page.locator(".lab-error")).toBeVisible();
    await expect(page.locator(".lab-error")).toContainText("عبارت نامعتبر");
});

test("a prediction is answered before the answer is revealed and is kept in the browser", async ({ page }) => {
    await ready(page);

    await page.locator('.lecture[data-lesson="1"] [data-action="predict"]').click();
    const panel = page.locator('.lecture[data-lesson="1"] .prediction');
    await expect(panel).toBeVisible();
    await expect(panel.locator(".prediction-question")).toContainText("a * b + b ** 3");

    await panel.locator("input").fill("29");
    await panel.locator("button").click();
    await expect(panel.locator(".prediction-verdict")).toHaveClass(/is-correct/);
    await expect(panel.locator(".prediction-explain")).toContainText("قاعدهٔ زنجیره");

    await page.reload();
    await page.locator('.lecture[data-lesson="1"] [data-action="predict"]').click();
    await expect(page.locator('.lecture[data-lesson="1"] .prediction input')).toHaveValue("29");
    await expect(page.locator("#prediction-count")).toContainText("۱ پیش‌بینی");
});

test("watched lectures and predictions drive the progress bar", async ({ page }) => {
    await ready(page);
    await page.locator('input[data-progress="1"]').check();
    await page.locator('input[data-progress="2"]').check();
    await expect(page.locator("#progress-label")).toContainText("۲ از ۸ جلسه");
    await expect(page.locator("#progress-bar")).toHaveAttribute("aria-valuenow", "2");
    await expect(page.locator("#progress-fill")).toHaveAttribute("style", /scaleX\(0\.25\)/);

    await page.click("#reset-progress");
    await expect(page.locator("#progress-label")).toContainText("۰ از ۸ جلسه");
    await expect(page.locator('input[data-progress="1"]')).not.toBeChecked();
});

test("the page keeps working when the browser blocks local storage", async ({ page }) => {
    await page.addInitScript(() => {
        Storage.prototype.getItem = () => {
            throw new Error("Storage blocked");
        };
        Storage.prototype.setItem = () => {
            throw new Error("Storage blocked");
        };
    });
    await ready(page);
    await page.locator('input[data-progress="3"]').check();
    await expect(page.locator("#progress-label")).toContainText("۱ از ۸ جلسه");
    await expect(page.locator("#lab-result .result-value dd")).toBeVisible();
});

test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("leaves the finished graph on screen without animating", async ({ page }) => {
        await page.goto(route);
        await expect(page.locator("#lab-result .result-value")).toBeVisible();
        const opacity = await page
            .locator("#graph-sheet .graph-node")
            .first()
            .evaluate(node => getComputedStyle(node).opacity);
        expect(Number(opacity)).toBe(1);
        await expect(page.locator("#graph-sheet .graph-node.is-output")).toHaveCount(1);
    });
});

test.describe("phone layout", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("stays usable and keeps every destination reachable", async ({ page }) => {
        await page.goto(route);
        await expect(page.locator("#lab-result .result-value")).toBeVisible();

        const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);

        for (const id of ["videos", "lab", "roadmap"]) {
            await expect(page.locator(`#${id}`)).toBeVisible();
        }
        await expect(page.locator(".karpathy-nav a")).toHaveCount(3);
        await expect(page.locator(".lecture")).toHaveCount(8);
    });
});
