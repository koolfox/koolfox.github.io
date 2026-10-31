# Source presentation refinement — 2026-10-31

Mode: Read. The reference is Danna Gurari's Spring 2022 original slide set,
not an invented presentation identity. All 23 covers were rendered and inspected;
representative content and formula/diagram pages were inspected at readable size.
The covers use a 960×540 white canvas, large plain topic titles, centered author
details, and an original CC BY notice. Content pages use simple headings, large
figures, nearby explanatory text and source credits. A visual master inspection
does not constitute full scientific review of all 1,595 pages.

## Delivery contract

Keep the 23 original PDFs byte-for-byte, including their figures, media references,
text and credit pages. The local PDF is the primary source, with its official URL
and SHA-256 recorded in the source identity register. Do not relabel it MIT or
infer a license version absent from its printed badge. Scientific corrections
remain separate source/page-specific notes.

Retain the existing 207-slide independent companion until the replacement scope
is settled. Match the source's plain white composition and restrained typography,
preserving Arad, RTL and the university/instructor identity. Translate the actual
cover titles and show their original English titles. Add canonical English terms
at first mention, skipping code, mathematical markup and HTML attributes.

Use authored LaTeX compiled with pinned KaTeX 0.19.1 to HTML and MathML. The
browser and ZIP use local CSS/fonts, with no math CDN or runtime script. A stale
LaTeX cache must fail the build. Regenerate with `npm ci --prefix
deep-learning/math-tools` then `npm run --prefix deep-learning/math-tools render`.

## Bounded finish review

The first review batch inspected a standard cover, the longest cover, bilingual
concept bullets, a fraction/matrix formula on desktop and phone, and the lesson
entry. The material corrections were mathematical type size, contrast of upcoming
progressive bullets, and natural height for long workshop slides. A fixed aspect
ratio had allowed the navigation footer to cover a run button; the existing
code/offline tests caught it and pass with the content-sized correction. The final
batch confirms the type, contrast and viewport fitting.
Code, questions, navigation, print and the offline package are functional gates.
Existing university-logo provenance stays authoritative; no invented raster was
added. Source PDF provenance is recorded independently for every file.

Local acceptance: 72 native model/content tests and 15 publication/scope checks
pass. The final four presentation browser checks pass, covering all 23 decks,
local source embedding, mathematical markup, code execution, feedback, keyboard
navigation, printing and a ZIP with external network blocked. Full CI and live
publication are separate gates, recorded in the release PR.

## Completion boundary

The current companion is independent teaching content, not a full translation of
the source PDF set. Full source translation requires an explicit scope choice
between replacing those 207 slides and translating all 1,595 original pages, plus
the requested choice of side-by-side or in-place Persian. Do not report the
1,595-page translation as complete based on this layout/source-preservation work.
