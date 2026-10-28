import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: ".",
    testMatch: ["isolation.spec.js", "deep-learning.spec.js", "danna-course.spec.js", "lesson-workshops.spec.js"],
    fullyParallel: true,
    reporter: "list",
    use: {
        baseURL: process.env.SITE_BASE_URL || process.env.RESEARCH_BASE_URL || "http://127.0.0.1:8000",
        browserName: "chromium",
        launchOptions: { args: ["--enable-unsafe-swiftshader"] },
        trace: "retain-on-failure",
    },
});
