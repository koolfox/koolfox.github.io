import { expect, test } from "@playwright/test";

test("the retired replay and its exclusive assets are absent from publication", async ({ request }) => {
    for (const path of [
        "replay.html",
        "assets/js/course.js",
        "assets/js/engine.js",
        "assets/css/course.css",
        "assets/data/gates.json",
    ]) {
        expect((await request.get(`/deep-learning/${path}`)).status(), path).toBe(404);
    }
});

test("current course entry points lead to live laboratories without replay links", async ({ page, request }) => {
    for (const path of ["/deep-learning/", "/deep-learning/playgrounds/"]) {
        await page.goto(path);
        await expect(page.locator('a[href*="replay.html"]')).toHaveCount(0);
    }
    for (const lab of ["neuron-xor", "network-playground", "convolution"]) {
        const path = `/deep-learning/playgrounds/${lab}/`;
        await expect(page.locator(`a[href="${path}"]`)).toHaveCount(1);
        expect((await request.get(path)).ok(), path).toBe(true);
        expect((await request.get(`/deep-learning/runtime/${lab}/index.html`)).ok(), lab).toBe(true);
    }
});
