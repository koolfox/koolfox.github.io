# Slides and notebook extension: local acceptance

Date: 2026-11-01. Disposition: **ship for local design acceptance**. CI, merge,
Pages deployment and live acceptance of this refinement remain separate gates.

## Scope and authority

This is an ordinary extension of the incumbent blue/light/Arad/RTL course world,
not an approved system change. `PRODUCT.md` (current direction, November 1) and
`docs/surface-brief.md` define the four areas: source slides, laboratory,
multiple-choice questions and knowledge lookup. The independent lesson article
has been removed from the learner journey. Source slides are the default anchor;
desktop tools remain beside them and narrow screens switch views.

Reviewed artifact: `/private/tmp/danna-student-studio-v12`, source head
`a2c5c79acf8017668cf148a6da6900a356382919`. This acceptance records the finished
extension and the supplied independent finish-review disposition. The local
extension exemption in Impeccable `reference/new-work.md`, section 3, applies;
the implementation was code-led without a newly approved comp or visual world.

`DESIGN.md` and `.impeccable/design.json` remain authoritative and byte-for-byte
unchanged. Their SHA-256 values at this pass are:

| File | SHA-256 |
| --- | --- |
| `DESIGN.md` | `89dd683674f70e71386bb7c4b8427465b3d7f517e8a7858200932c8c9a88ccfa` |
| `.impeccable/design.json` | `9aa98cd491c4fa88acfd8d3bc7c3998707770ba2d38ec894b30ea8b114c0080d` |

## Observed system continuity

Source sampling covered `assets/course.css`, `assets/source-reader.css`,
`assets/practice.css`, `assets/notebook.css`, `assets/notebook.js` and
`runtime/network-playground/host.css` in the frozen artifact. The desktop source
reader and mobile notebook captures were also inspected directly.

- **Palette:** the laboratory host retains blue `#2563eb`, dark blue `#194fc3`,
  ink `#172134`, muted text `#526075`, divider `#dce2eb`, pale `#f4f6fa` and
  white. Notebook selection, run controls and focus reuse this vocabulary.
- **Type:** the host retains Arad at 14px/1.8, title 18px/1.5 and LTR code at
  12px/22px with Arad for Persian comments. Notebook cell headings are 12px;
  the source reader independently retains 17px/2 Persian copy and 23px/1.7
  translated headings, reducing on phones. These are observed surface styles,
  not additions to the normative type ramp.
- **Layout:** the source reader uses adjacent original/translation regions
  (1.15fr/1fr), with a 760px view switch. Optional notebook cells are stacked in
  execution order within one main scroll region; persistent run, version and
  dependency tools sit outside it. Individual output and large result regions
  retain bounded scrolling. No cell-selection dropdown remains.
- **Form:** flat pale panels, one-pixel dividers, 7px notebook/host controls and
  a 3px blue keyboard-focus outline with 2px offset continue the incumbent.
  Cell focus uses a 2px outline. No new decorative shadow or raster was added.
- **Continuing rules:** preserve identity; keep controls near actual results;
  distinguish draft from executed source; isolate LTR mathematics/code; keep
  controls relevant to the selected model. The sidecar's existing Numerical
  consistency rule remains applicable without amendment.

The exact instructor credit remains «استاد: دکتر نگار مجمع». The existing
`assets/university-logo.png` hashes to
`cd87307d6ac34e25eacd54a942b46f423eda8bb91712cc3bd1539dcfb85db220`;
no replacement identity asset was introduced.

## Accepted interactions and evidence boundary

Each native laboratory starts with four short commented cells; source-page
workshops retain their own statement-aligned cell grouping. Each cell has its
own run control and output, before optional full model sources. Actual
Python models drive the displayed scalar, table, matrix and vector values;
selection exposes the full value. Source-page exploration is offered only for
an exact workshop mapping and closes when the page changes. Presentation fits
the whole source PDF page. Reading alone does not start Python.

CodeMirror supplies local highlighting and indentation. Automatic Jedi
completion analyzes notebook definitions, standard library and compatible
installed packages without executing cells. Ctrl+Space opens suggestions;
Ctrl+Enter runs through the focused cell; Shift+Enter then focuses the next.
Explicit compatible-wheel installation uses the actual browser Python session;
saved versions and executable Jupyter ZIPs retain pinned requirements. Stop,
errors and recovery remain available. Authored graded questions are multiple
choice, essays become explained code tips, and original source questions stay
indexed unchanged.

Evidence supplied by the implementation/finish-review passes, without claiming
a second full rerun in this documentation pass:

- 131 native tests passed; all 354 KaTeX formulas rendered and vendor hashes
  passed. The frozen v11 browser suite passed 73 tests in 7.4 minutes with
  `CHECK_PYTHON_PACKAGES=1`; `/tmp/danna-final-browser-tests.log` ends with that
  result. v12 adds only the captured and reviewed mobile exploration-button
  wrapping fix; the full browser result belongs to v11.
- NumPy 2.0.2 installed and computed sum 6 in both practice and the actual native
  Shiny Python session. Exported requirements were pinned. An independent
  CPython execution of the Jupyter ZIP matched the plotted model.
- All 21 source readers and offline-ZIP workshops passed with external network
  blocked. The Spring 2026 source set remains 21 unchanged PDFs and 1,303 aligned
  Persian pages, preserving media, order, English terms and LaTeX.
- The independent finish reviewer returned **ship**, with no material fixes,
  after persistence, fidelity and ceiling review of all 12 captures in
  `../../.impeccable/review/notebook-python-tools/`: `desktop`, `mobile`,
  `questions-desktop`, `knowledge-desktop`, `practice-desktop`,
  `exploration-desktop`, `completion-desktop`, `presentation-1280`,
  `notebook-config-desktop`, `notebook-desktop`, `notebook-mobile` and
  `packages-desktop` (all `.png`). Capture sizes are 1440×1000 desktop,
  390×844 phone and 1280×720 presentation.

## Drift not canonized

The existing course stylesheet differs from the lab-oriented recorded tokens:
course blue `#245bdf`, line `#dce3ed`, soft `#f3f6fb`, 17px body and 8px buttons;
the reader also retains 6px controls. This pre-existing surface variation is
reported, not repaired or promoted into a new system. The detector record at
`../../.impeccable/review/notebook-python-tools/detector.json` contains 25 advisory
findings and no non-advisory findings: additional state/selection colors,
9–17px surface text sizes and 3px matrix-cell corners are outside the normative
token set. Existing prose already permits compact 10–13px labels, so an advisory
is not by itself a newly established defect. The 9px mobile help remains a
legibility caveat, not an endorsed future type token. No prohibition or token
was added to make findings disappear; no UI repair is authorized by this pass.

## Publication and scientific limits

Follow-up CI diagnosis: the 21-reader/workshop offline test's temporary HTTP
server left stderr unread. Its access-log pipe filled and the final workshop's
worker request stalled. A standalone probe reproduced blocking after 2,149
requests and recovered immediately when stderr was drained. Both temporary
bundle servers now drain stderr; the source-workshop assertion also reports
the session and actual Python status on failure. Readiness limits and expected
numerical results were retained. This is a test-harness change; the reviewed
public artifact and visual-system files are unchanged.

The subsequent v13 candidate changes only the optional package loader: Pyodide
0.27.7's normal dependency/integrity loader temporarily uses the matching CDN
channel, including shared-library ZIPs such as OpenBLAS, and restores the local
offline base on success or failure. Both restoration paths have regression
tests (133 native tests passed). The online package browser test passed for
NumPy in practice and the native lab. A separate real-browser scikit-learn 1.6.1
installation trained LogisticRegression on four synthetic OR training rows and
returned `[0,1,1,1]`, training accuracy 1, under Python 3.12.7. This is a package
execution check, not a generalization result. Visual composition is unchanged.

The earlier slide release at
`88864b4e1a883e86d0a578de9c8c008b6a47ebfa` was publicly verified (704 matched
files and 45 download-hash checks). That evidence does not publish this later
notebook refinement. Its full CI, merge, current public deployment and live
verification remain pending at this acceptance boundary. Original scientific
source is unchanged; the full independent scientific-claim review is not
complete. Neither local design acceptance nor source preservation claims that
broader audit is complete.

## Final source-citation and copy refinement

The source-citation finish reviewer returned **ship** for v14, with no material
fixes across all 14 captures in
`../../.impeccable/review/source-references-only/`. The subsequent frozen v15
artifact, `/private/tmp/danna-student-studio-v15`, retains that layout and narrows
the authored copy: catalog and source-page UI and displayed Python omit build
and review chatter, slide labels read «اسلاید», and the application's source
citation appears once in the concluding «منابع». Teaching comments and
synthetic-data assumptions remain. Original PDFs and Persian translation are
unchanged. These copy changes introduce no new visual-system rule;
`DESIGN.md` and `.impeccable/design.json` retain the hashes recorded above.

The final copy passed 133 native tests. The earlier full browser result remains
73 passing tests on v11. Separately, the latest head's full deep-learning check and Pages PR check succeeded (runs `41297571512` and `41297571539`); this does not
establish a v15 browser result. Focused browser checks for v15 have not yet been
reported at this update. PR #70 deployment and current live publication remain
pending. The v14 visual verdict, v15 native result, PR checks and publication
boundary are distinct evidence layers.

## Source-faithful typography extension — v26

Artifact: `/private/tmp/danna-student-studio-v26`. This local extension follows
the updated product and surface brief within the incumbent Arad/RTL/light
identity. `DESIGN.md` and `.impeccable/design.json` remain unchanged at their
recorded hashes. Observed renderer styles retain Persian body 17px/2 on desktop
and 16px/2 on phones; image labels are 16px, English terms are 1em, and lists
use semantic `ul`/`li` markup. Persian prose is RTL; numeric literals and
mathematics have explicit LTR treatment. Sparse atomic source-graph labels are
compact without changing their order.

Exact source-PDF metadata spans all 21 files and 1,303 pages: 7,846 of 10,755
lines have exact matches, including 3,200 styled lines: 1,985 whole-line colors, 145 bold,
12 italic and 1,100 partial-accent lines (these categories can overlap). Matching is not fuzzy.
Partial Persian least/most pairs have unique verified mappings; unmatched text
uses the incumbent default. Bright source accents are adapted for text contrast
of at least 4.5:1. These coverage counts do not claim recovery of every source
word's color. Original PDF bytes remain unchanged.

There are 45 newly explicit LaTeX expressions, 399 total; 14 date literals stay
literal, and two source errors receive scientific clarification. Static Python
tips use non-executing Lezer highlighting with code characters preserved;
the three actual notebooks retain execution. This does not claim reconstruction
of missing or unreadable image code or compatibility with every Python package.

Internal image-review notes for 50 pages are hidden from the learner UI;
42 image-label self-notes and old scientific-correction process suffixes were
removed from displayed copy. Provenance and audit records remain. Translation,
renderer and editor URLs carry hash queries to avoid stale caches.

Validation supplied for this increment: 139 native tests and all 399 formula
render/vendor checks passed; 14 focused v25 browser checks, including optional
NumPy, and five final v26 checks passed. The latter cover all 21 source readers
and 21 offline workshops, new typography/source fidelity, all three native
notebooks and static code highlighting. These focused results supplement the
earlier browser evidence; they are not a new full-suite claim.

Six viewport captures, `quality-bar.md` and `type-findings.json` are in
`../../.impeccable/review/slide-typography/`. The detector reports 21 advisory
findings and zero non-advisory findings; these observations do not amend the
normative tokens or canonize defects. The independent finish reviewer returned **ship**, with no material fixes
after reviewing all six captures. PR #71's notes-cleanup Pages CI passed; PR #72 for
typography has not yet been created. This entry records local evidence only,
without claiming typography publication or a completed independent scientific
audit.

PR #70 was subsequently merged and published as
`ff919052251c7534059d3990185906e294726ad1`: all 803 deep-learning manifest
records matched, 171 actual file hashes matched and 10 public browser checks
passed. This is release evidence for the notebook increment, separate from the
current typography increment.

## Source-fidelity refinement — 2026-11-02

The existing blue/Arad/RTL identity remains pinned. This increment adds checked
citation targets, semantic source tables, language selection during presentation,
source-frame playback and an independent WebGPU check of the s13 attention
example. It does not certify a spatial reconstruction of every Persian slide or
reproduction of all cited research models.

- Citation inventory: 258 extracted URL candidates, including PDF annotations.
  The recorded GET run returned 183 reachable, 25 missing, 49 inconclusive and one
  migration independently verified from the same author's TDS Archive article.
  Some candidates are truncated PDF text, not full URLs. 403/429 are not 404.
  Only recorded reachable/reviewed targets become reader links; other citations
  remain faithful plain text. The immutable PDFs retain their printed URLs.
- Forty tables on 37 pages were visually checked against the local source PDFs.
  Column order, precision, empty cells, merged headers and rowspans are explicit.
  The two mixed s17 tables use eighteen measured crops from the current source
  page canvas; photos and handwriting are not approximated or redrawn.
- Source-text truth tables consume complete mapped blocks; hidden extracted
  answers remain excluded. Scientific correction notes stay separate.
- Presentation retains English/Persian/paired views and access to mapped code.
  Phones retain language access. The s13 sequence plays actual pages 21–31 and
  stops on manual navigation, hidden document or switching sections. No video
  generation or 3Blue1Brown authorship is claimed.
- Attention WebGPU receives the inputs from the executed Python result, uses
  stable float32 softmax and displays the difference from Python. Source Q1 and
  edited Q2 passed through the actual WebGPU API on SwiftShader. This is a
  software adapter check, not a hardware GPU benchmark or a full Transformer.
  Unsupported devices report the missing adapter without a silent fallback.
- All 21 Spring 2026 Python workshop references were executed successfully.
  This proves agreement with the stored workshop references, not reproduction
  of a paper's training run, dataset, pretrained checkpoint or reported metric.

Review bounds: all newly structured table pages were visually inspected;
remaining pages were searched through existing source text/image-label records.
This is not a claim that every raster-only table or every translated spatial
relationship across 1,303 pages was visually re-reviewed. Full CNN/Transformer
checkpoint inference, whole-course spatial/media reconstruction and newly
produced explanatory films remain separate work. Missing model artifacts must
be identified before any research-reproduction claim.

Local validation and publication evidence for this candidate are recorded
separately; a commit or passing local check alone does not establish deployment.
