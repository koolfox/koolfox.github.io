# Native MNIST increment: design documentation acceptance

Recorded 2026-10-26 from implemented source and the supplied independent finish-review handoff.

## Disposition and documentation boundary

The native CNN/MNIST project entry is an ordinary extension of the established portfolio reading and laboratory world. Root [`DESIGN.md`](../../DESIGN.md), the course [`surface-brief.md`](surface-brief.md) and the existing course/laboratory surfaces remain its visual authority. No catalog world, approved comp, replacement identity or shipping raster asset was introduced. No token-bearing DESIGN.md or sidecar is required or produced; this report preserves the incumbent system.

The supplied independent reviewer’s final disposition is **SHIP at the scored-fix scope**. The model-column heading now stays aligned with its sticky row labels while the mobile table is panned to scrollLeft −300. Test accuracy and selected epoch retain the correct headers. The reviewer reported no observed regression and accepted all six recaptures. This is bounded design acceptance of the reviewed increment, not whole-course, cross-platform or deployment acceptance.

## Implemented design evidence

Checked the `mnist_page` and native entry in `deep-learning/scripts/build_course.py`, the command and reference-table rules in `deep-learning/assets/course.css`, PRODUCT.md, README.md, the explicit ZIP packaging in `scripts/build_pages.py`, the recorded results in `deep-learning/data/processed/mnist-reference.json`, and the publication log.

**Palette and type.** The page inherits local Arad, Persian RTL, white ground, blue actions, dark blue-gray text and quiet rules from the course. It adds no palette variables. Commands use isolated LTR monospace at .8rem/1.9, a pale inset background, 20px padding and 8px corners; long lines wrap. The reference table uses .82rem type, and numerical values use isolated tabular monospace. These observations describe the implementation rather than define new root tokens.

**Reading sequence.** The existing standalone reading column introduces a prediction, then a prominent blue ZIP download and explicit native CPU requirements. A numbered sequence separates the small installation smoke run from the full experiment; executable commands, checkpoint-selection explanation, recorded results and reflection follow in reading order. Browser execution is never implied for this native project. The site’s familiar disclosure keeps reference measurements available without making them the first action.

**Comparison table.** The six columns name model, parameter count, training accuracy, validation accuracy, test accuracy and selected epoch. Header and row-header scope attributes preserve the table’s semantics. A labeled, focusable horizontal-scroll region contains its 650px minimum width. Model row labels and the first column heading stick at logical inline-start on opaque white; the heading has the higher stacking order. That pairing preserves model identity and header correspondence while the remaining measurements scroll. Each cell keeps its value intact, with quiet bottom rules and 13px/12px padding. The page tells mobile readers to scroll the table horizontally.

**Inherited rules.** Local Arad and technical directional isolation, blue action emphasis, native links and disclosure, visible focus, restrained surfaces and reduced motion remain in force. The results are text and semantic tables; no decorative chart, invented live metric or new raster asset is introduced. The new command and comparison patterns are local components, not a replacement visual system.

## Review and validation evidence

Six final PNG captures are present in `.impeccable/review/mnist/`: `desktop-controls.png`, `desktop-results.png`, `desktop-full.png`, `mobile-controls.png`, `mobile-results.png` and `mobile-full.png`. The supplied handoff states that all six were opened and valid at desktop 1440px and mobile 390px widths. This pass inspected source and the evidence inventory; it did not repeat the visual review.

The single `detector.json` contains advisory inherited course typography differences only: 1.7rem, 2.05rem, 1.06rem, .72rem and .9rem relative to the root type ramp. No blocking detector finding is recorded. These findings do not warrant inventing a new token system or changing root values to make the report disappear.

The implementation handoff reports the ZIP browser test passing for the explicit package allow-list, manifest SHA-256 values, actual recorded metric table, links, mobile behavior and sticky-header assertion. Packaging source confirms that the ZIP includes the named scripts, guide, locked environment, data-source metadata, reference results and manifest; it does not bundle raw MNIST images or a local environment.

The handoff also reports 52 offline numerical checks passing, two identical native smoke runs, and completed five-epoch native CPU CNN and linear runs. The checked reference JSON records official-test accuracies of 98.02% and 92.11%, respectively, each over 10,000 test images, with epoch 5 selected for both. These are measurements from those particular stored runs. This documentation pass did not rerun training or the test suites. A clean locked Linux CI workflow exists according to the handoff but has **not yet executed**; neither Linux CI acceptance nor general cross-platform reproducibility is claimed.

## Interpretation and delivery limits

The page explicitly distinguishes smoke checks from full training, recorded measurements from a fresh browser run, and validation-selected checkpoints from final test evaluation. Its generator chooses the displayed training and validation metrics from each run’s selected epoch. The selected checkpoint minimizes validation cross entropy, which need not coincide with the highest accuracy or the final epoch. The copy states that the validation split is stratified at image level without claiming writer separation, and that tuning after inspecting the test does not create a fresh independent evaluation. One seed and protocol do not establish general architectural superiority.

At this report’s creation, the native MNIST project is **not yet public**. [`publication-log.json`](publication-log.json) records prior publication and live verification of the three Shinylive laboratories, most recently PR 56 and Pages run 40286211914. That release explicitly excludes a public CNN training project and measured MNIST result. Publishing this new download and page still requires a new successful deployment and live verification.

The current implementation handoff reports 3,515 reviewed source pages and 50 ready companion sessions. Those are a progress snapshot, not a publication claim or completion of the full 8,232-page goal. Remaining review, companions and laboratory work remain unfinished.

## Drift not canonized or repaired

Inherited course type-ramp advisories remain descriptive findings; no root tokens were changed to silence them. The reviewed table-header alignment defect is resolved in implementation and is not retained as a design rule. No unresolved material item is reported within the scored fix list. This documentation-only pass changes no implementation, scientific data, incumbent system file or concurrent work.
