import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: ".",
    outputDir: "./test-results",
    testMatch: ["s05-source-pattern.spec.js", "source-s05-lenet.spec.js", "source-s05-training.spec.js", "source-s05-channels.spec.js", "source-s05-filter-steps.spec.js", "source-s05-convolution.spec.js", "source-s04-gru.spec.js", "source-s04-lstm-gates.spec.js", "s05-pooling-film.spec.js", "source-s05-opening.spec.js", "source-s04-derivatives.spec.js", "source-s04-variants.spec.js", "source-s04-cross-entropy.spec.js", "source-page-payloads.spec.js", "source-s03-start.spec.js", "s02-film.spec.js", "source-s04-review.spec.js", "source-mobile-compact.spec.js", "source-mobile-recovery.spec.js", "source-lesson1-last.spec.js", "source-slot-experiment.spec.js", "source-offline.spec.js", "source-annotation.spec.js", "source-typography.spec.js", "source-split.spec.js", "source-experiments.spec.js", "source-layout.spec.js", "isolation.spec.js", "deep-learning.spec.js", "danna-course.spec.js", "lesson-workshops.spec.js", "workshop-refinement.spec.js", "local-slides.spec.js", "interactive-workspace.spec.js", "notebook-studio.spec.js", "source-s04-mobile-reading.spec.js"],
    fullyParallel: true,
    reporter: "list",
    use: {
        baseURL: process.env.SITE_BASE_URL || process.env.RESEARCH_BASE_URL || "http://127.0.0.1:8000",
        browserName: "chromium",
        launchOptions: { args: ["--enable-unsafe-swiftshader"] },
        trace: "retain-on-failure",
    },
});
