# Network playground increment: design documentation acceptance

Recorded 2026-10-25 from the implemented source and the supplied finish-review handoff.

## Disposition and documentation boundary

The network playground is an ordinary extension of the published neuron/XOR laboratory and the portfolio’s Arad/RTL world. Its quality reference is the inherited laboratory, root [`DESIGN.md`](../../DESIGN.md) and [`surface-brief.md`](surface-brief.md). No catalog world, approved visual comp or replacement identity was selected. This report introduces no normative tokens: no new DESIGN.md or design sidecar is required or produced, and incumbent files remain unchanged.

The independent reviewer’s final disposition supplied for this pass is **ship at the scored-fix scope**, not approval of the entire surface or curriculum. The mobile metrics grouping issue is resolved: four label/value groups remain distinct in a two-column grid. The reviewer found the updated evidence valid and observed no regression. The landing page’s earlier source-only evidence limitation was closed with actual desktop and mobile captures.

## Implementation evidence

Checked `deep-learning/playgrounds/network-playground/app.py`, `www/network.css`, `www/plot.js`, the shared `deep-learning/playgrounds/neuron-xor/www/lab.css`, the network landing template in `deep-learning/scripts/build_course.py`, and the network scope in PRODUCT.md and README.md. The source confirms these observed patterns:

- **Palette and materials:** the shared lab supplies blue `#2563eb`, ink `#172134`, muted `#566174`, white ground, `#dce2eb` rules and `#f4f6fa` inset surfaces. Whitespace and rules separate controls and results; authored shadows are absent. These are inherited implementation values, not a new token specification.
- **Type and direction:** local Arad carries Persian prose and controls; body is 16px/1.85, titles 1.75rem and section headings 1.05rem. Numeric readouts use monospace at 1.3rem. Below 760px, titles become 1.4rem and readouts 1.1rem. The main surface is Persian RTL, while feature expressions, numerical values and plots isolate LTR content.
- **Controls:** the three-column configuration grid becomes two columns on mobile. Conditional layer-width fields reflect the selected architecture. Data and learning settings use native disclosure; selectable features remain labeled checkboxes. Shared buttons and fields use 8px corners, a 44px minimum height and visible focus. Native select indicators survive the shared background-color styling. Reduced-motion behavior is inherited.
- **Results:** desktop plots sit in two columns; mobile results stack. The network-specific mobile rule makes the readout a two-column grid with 20px/24px gaps and wrapping values, preserving the four grouped metrics. The network diagram keeps a 700px minimum width on mobile within a focusable horizontal-scroll region and shows a scrolling hint, rather than shrinking every connection into the viewport.
- **Scientific graphics:** class marks use blue/white fill; training, validation and revealed test points use circle, square and triangle shapes. Training loss is a solid blue line; validation is dark and dashed. Negative connections are dashed and weight magnitude changes stroke width. Captions explain these encodings and the rescaled width range. Exact parameters are available through a disclosure; numerical metrics accompany the plots.
- **Landing:** the inherited standalone reading column leads from a prediction through a short experiment sequence to the live-runtime action, a Python-loading/browser-support note, evaluation boundaries and a reproducible engine link. It keeps the course’s reading-first hierarchy without adding a visual identity.

The inherited rules remain Arad/RTL with technical isolation, blue action emphasis, visible native affordances, textual state explanations and reduced motion. Synthetic data illustrations and computed canvas graphics serve the experiment; they are not new shipping raster assets.

## Review and validation evidence

The supplied review set is present in `.impeccable/review/network/`: `desktop-controls.png`, `desktop-results.png`, `desktop-network.png`, `mobile-controls.png`, `mobile-results.png`, `mobile-network.png`, `desktop-landing.png` and `mobile-landing.png`. The review handoff states all eight captures were opened against the preview on port 8773. This documentation pass checked the source and evidence inventory; it did not independently repeat the browser review.

One detector run is recorded in `detector.json`. Its two findings are advisory shared-stylesheet typography differences at 1.1rem and 1.4rem relative to the root type ramp. The detector does not supersede the bounded human-readable finish verdict.

The implementation handoff reports 66 portfolio browser checks passing; 38 numerical checks before subsequent convolution additions; and a broader run of 148 pytest tests plus 32 subtests passing. It also reports the browser network experiment at 13 epochs matching native Python weights, loss and canvas state, with download, final-evaluation sealing, reset, invalid-input and mobile checks. Those are supplied local validation results, not tests rerun by this documentation pass and not a claim that all broader checks belong to this lab.

## Delivery and scientific limits

At the time of this report the second, network playground increment is **not yet public**. The earlier foundational course and XOR increment has separate publication evidence in [`publication-log.json`](publication-log.json), identified by the handoff as PR 54 and Pages run 40185264692. That earlier deployment does not establish deployment of this lab. A successful new deployment and live verification are required before claiming this increment is public.

The lab exposes synthetic classification data, feature and architecture choices, training/validation measures and a final-test action that seals further training of that run. Its copy distinguishes unpenalized BCE from the optimizer’s penalized objective, warns that repeated tuning against the same test is not independent evaluation, and does not present synthetic results as real-world model performance. Network-playground does not simulate convolution, dropout, augmentation or batch normalization. These boundaries remain scoped to this lab even if separate laboratories are added elsewhere.

The full 8,232-page curriculum review, remaining companions and other laboratories remain unfinished. The local tests and scored-fix verdict do not establish complete curriculum, scientific or deployment acceptance.

## Drift not canonized or repaired

The advisory 1.1rem/1.4rem mobile typography differences are inherited from the shared XOR stylesheet. They are recorded without changing root tokens to silence the detector or repairing shared code during documentation. Technical canvas labels use system-ui in the plotting implementation; this does not establish a system display face for headings. No new visual-system rule or prohibition is derived from those implementation details. No unresolved material item is reported within the supplied scored fix list; this report does not expand that finding into a whole-surface audit.
