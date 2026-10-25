# Danna course increment: design documentation acceptance

Recorded 2026-10-25 from the implemented source and staged Pages artifact.

## Disposition and documentation boundary

This is an ordinary reading/practice extension of the established portfolio world, not an approved replacement identity. The governing system remains [`../../DESIGN.md`](../../DESIGN.md). No token-bearing `deep-learning/DESIGN.md` or `.impeccable/design.json` is required or produced for this increment. The root system is preserved; its sidecar is absent. This report is descriptive evidence, not a competing normative token source.

The surface contract pins semester → lesson → experiment, local Arad, Persian RTL, quiet blue/light materials, source references beside the desktop reading column and above it on mobile. Those commitments are visible in the implementation. Page composition and course delivery state remain in the surface brief and PRODUCT.md rather than becoming global design rules.

## Source evidence checked

- Root `DESIGN.md`; `deep-learning/PRODUCT.md`; `deep-learning/docs/surface-brief.md`.
- `deep-learning/assets/course.css`, `deep-learning/assets/course.js`, the hub `deep-learning/index.html` and the source-panel, lesson-heading, worked-example, exercise and session templates in `deep-learning/scripts/build_course.py`.
- `deep-learning/playgrounds/neuron-xor/app.py` and `www/lab.css`: live controls, readouts, results table, plots, disclosure and interpretation.
- Staged `/tmp/danna-migration/pages/deep-learning/index.html` and `assets/course.css`; the staged course stylesheet matches the source byte for byte.

## Implemented visual system

**Palette.** White reading ground, dark blue-gray text, quiet rules and pale inset surfaces; blue identifies actions and references. The course CSS currently uses accent `#245bdf`, ink `#172134`, muted `#526075`, line `#dce3ed` and soft `#f3f6fb`. The lab retains the root accent `#2563eb` with its own neutral values. Green completion and red incorrect-answer feedback are semantic states, accompanied by text. These are observations, not new root tokens.

**Type.** Local Arad carries Persian headings, prose and controls; isolated technical expressions and numerical readouts use monospace. Course body is 17px/1.95, becoming 16px on mobile; ordinary headings use a 1.9–2.8rem clamp, 1.42rem and 1.13rem hierarchy. Lesson titles are 2rem, then 1.7rem; lesson paragraphs use 2.05 line height. Lab body is 16px/1.85, with 1.75rem titles becoming 1.4rem. These reading-specific sizes differ from the incumbent root density.

**Reading and navigation.** The course shell caps at 1180px. Semester and session lists use ruled rows. Desktop lessons pair a 250px source margin with a reading column capped at 760px; the source margin becomes 210px below 900px and flows above the lesson below 700px. Breadcrumbs carry semester context. Worked-example and exercise headings carry their own meaning without above-heading labels.

**Controls and depth.** Surfaces use whitespace, hairline rules and pale fills without authored shadows. Course and lab action buttons use 8px corners; course answer inputs use 6px. Main actions have a 44px minimum height and visible three-pixel keyboard outlines. Native disclosure markers remain; lab select styling preserves the framework dropdown indicator by setting background color without resetting its background image. The lab collapses its results grid below 760px and retains text/table equivalents for plotted values.

**Inherited rules.** Arad and directional isolation; one action accent; real visible states; reduced motion; no above-heading kickers or authored Unicode navigation icons. The implementation retains ordinary text navigation, semantic form controls, textual answer feedback and an explicit local-storage recovery message. Native control indicators are functional affordances, not prohibited glyph decoration.

## Acceptance evidence and limits

The implementation handoff reports the independent finish reviewer’s disposition as **ship at the fix-list scope**: dropdown indicators restored, above-heading kickers removed with semester context moved to breadcrumbs and authorship to source prose, authored glyph navigation icons removed, and stale delivery claims corrected. The handoff reports 64 portfolio browser tests and 30 numerical/provenance tests passing locally. This documentation pass inspected implementation evidence; it did not rerun those suites or independently repeat the finish review.

The ten supplied review captures are present under root `.impeccable/review/`: `desktop.png`, `mobile.png`, `lesson-desktop.png`, `lesson-reading-desktop.png`, `lesson-mobile.png`, `lesson-exercise-mobile.png`, `lab-desktop.png`, `lab-desktop-results.png`, `lab-mobile-controls.png`, `lab-mobile-results.png`. They are review artifacts, not shipping raster assets. This increment adds no shipping raster assets requiring generation provenance.

Acceptance applies to the foundational course increment. The full 8,232-page review, remaining Persian companions, topic laboratories and heavy reproducible experiments remain unfinished. Local evidence does not establish publication; successful Pages deployment and a live check are separate requirements.

## Drift not canonized or repaired

The source carries residual unused `.eyebrow` styling; it is not a reusable heading pattern. Course accent/neutral values, reading density, 6px inputs, 8px action buttons and responsive breakpoints differ from exact root values. Root prose also still describes a wholly static, no-build/no-framework portfolio, while this course uses generation and Shinylive. These differences are recorded without rewriting the incumbent system or legitimizing them as future global rules: this task authorizes an ordinary-extension report, not a system migration or implementation repair. The supplied finish review has no unresolved material fix-list item; this note does not enlarge that verdict into a complete course or whole-site audit.
