# Convolution increment: design documentation acceptance

Recorded 2026-10-26 from implemented source and the supplied independent finish-review handoff.

## Disposition and documentation boundary

This is an ordinary extension of the portfolio’s Arad/RTL laboratory world. Its visual authority is root [`DESIGN.md`](../../DESIGN.md), the course [`surface-brief.md`](surface-brief.md), and the incumbent XOR and network laboratories. No catalog world, approved comp or replacement identity was selected. No token-bearing DESIGN.md or sidecar is required or produced. This report describes the increment without changing the incumbent system.

The independent reviewer’s supplied disposition is **SHIP**, with no material fixes identified in the reviewed desktop/mobile controls, results, calculation and landing views. That is bounded design acceptance for the captured convolution increment, not complete curriculum, scientific or deployment acceptance. The reviewer found the selected output cell consistent with its highlighted input patch, all nine products and bias readable at both breakpoints, and the rounding, padding, pooling, manual-weight and synthetic-data limits explicit.

## Implementation evidence checked

The documentation pass checked `deep-learning/playgrounds/convolution/app.py`, `www/convolution.css`, `www/lab.js`, shared `deep-learning/playgrounds/neuron-xor/www/lab.css`, the convolution landing template in `deep-learning/scripts/build_course.py`, PRODUCT.md, README.md and the publication log. These are the observed implementation patterns, not a new normative token specification:

- **Palette and depth:** shared blue `#2563eb`, ink `#172134`, muted `#566174`, white ground, `#dce2eb` rules and `#f4f6fa` inset surfaces. Matrix selection and the active input patch use pale blue `#dbe8ff`; selected output adds an outline, while padding uses dashed borders. Layout and rules provide separation without authored shadows.
- **Type and direction:** local Arad carries Persian headings, prose and labels. Shared body is 16px/1.85; headings are 1.75rem and 1.05rem. Matrix numbers use tabular monospace at .75rem; captions are .8rem. The calculation uses .9rem type, 2.2 line height, wrapping and no maximum height. Shared mobile titles/readouts retain 1.4rem/1.1rem. Matrices and technical expressions isolate LTR content within the RTL surface.
- **Controls:** shared configuration fields retain native select affordances, 8px corners, 44px minimum height and visible keyboard focus. Nine editable weights sit in a three-column grid inside native disclosure. Row and column fields plus a next-cell action duplicate direct output-cell selection. Output cells are compact native buttons with accessible row/column/value labels, pressed state and a visible focus outline; they are not presented as full-size action buttons.
- **Responsive arithmetic:** three operation columns become two below 1000px, with the final section spanning that row; below 700px all three sections stack. Each matrix has its own labeled, focusable horizontal-scroll region. Mobile selection controls retain two numeric fields and place the next-cell action across the row. Readouts become two columns. This preserves readable numerical cells instead of shrinking the whole matrix to fit.
- **Inspectability:** input patch highlighting follows selected output position and stride. The output matrix, activation/pooling matrix and explicit product calculation remain distinct. Padding is labeled and dashed; matrix captions explain their roles. JavaScript forwards cell selection to Shiny and exposes/clears the received calculation state; Python supplies the arithmetic and rendered tables. Reduced-motion behavior remains inherited.
- **Landing:** the inherited standalone reading layout introduces a prediction, a short experiment sequence, the live-runtime action and loading/browser requirements, followed by the operation’s limits and reproducibility link. No new heading kicker, decorative icon system or raster treatment is introduced.

The inherited rules remain local Arad, Persian RTL with isolated technical content, blue action emphasis, visible native controls, explicit state explanations and reduced motion. Matrix highlighting communicates the computation rather than a decorative identity change.

## Review and validation evidence

Nine final review PNGs are present under `.impeccable/review/convolution/`: `desktop-controls.png`, `desktop-results.png`, `desktop-calculation.png`, `mobile-controls.png`, `mobile-input.png`, `mobile-results.png`, `mobile-calculation.png`, `desktop-landing.png` and `mobile-landing.png`. The supplied reviewer handoff states that all nine were opened and valid. This documentation pass inspected the source and capture inventory; it did not repeat the visual review. These are review evidence, not shipping raster assets; the increment introduces no new shipping rasters.

The single supplied `detector.json` records advisory findings only: the pale-blue highlight, .9rem calculation type, and shared 1.1rem/1.4rem mobile type differ from the root token record. There are no blocking detector findings. These advisories do not establish new global tokens or override the scoped reviewer verdict.

The implementation handoff reports a passing browser test taking approximately 4.4 seconds: raw outputs, all products, kernel flipping, ReLU and max/average pooling agree with native Python; cell click, selection clamping, download, invalid-input clearing and mobile behavior also pass. It reports five core convolution tests and 44 deep-learning numerical tests passing before four subsequent MNIST tests were added. These are supplied local validation results, not suites rerun here; the later MNIST additions are outside this report’s acceptance scope. Concurrent research drafts may temporarily affect the global content validator; this pass neither claims global validation is clean nor modifies those drafts.

## Scientific and publication limits

The surface computes a manually selected 3×3 single-channel filter on a synthetic 8×8 image. It distinguishes cross-correlation from mathematical convolution through optional kernel flipping, explains zero padding and output-size rounding, and states that unpadded pooling discards incomplete trailing windows. Every selected cell exposes nine products plus bias. Weight and bias counts are distinguished from direct multiplication counts. Display rounding is separate from the precise downloadable calculation. The lab does not train weights or classify images; no learned-CNN or real-world performance claim follows from these arithmetic demonstrations.

At this report’s creation, the convolution live laboratory is **not yet public**. [`publication-log.json`](publication-log.json) records the earlier XOR and network releases, including PR 55 and successful Pages run 40282834039 with live verification of the second lab. That record explicitly excludes the convolution live laboratory from the release. Earlier publication does not prove deployment of this increment; a new successful deployment and live check remain necessary.

The complete 8,232-page review, remaining companions and other laboratories remain unfinished. The review and local numerical/browser checks establish only their stated scopes.

## Drift not canonized or repaired

The pale-blue matrix highlight and .9rem calculation size, plus inherited 1.1rem/1.4rem mobile type, remain recorded advisory differences from root tokens. They are not promoted to global rules or changed merely to silence the detector. No unresolved material design fix was supplied for this increment. This documentation-only pass preserves shared implementation, incumbent design files and concurrent research work.
