import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: ".",
    outputDir: "./test-results",
    testMatch: ["source-s04-review.spec.js", "source-mobile-compact.spec.js", "source-mobile-recovery.spec.js", "source-lesson1-last.spec.js", "source-offline.spec.js", "source-annotation.spec.js", "source-typography.spec.js", "source-split.spec.js", "source-experiments.spec.js", "source-layout.spec.js", "isolation.spec.js", "deep-learning.spec.js", "danna-course.spec.js", "lesson-workshops.spec.js", "workshop-refinement.spec.js", "local-slides.spec.js", "interactive-workspace.spec.js", "notebook-studio.spec.js"],
    fullyParallel: true,
    reporter: "list",
    use: {
        baseURL: process.env.SITE_BASE_URL || process.env.RESEARCH_BASE_URL || "http://127.0.0.1:8000",
        browserName: "chromium",
        launchOptions: { args: ["--enable-unsafe-swiftshader"] },
        trace: "retain-on-failure",
    },
});
