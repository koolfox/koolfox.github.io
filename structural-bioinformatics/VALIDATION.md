# Presentation validation

Validation date: 2026-10-13. This record describes the checked course presentation and its practical limits.

## Scientific code and source files

- Python 3.13: 24 offline tests passed; Ruff lint and format checks passed. Tests cover atom selection, alternate locations, occupancy, finite coordinates, contact-distance boundaries, provenance hashes and reference-sequence translation.
- The measured 3WD5 asymmetric-unit interface at `≤4.5 Å` contains 252 heavy-atom pairs, 40 residue pairs and 17 TNF residues. Sensitivity at 4.0/5.0 Å is documented alongside this result.
- Source, accession/version and SHA-256 accompany the small published sequences, structure payloads, figures, video and vendored rendering libraries. TNF/TOP2A CDS translations match the separately retrieved reference proteins.

## Website artifact

The intended public files were assembled with `scripts/build_pages.py` and served from that artifact. All 10 Chromium/Playwright tests passed. After correcting one stale document-link allowlist entry, the expanded Markdown navigation test passed again.

Checks cover all four molecular structures and real point counts, chain/residue controls, six-tab keyboard and hash navigation, Persian RTL with Arad, isolated Latin text, desktop/mobile layout, reduced motion, WebGL fallback, authentic FASTA downloads and T→U labeling. Reader checks render actual LaTeX and Mermaid, preserve deep links and follow relative document links. Failed FASTA/diagram requests leave other panels usable.

Fourteen fresh desktop/mobile captures cover every tab and the full mathematical method. Both full-method views show four display equations and one Mermaid diagram, with loaded fonts and no page errors or document-wide horizontal overflow. The molecular browser check uses Chromium's software WebGL renderer; this is not a certification of every user's GPU/browser.

The independent Impeccable finish review returned `ship`: both material findings from the prior review were resolved, and the expanded reader had no remaining material visual finding. The reviewed scope includes all fourteen captures and a decoded frame of the actual re-exported movie; third-party library internals and every possible browser state were not visually audited.

## Optional graphics tools

- ManimGX 0.1.1 exported the actual 3WD5 animation on macOS/Apple Silicon. The H.264 video is 1280×720, 30 fps, approximately 10.73 seconds. An actual decoded frame was inspected after harmonizing chain colors. Only camera and visibility change; this is not a dynamics simulation.
- The pinned Anatomy skill passed a separate projection/geometry smoke check and its official small example was inspected in light/dark themes at 1440/390 px, including keyboard and reduced-motion behavior. This does not certify every example, its experimental 3D mode or a comprehensive accessibility audit. Its mechanical demo is not presented as molecular data.

## Interpretation limits

Literature metadata, methods and claim attribution were checked against primary sources; published simulations, cell experiments and clinical outcomes were not independently reproduced. No gene-expression differential analysis or patient-outcome analysis is reported as executed. The SIRPG drug and knockout experiments do not establish adalimumab→TOP2A mediation. Neither structure contacts nor this presentation establish anticancer efficacy.

CI must pass for the actual PR head, and the Pages workflow must publish the actual merge commit. A local artifact or feature-branch push alone is not evidence that the public site has changed.
