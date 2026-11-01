# Danna course reading and practice surface

Mode: Read, with an Operate mode inside each laboratory. Build path: code.
The current source is Spring 2026, with unchanged originals beside aligned
Persian translation. The owner removed the independent lesson article and
settled four areas: slides, laboratory, questions, knowledge library. Earlier
semester routes remain historical context. Preserve the established identity.

## Direction contract

THESIS: The slide is the main teaching artifact. A reader, presenter or teacher
starts on it and opens an experiment, choice question or short definition only
when useful, without losing their source-page context.

OWN-WORLD: Local Arad, Persian RTL, the existing quiet blue and neutral light
palette. Plain reading columns, visible section navigation, technical expressions
isolated LTR. Source references occupy the margin, not the prose column.

STORY: Enter the current slide, move through its original and translation, then
optionally inspect code, answer a choice question or look up a term and return.

FIRST VIEWPORT: Compact course identity, university logo, four area controls and
page navigation frame the original slide and Persian translation. A requested
tool replaces the translation pane on desktop; mobile switches views. The
presentation control gives the original slide the full content area. No lesson
article or catalog stands between entry and the slide.

FORM: Four areas around the source slide; no visual-world replacement. Short,
commented notebook cells precede optional model sources. The signature
interaction is an explicit Python run whose weights, boundary and measured loss
update together. Saved versions and executable Jupyter exports support a learner
presenting and explaining the same computation.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Laboratory Operate refinement — 2026-10-31

The user asked for a more coherent, interactive laboratory with commented source
beside the result and less scrolling, using TensorFlow Playground as an interaction
reference. Keep the existing visual identity and course routes. Do not copy its
assets or replace real Python with a separate visual simulation.

The first viewport keeps run controls, metrics, settings and the selected result
visible. Desktop opens code to the left of the live viewer; narrow screens switch
between code/results and settings/visuals. Three tabs reveal detail progressively.
Focused settings explain their effect. The model graph is the primary neural
view, with selectable values and explicit forward animation. Convolution shows
the input and filter result before its product/pooling detail.

The operative contract is draft → explicit execution → actual Python result.
GUI capture, model reset, file reset, training pause and Worker stop must remain
distinct. Exported records identify the executed source. Numerical parity,
custom-source execution and recovery are acceptance gates. The finish record is
`interactive-workspace-acceptance.md`; extracted design rules are in the course's
`DESIGN.md` and `.impeccable/design.json`. No new raster asset was introduced.


## Slides and notebook extension — 2026-11-01

Mode: Read for the source slide; Operate for its optional notebook. Preserve the
incumbent blue/light/Arad/RTL world and authoritative university PNG. No visual
world replacement. The owner settled four areas: slide, laboratory, questions,
knowledge library. The source slide stays visible while a secondary tool is
open on desktop; phones switch views. Remove the independent lesson article
from the user journey. Optional tools never start Python during slide reading.
Notebook cells use readable comments and the same real numerical engine. Full
source, saved versions, errors, stop/recovery and exact Jupyter exports remain
findable without stacking a long page. All authored graded prompts are choice
questions; explained code tips replace essays. Source pages remain unchanged.

The owner subsequently requested Jupyter-style vertical cells, explicitly
removing the cell-selection dropdown. The notebook uses one scroll region with
every cell's labeled editor and actual output in order; run/stop and version
tools stay outside that region. Local Python highlighting, indentation and
name completion support editing. Ctrl+Space opens suggestions, Ctrl+Enter runs
through the focused cell, and Shift+Enter runs then focuses the next cell.

Suggestions now open automatically during typing, with local Jedi analysis of
the whole notebook, Python standard library and compatible installed packages.
Optional dependency installation is explicit, reports errors, and records exact
versions with saved code and Jupyter exports. A page-specific exploration button
exists only where the independently authored workshop has an exact source-page
reference. Its vector/matrix/table views are drawn from actual Python results;
selecting a value reveals its full number. The original remains untouched and
moving to another page closes this page-bound exploration.
