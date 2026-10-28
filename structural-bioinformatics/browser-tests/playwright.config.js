import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: ".",
    testMatch: ["research.spec.js", "karpathy.spec.js", "course.spec.js", "deep-learning.spec.js", "danna-course.spec.js", "structural-lab.spec.js", "code-workbench.spec.js", "lesson-workshops.spec.js"],
    fullyParallel: true,
    reporter: "list",
    use: {
        baseURL: process.env.RESEARCH_BASE_URL || "http://127.0.0.1:8000",
        browserName: "chromium",
        launchOptions: { args: ["--enable-unsafe-swiftshader"] },
        trace: "retain-on-failure",
    },
});
