---
name: "Structural Bioinformatics Research Atlas"
description: "Persian research reading with source-linked scientific media and an experimental-coordinate laboratory."
colors:
  accent: "#2563eb"
  link: "#245dc4"
  link-hover: "#164498"
  page: "#f5f5f7"
  surface: "#ffffff"
  text: "#111827"
  muted: "#536179"
  line: "#dce2eb"
  stage: "#f8fafc"
  field-text: "#172339"
  field-border: "#bec9d9"
  action: "#e9effd"
  action-hover: "#dce7fb"
  action-text: "#1e4ea9"
  disabled: "#edf0f4"
  selected: "#edf2fc"
  code: "#f0f3f8"
  reader-text: "#2d405e"
  quote: "#edf2fa"
  quote-rule: "#8da7cf"
  error: "#912c3d"
typography:
  display:
    fontFamily: '"arad", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(1.45rem, 2.7vw, 2.05rem)"
    fontWeight: 760
    lineHeight: 1.65
  headline:
    fontFamily: '"arad", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1.38rem"
    fontWeight: 720
    lineHeight: 1.6
  title:
    fontFamily: '"arad", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1.02rem"
    fontWeight: 680
    lineHeight: 1.8
  body:
    fontFamily: '"arad", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.8
  reader-body:
    fontFamily: '"arad", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "0.92rem"
    fontWeight: 400
    lineHeight: 1.8
  label:
    fontFamily: '"arad", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "0.8rem"
    fontWeight: 400
    lineHeight: 1.8
  control:
    fontFamily: '"arad", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.8
  tab:
    fontFamily: '"arad", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "0.88rem"
    fontWeight: 580
    lineHeight: 1.75
  sequence:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.88rem"
    fontWeight: 400
    lineHeight: 1.9
rounded:
  inline-code: "4px"
  color-input: "5px"
  field: "7px"
  control: "8px"
  stage: "12px"
spacing:
  micro: "4px"
  compact: "6px"
  control-gap: "8px"
  near: "12px"
  row: "16px"
  content: "20px"
  figure: "25px"
  panel: "30px"
  section: "66px"
components:
  button-action:
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-text}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "6px 13px"
  button-action-hover:
    backgroundColor: "{colors.action-hover}"
  button-toggle-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
  button-disabled:
    backgroundColor: "{colors.disabled}"
    textColor: "{colors.muted}"
  text-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.field-text}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "7px 10px"
  select-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.field-text}"
    rounded: "{rounded.field}"
    padding: "7px 10px"
  navigation-tab:
    textColor: "#445773"
    typography: "{typography.tab}"
    rounded: "0"
    padding: "13px 15px 11px"
  navigation-tab-hover:
    backgroundColor: "#eaf0fb"
    textColor: "#17489e"
  navigation-tab-selected:
    backgroundColor: "{colors.selected}"
    textColor: "#164cad"
  sequence-preview:
    backgroundColor: "{colors.stage}"
    textColor: "#1e3659"
    typography: "{typography.sequence}"
    rounded: "{rounded.control}"
    padding: "17px 20px"
  code-block:
    backgroundColor: "{colors.code}"
    rounded: "{rounded.control}"
    padding: "16px 18px"
  molecular-stage:
    backgroundColor: "{colors.stage}"
    rounded: "{rounded.stage}"
    height: "clamp(350px, 38vw, 455px)"
    width: "100%"
  diagram-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "15px"
---

# Design System: Structural Bioinformatics Research Atlas

## Overview

**Creative North Star: "Paper-like research reading"**

The implemented surface extends the portfolio's Arad typography, light neutral field and blue actions. It reads as a Persian research booklet: prose, scientific figures and fine separators carry the hierarchy, with small rounded controls where the reader can operate a view or choose a document.

The reading experience stays calm while the laboratory gives experimental geometry room to be inspected. Source links, captions, units and limitations stay adjacent to the material they explain. These are instructional conventions for this research surface; molecular colors and evidence types do not define a new site-wide brand.

**Key Characteristics:**

- Real Arad Persian typography with generous reading line height.
- Persian RTL composition with isolated Latin identifiers, sequences and mathematics.
- Blue actions and selected states on a light neutral field.
- Flat reading sections, fine separators and restrained rounded controls.
- Scientific media accompanied by source, representation and interpretation limits.

This document records `index.html`, `assets/research.css`, `assets/markdown-reader.js` and the inherited `../assets/css/styles.css`. The frontmatter is the normative visual token layer. The sidecar extends it with responsive behavior, motion and self-contained component previews; its synthesized tonal strips are preview metadata, not additional colors used by the page.

## Colors

The interface uses one blue action family against cool paper and white surfaces. Its quieter blue-gray text and separators support long reading without turning every content block into a card.

### Primary

- **Action Blue** (`accent`): pressed toggles, tab underline, keyboard focus, checkbox accents and text caret.
- **Reading Link Blue** (`link`, `link-hover`): source links and document navigation, with a darker hover state.
- **Quiet Action Blue** (`action`, `action-hover`, `action-text`): default utility buttons and their hover treatment.
- **Selected Paper Blue** (`selected`): selected tabs and the conceptual diagram's node fill.

### Neutral

- **Cool Paper** (`page`): the page field and sticky tab navigation.
- **White Surface** (`surface`): form fields, diagram panels, images and status overlays.
- **Reading Ink** (`text`, `reader-text`): inherited body text and the slightly softer long-document text.
- **Muted Ink** (`muted`): labels, captions, status text and secondary metadata.
- **Fine Separator** (`line`): reading rows, section boundaries and figure frames.
- **Laboratory Paper** (`stage`): molecular stage and sequence preview.
- **Field Ink and Stroke** (`field-text`, `field-border`): readable form values and persistent field boundaries.
- **Inactive Paper** (`disabled`): unavailable button state.
- **Code Paper** (`code`): code blocks and alternating data rows.
- **Quotation Paper and Rule** (`quote`, `quote-rule`): blockquotes; the same rule color outlines conceptual diagram nodes.

`error` is a local failure-state ink for inline errors and the laboratory's error status. It is not a second brand accent. Other exact component-specific colors remain in their component definitions rather than expanding the reusable palette with every one-off text shade.

**The Action Blue Rule.** Use blue to identify links, controls, selection and focus. Scientific chain colors keep their own source-specific meaning.

## Typography

**Display and Body Font:** Arad, loaded from the existing `/assets/fonts/arad.woff2` variable-font asset, followed by the system sans-serif fallback stack in the frontmatter.

**Sequence and Coordinate Font:** `ui-monospace, SFMono-Regular, Menlo, monospace`. KaTeX uses its bundled mathematical fonts inside isolated LTR expressions; Mermaid labels use Arad.

**Character:** Compact headings and spacious Persian prose establish a reading hierarchy without oversized promotional display text. Arad supplies both interface labels and the document voice; monospace is reserved for exact sequence and coordinate material.

### Hierarchy

- **Display:** the page title. On phones at the narrow breakpoint, it becomes (1.38rem) with line height (1.75).
- **Headline:** section headings. At the narrow breakpoint the size becomes (1.17rem), retaining the heavier weight and balanced wrapping.
- **Title:** paper titles. Markdown subheadings use a close local variant (1.03rem, weight 690).
- **Body:** the inherited reading baseline; introductory and explanatory paragraphs use nearby sizes appropriate to their role.
- **Reader body:** repository Markdown, with paragraphs and lists constrained to (75ch). It becomes (0.86rem) at the narrow breakpoint. Focused class chapters use a larger local variant (clamp(1rem, 1.4vw, 1.1rem)), keeping the same Arad voice, weight and line height.
- **Label and control:** compact annotations and operable controls; tab labels use the separate tab role and a selected weight (720).
- **Sequence:** exact sequence preview, with tabular numerals; it becomes (0.78rem) on phones. Coordinates use a smaller local monospace role (0.77rem).

**The Isolated Identifier Rule.** Keep Persian explanations RTL and wrap Latin identifiers with `bdi`. Sequences, code, coordinate values and mathematics retain their explicit LTR direction.

## Layout

Header, main content and footer share a centered outer width (1180px) and inline padding (28px). This leaves a usable desktop content width of (1124px). Inline padding becomes (20px) at (800px) and (17px) at (560px). The page uses logical margins and padding to preserve RTL behavior.

Reading content remains a single document flow. Regular sections are separated by (66px), becoming (48px) on phones; the active tab panel starts after (30px), becoming (24px). Figure, control and row gaps use the small observed spacing steps in the frontmatter. Long-document text is bounded to (1000px), with paragraphs and lists at (75ch); figures may occupy more width than the reading column.

Tab navigation is sticky at the viewport top. All six destinations occupy equal columns on desktop, changing to three columns and two rows at (800px). At (560px), tab gaps close, labels wrap and each tab has a minimum height (48px). Reader selectors stack, the chapter list becomes one column, paper summaries stack, and the interface media becomes a single column. Tables, code, sequences and display mathematics scroll inside their own region when required.

Focused class chapters keep the page title and all six tabs while hiding the site header/footer, supporting introduction, repeated booklet heading and description, document selector, field labels, chapter list and keyboard-help paragraph. The stage selector remains visible in one column with a maximum width (760px) and top margin (10px); the reading panel starts after (15px). Actions and their button group wrap with block margins (10px), and the first chapter heading starts after (16px). Class images retain their aspect ratio, use automatic width and a maximum height (42vh), and sit within smaller block margins (12px). Source/download links, the stage count and the visible study-view control remain beside the chapter.

The molecular stage uses the height token in the frontmatter and becomes (325px) on phones. Its toolbar wraps at the intermediate breakpoint; model identity, controls, legend and readout remain outside or beside the stage so the geometry is not covered by a dashboard overlay.

## Elevation & Depth

This research surface has no interface shadows. Depth comes from neutral surface changes, thin strokes and the spatial rendering inside the molecular view. The inherited portfolio stylesheet contains raised panels, but those panels are absent here and their shadows are not part of this scoped system.

**The Flat Reading Rule.** Use document flow and separators for reading material. Keep interface depth restrained; molecular lighting represents the scientific view rather than a reusable card effect.

## Shapes

Form fields and status overlays use gently curved corners; utility buttons, code and diagram frames use the slightly larger control radius. The molecular stage has the broadest radius. Inline code and color selectors use smaller corners. Tab buttons are square with a bottom selection stroke (3px), while ordinary reading rows have straight, full-width separators.

The shape vocabulary belongs to these actual roles. The page does not use pill chips or a generic card grid. Scientific media keep their native aspect ratio and receive only the framing appropriate to the figure or viewer.

## Components

### Buttons

Quiet, compact utility controls use the action surface and ink, a minimum height (40px) and the frontmatter's control padding. Hover changes the fill over (150ms ease) without moving the button. Pressed toggles use Action Blue with white text; unavailable buttons use inactive paper and muted ink. There is no separate permanent primary call-to-action on this surface.

Keyboard focus uses an outline (3px) in Action Blue with offset (4px). Phone laboratory buttons use a smaller local type size (0.76rem), inline padding (10px) and minimum height (39px).

### Inputs / Fields

White fields have field ink, a visible stroke (1px), the field radius and a minimum height (42px). Labels stay outside the field. Search retains its explanatory placeholder; selectors show real document, chapter, structure or evidence choices. Disabled fields become pale and muted. Keyboard focus uses the common visible outline.

Checkboxes keep the native checked indicator and blue accent. Chain color controls are real color inputs with their smaller radius, rather than decorative swatches.

### Navigation

The six-tab navigation is a document index. Default tabs have transparent fill; hover adds a pale blue fill; selection adds a stable bottom stroke, darker blue text and heavier weight. The common focus ring is inset with offset (-4px) so it remains visible in the sticky navigation. The implementation supplies tab semantics, keyboard navigation, hidden inactive panels and hash links.

The phone presentation keeps all six destinations visible in its three-by-two arrangement. It does not require horizontal scrolling to discover a tab.

### Reading Rows and Disclosures

Paper appraisals, source lists, molecular terms and evidence explanations use straight separators and aligned label/content columns. Paper appraisals use two columns on desktop and stack at the intermediate breakpoint. A disclosure is framed by upper and lower rules; its visible summary uses blue-gray text and a native marker. Optional advanced material starts closed; a selected sequence's limitations remain open beside that record.

### Course Outline and Coverage Rows

The weekly plan carries the course outline. A closed disclosure lists every syllabus block with its session range, the week that teaches it and how far this project reached the topics inside it; a link opens that week in the booklet. The week card then repeats that week's topics as reading rows: a leading coverage label, the syllabus topic wording, and one muted sentence about what this project actually holds for it. Four labels are used and they are content rather than color: «اجرا شده» (computed with real data), «بخشی» (partly covered), «مفهومی» (concept and boundary only) and «هنوز اجرا نشده» (planned, not run). The rows reuse the fine separator, the muted ink and the blue-gray label of the existing disclosures, and no new surface, accent or card is introduced. The booklet version of the same information is a table inside the reader's own scrolling region. The coverage record is the presenter's own account of the project, never a statement about the instructor's plan.

### Sequence and Code Panels

Sequence previews use the dedicated monospace role, a pale stage surface, visible border and control radius. They remain LTR, keyboard focusable and locally scrollable. Code blocks use code paper and local horizontal scrolling; inline code receives a small quiet fill. Source FASTA and Markdown downloads remain available beside the corresponding view.

### Executed Numerical Panels

The methods tab carries executed analyses as reading tables driven by a small processed record: the RNA-seq group summary and the docking validation gates. Each panel states its own limits next to the numbers, and a gate that failed stays visible as a failure in the local failure ink. A panel never summarises a mixed result as a pass, and the source record stays the single place the numbers live.

### Molecular Stage

The experimental-coordinate view is framed with a thin stroke and the stage radius. The static image remains an available fallback. Status, chain visibility/color controls, source accession, representation caveat and residue readout stay tied to the displayed structure. Movement controls affect the camera and visibility; the interface does not suggest molecular dynamics.

The source-specific molecular encoding is instructional, separate from the interface palette: in 3WD5, TNF uses teal (`#087b73`), Fab heavy chain uses orange (`#a95015`) and Fab light chain uses blue (`#245cb7`). In 1TNF, these colors distinguish its three protomers. In 4FM9, the TOP2A core is purple (`#7555a1`) and the two DNA chains are gold (`#aa6408`) and blue. Contact highlights use rose (`#bf3159`). Legends identify chains in text as well as color; these values are not universal molecular taxonomy or new brand colors.

The scene renders on demand, pauses while hidden and honors reduced motion. Interface transitions are also removed when reduced motion is requested.

### Research Booklet and Scientific Media

In study view, the reader places document/chapter selectors, previous/next controls, source/download links and a chapter list before the Markdown. Headings are deep-linked; formulas use actual KaTeX rendering and conceptual diagrams use Mermaid with Arad labels. A diagram has a white frame, caption and expandable source code. Optional renderer failures leave the original LaTeX or diagram source visible with a local note.

The class document adds a focused chapter variant of the same reader. Its nine numbered stages use “previous step” and “next step” controls, an accessible stage selector and a concise current-step count. PageDown/PageUp moves between stages while leaving editable fields alone; document and chapter remain in the URL, and laboratory inspection preserves the chapter for the return to reading. The introduction and full-document choice retain study view.

The visible “Study view” (`نمای مطالعه`) button uses the existing pressed blue treatment to identify the focused state. It restores the full notebook controls and supporting text without changing the selected stage; its label becomes “Presentation view” (`نمای ارائه`) for returning to the focused chapter. Figures, oral rehearsal notes and source links stay in normal document flow, using the same reading hierarchy and scientific-media framing.

Figures and video preserve their aspect ratio. Captions are small muted prose with source links and representation limits. Instructional diagrams remain distinguishable from experimental coordinates; the scientific claims and evidence constraints are governed by `PRODUCT.md` and the research methods rather than by this visual token system.

## Do's and Don'ts

### Do:

- **Do** use the existing Arad asset for Persian headings, prose and controls.
- **Do** retain Persian RTL layout and isolate Latin identifiers, code, sequences and mathematics.
- **Do** use blue interaction states and a visible keyboard focus outline.
- **Do** use fine separators and reading columns before adding another container.
- **Do** keep all six tabs visible on phones and allow wide scientific content to scroll within its own region.
- **Do** keep scientific figures near their captions, source links, units and interpretation limits.
- **Do** retain readable source or static fallback material when optional rendering is unavailable.

### Don't:

- **Don't** replace the established Paper-like reading direction or the Arad identity with a new visual brand.
- **Don't** treat molecular chain colors as global interface accents or universal biological categories.
- **Don't** move source identifiers or caveats away from the scientific material they explain.
- **Don't** turn local failures into an unusable whole-page state.
- **Don't** add compulsory camera animation or preserve transitions under reduced motion.

## Guided study route

The notebook now begins with one start/resume action above the incumbent six tabs. Eight learning sections lead to a separate rehearsal document and then slide one. A flat ruled list exposes the complete order; each active lesson names its exact reading chapters and a short recall exercise. The completion button records the learner's own reading status in browser-local storage, without grading or claiming validated knowledge. Lesson links preserve their context across chapters and glossary detours. Free library exploration and direct presentation remain available; advanced source selectors recede during guided study. Inline first mentions link to local glossary chapters in HTML, Markdown and slides, inheriting text color with a thin underline. Figures, diagram labels, code and citation links retain their existing behavior.

## Audience presentation refinement

The twenty-four-slide web presentation preserves Arad, neutral paper and blue controls. Desktop reading slides use 21–28px body text; media slides use 21–23px with 1.75 line height so a complete factual explanation, figure and source fit a 900px-tall viewport. Headings use 30–46px, with a 30–40px media variant; the existing cover uses 42–72px. Phone body text is 20px; 14px source notes and 16px captions remain secondary. These projector and media roles deliberately extend the notebook type ramp.

Short references form a full-width ruled row beneath the content. Tables use aligned headers and horizontal separators. A 44px-minimum button enlarges each figure in a native focus-contained dialog, with Escape and a labeled return button. Model buttons load the local Mol* deposited-coordinate view on demand inside that dialog; closing returns focus and preserves the current slide. The 3WD5 and 4FM9 scope stays in the caption. Mixed Persian/Latin Mermaid labels have explicit RTL SVG text and isolated Latin identifiers. Print omits interactive controls and retains the static scientific figure, caption and references.

## Research workspace restoration, 2026-10-24

Retain the established six-tab research workspace from 20 October: basics/learning, laboratory, sequences, literature, methods, and the document reader. Embed the nine syllabus chapters in the first panel; lesson, research and presentation belong to each topic. Keep direct tool access and the complete book selector. A shared chapter context and return link connect tools and books to the current lesson. Preserve Arad, RTL, scientific-media framing and keyboard tab navigation. Course CSS is scoped to the embedded lesson so it does not restyle the research workspace. There is one page, not a second course or embedded app.

## Independent sections, 2026-10-25

The user's latest direction supersedes the previous embedded workspace navigation. Preserve Arad, RTL, scientific figures and established colors. Use a quiet directory of descriptive rows on the homepage and normal page links for nine independent sections. Chapter navigation lives only in the course and topic selection in exercises/presentations. No global chapter context, tab switching or lesson/research/presentation phase controls. Resources open within the appropriate page, not an implicit course owner. Keep technical detail in the relevant tool or document rather than homepage navigation copy.

## General education and parallel research, 2026-10-25 clarification

The latest user clarification supersedes the nine-peer navigation. Use exactly two primary links: سرفصل آموزشی and پژوهش. Place the general docking workshop within education. Place project resources in research secondary navigation. Preserve Arad, colors and direct resource URLs. The course has independent prose and self-checks, with one optional link to its application in this study. Research chapter applications explain the concrete work and manuscript contribution; they never rewrite the public syllabus.

## Course reading refinement, 2026-10-28

The course surface uses Read mode and preserves its scientific sources. The selected topic is the visible primary heading; the generic course description and syllabus live in the reference disclosure. The chapter catalogue and current section map share one quiet navigation column. The full-text book link remains directly visible. Existing laboratory sections follow their examples while original section ids remain stable.

Course prose uses 19px on desktop, 18px on phones and a 2.05 line height, within 68ch. Explicit reading preferences use 21px or 23px. Compact navigation uses 0.85–0.96rem, with 44px controls; topic headings use clamp(1.5rem, 2.5vw, 2rem). These reading roles intentionally extend the research type scale. Inline scientific code remains isolated LTR. White paper, Arad and existing blue actions remain authoritative.

Native answer disclosures, code copy/selection feedback and figure enlargement support the existing content. Figure frames use the portfolio's 10px item radius; dialogs use 12px. Print retains answers and original figures. No decorative motion or automatically inferred learning progress is introduced.
