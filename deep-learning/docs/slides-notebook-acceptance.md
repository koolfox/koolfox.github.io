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

The earlier slide release at
`88864b4e1a883e86d0a578de9c8c008b6a47ebfa` was publicly verified (704 matched
files and 45 download-hash checks). That evidence does not publish this later
notebook refinement. Its full CI, merge, current public deployment and live
verification remain pending at this acceptance boundary. Original scientific
source is unchanged; the full independent scientific-claim review is not
complete. Neither local design acceptance nor source preservation claims that
broader audit is complete.
