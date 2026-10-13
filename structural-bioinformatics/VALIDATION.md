# Presentation validation

Validation date: 2026-10-13. This record describes the checked course presentation and its practical limits.

## Scientific code and source files

- Python 3.13: 42 tests passed; Ruff lint and format checks passed. Tests cover atom selection, alternate locations, occupancy, finite coordinates, contact-distance boundaries, provenance hashes, reference-sequence translation, independent analytic sphere/cap geometry for SASA and the real local preview CLI. The CLI test uses loopback HTTP only; no test downloads external data.
- The measured 3WD5 asymmetric-unit interface at `≤4.5 Å` contains 252 heavy-atom pairs, 40 residue pairs and 17 TNF residues. Sensitivity at 4.0/5.0 Å is documented alongside this result.
- Source, accession/version and SHA-256 accompany the small published sequences, structure payloads, figures, video and vendored rendering libraries. TNF/TOP2A CDS translations match the separately retrieved reference proteins.
- The supplementary static surface experiment used 100/480/960 deterministic sphere points. Its partial-interface convention `ΔSASA/2` is 785.892 Å² at 960 points; the tested numerical range is 0.355%, not a biological confidence interval. A whole-Fab 150 Å translation preserved all internal distances and removed cross contacts/burial. Actual runtime was about 25.89 seconds; no MD was executed.

## Website artifact

The intended public files were assembled with `scripts/build_pages.py` and served from that artifact. All 15 Chromium/Playwright tests passed, including guided class-step navigation, laboratory return and the rendered optional numerical report.

Checks cover all four molecular structures and real point counts, chain/residue controls, six-tab keyboard and hash navigation, Persian RTL with Arad, isolated Latin text, desktop/mobile layout, reduced motion, WebGL fallback, authentic FASTA downloads and T→U labeling. Reader checks render actual LaTeX and Mermaid, preserve deep links and follow relative document links. Failed FASTA/diagram requests leave other panels usable.

Twenty fresh desktop/mobile captures cover every tab, the full mathematical method, guided presentation steps and the numerical appendix. Both full-method views show four display equations and one Mermaid diagram; both appendix views show two display equations and the original measured plot. Fonts loaded without page errors or document-wide horizontal overflow. The molecular browser check uses Chromium's software WebGL renderer; this is not a certification of every user's GPU/browser.

The independent Impeccable finish review returned `ship`: prior material findings were resolved, and the expanded class reader had no remaining material visual finding. The latest reviewed scope includes all twenty captures and thirteen matching source/artifact targets; the prior review also inspected a decoded frame of the actual re-exported movie. Third-party library internals and every possible browser/lecture state were not visually audited.

## Foundational lessons and reference rendering increment

The new learning route defines cell, protein, receptor, gene/RNA and binding before the experimental detail. Four source appraisals distinguish Hu's structural/SPR anchor from the three recent computational, cellular and clinical papers. The latter's methods and denominators were checked against publisher/PMC full texts; the teaching odds-ratio example is explicitly fictional. This is source appraisal, not independent reproduction of those biological results.

The 3WD5 PDB is byte-identical to a fresh official RCSB download (410,994 bytes; SHA-256 in the viewer manifest). Its deposited assembly 1 uses the identity operator. Six recorded Cα positions have zero occupancy; the analytical trace uses 573 accepted protein positions, while the optional cartoon represents 579 recorded protein residues. Both display policies are stated in `docs/molecular-display-audit.fa.md`; neither reconstructs crystal-symmetry partners.

Mol* 5.13.1, its license and all four original coordinate files are local and checksum-verified. Browser checks block external origins, load all four cartoons, compare every analytical trace point with the loaded model coordinates (tolerance 0.001 Å), check author chains and first-model scope, exercise camera zoom/keyboard rotation, and recover from an unavailable PDB to the analytical trace. Rendering uses real coordinates; camera controls and the separate binding diagram do not simulate dynamics.

Twelve new desktop (1440×1000) and mobile (390×900) captures cover the binding schematic, blocked step, trace, cartoon, foundational lesson and Hu explanation. All captured states loaded without page errors or document-wide horizontal overflow. The same 15 browser checks passed against the assembled public artifact. This establishes coordinate agreement and our local rendering, not pixel identity with the live RCSB viewer or universal GPU/browser support.

## Optional graphics tools

The dependency-free `scripts/serve_local.py` assembles the same public artifact and serves it on loopback, with a macOS launcher and optional automatic browser opening. Its actual CLI was tested from another working directory on a free port; HTML, the guide, module, FASTA and Arad bytes matched the repository. Offline-browser validation blocks all external origins while using the local assets.

- ManimGX 0.1.1 exported the actual 3WD5 animation on macOS/Apple Silicon. The H.264 video is 1280×720, 30 fps, approximately 10.73 seconds. An actual decoded frame was inspected after harmonizing chain colors. Only camera and visibility change; this is not a dynamics simulation.
- The pinned Anatomy skill passed a separate projection/geometry smoke check and its official small example was inspected in light/dark themes at 1440/390 px, including keyboard and reduced-motion behavior. This does not certify every example, its experimental 3D mode or a comprehensive accessibility audit. Its mechanical demo is not presented as molecular data.

## Interpretation limits

Literature metadata, methods and claim attribution were checked against primary sources; published simulations, cell experiments and clinical outcomes were not independently reproduced. No gene-expression differential analysis or patient-outcome analysis is reported as executed. The SIRPG drug and knockout experiments do not establish adalimumab→TOP2A mediation. Neither structure contacts nor this presentation establish anticancer efficacy.

CI must pass for the actual PR head, and the Pages workflow must publish the actual merge commit. A local artifact or feature-branch push alone is not evidence that the public site has changed.

## Finish documentation: molecular reference increment

The independent finish reviewer returned `ship` for all twelve binding/blocked/trace/cartoon/basics/paper captures at desktop and mobile sizes, with no remaining material finding. The documentation pass confirmed the twelve evidence files and checked the finished HTML, binding schematic, reference-viewer styles and foundational lesson against `PRODUCT.md`, `docs/surface-brief.md`, `DESIGN.md` and its sidecar. Arad/RTL reading, blue controls, neutral surfaces, flat framing and existing control/stage radii remain the incumbent system. `DESIGN.md` and `.impeccable/design.json` were preserved because this is an ordinary extension. Existing local component shades and inherited portfolio shadows were not promoted to new tokens or repaired; they do not establish a new design direction. This records the local finish handoff, not a new deployment or scientific validation.

## Audience-facing slide presentation

The current class Markdown is a thirteen-section audience-facing presentation, shared by the reader and `presentation.html`. Rehearsal labels and self-assessment prose were removed. Relevant figures and the mechanism diagram appear inline; external reference links are in the last slide. The source still distinguishes structural, computational, cellular and clinical evidence.

All 18 Playwright tests passed against the assembled Pages artifact, including all thirteen slides at 1440×900 and 390×900 with external requests blocked, keyboard and source navigation, print visibility, failed-source recovery and the revised reader/laboratory return. The 42 Python tests passed; Ruff lint/format passed after formatting the edited build script. Twenty-eight captures cover all slides and the matching first reader chapter at both widths. Desktop slides have no horizontal or vertical page overflow; long mobile slides retain vertical scrolling. Chromium print produced exactly thirteen landscape pages; this is a browser-print check, not PowerPoint validation.

## Finish documentation: audience slides

The final reviewer handoff returned `ship`, scoped to resolving the two initial findings: digit-leading scientific identifiers and the awkward introductory disclaimer. The documentation pass confirmed all 28 desktop/mobile captures in `.impeccable/review/audience-slides/` and compared the presentation styles, shared text-direction handling and reader launch with `PRODUCT.md`, `docs/surface-brief.md`, `DESIGN.md` and its sidecar. The detector reported no primary failure; its font-size advisory was not promoted into a system rule.

Arad, Persian RTL with isolated Latin identifiers, blue actions, light surfaces and flat framing preserve the incumbent direction. The slide heading/body sizes, stronger local neutral shades and 44px controls are presentation-specific adaptations; they do not replace the reusable reading tokens. `DESIGN.md` and `.impeccable/design.json` remain unchanged. This records the local finish handoff and scoped fixes, not deployment verification or an exhaustive new visual audit.

## Academic presentation identity

The user-supplied logo and example establish the placement: logo at top left, institution/course at top right, short title at bottom right and autumn season at bottom left. The title slide uses the confirmed presenter حسام شینی and corrected supervisor دکتر فرزانه محمدی فارسانی. The provided Scholar URL is attached to the supervisor name; its profile contents were not independently verified. No presentation year was supplied or inferred. Original logo bytes are preserved, with SHA-256 recorded in `data/metadata/presentation.json`; CSS supplies its dark appearance on the light background.

The cover plus thirteen research chapters yields fourteen slides. Explicit chapter metadata preserves the reader return and launches the matching slide. All 28 desktop/mobile captures include the supplied academic identity; all desktop slides fit 1440×900 without page overflow. Browser print produced fourteen pages after reducing print-only scientific image height; the print body remains 18pt. Scientific calculations and source documents are unchanged.

## Finish documentation: academic identity

The independent reviewer returned `ship` for all fourteen desktop and fourteen mobile slide captures, with no material finding. The documentation pass confirmed those 28 evidence files, sampled both cover views, and checked the finished presentation HTML/CSS/JavaScript and identity metadata against `PRODUCT.md`, `docs/surface-brief.md`, `DESIGN.md` and its sidecar. The supplied logo copy matches the original bytes and recorded SHA-256; the root `uni-logo.png` and `sample.png` remain untouched. The confirmed names, quiet supervisor-profile link, four-corner identity and autumn without an inferred year follow the supplied direction.

Arad, Persian RTL with isolated Latin identifiers, blue actions, light surfaces and flat framing remain the incumbent system. Cover and projector type sizes are local presentation adaptations; detector type-ramp advisories were not promoted into new system rules. `DESIGN.md` and `.impeccable/design.json` remain unchanged. The handoff includes 42 passing Python tests, 18 passing browser tests against the assembled artifact and the fourteen-page browser-print count; this documentation pass records their reported results without rerunning them. Publication and live deployment verification remain a separate next step.
