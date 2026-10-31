# Interactive workspace acceptance — 2026-10-31

Scope: neuron/XOR, network playground and convolution. The source authority,
23 Persian decks, instructor credit and university logo remain as previously
published. No other project was modified. Full curriculum/source review remains
outside this increment.

## Finish review and verdict

Verdict: locally accepted for publication. The existing light/blue Arad identity
is retained. Settings, live view and commented Python form one workspace; tabs
and phone switches replace long stacked sections. Model-specific controls retain
their original applicability rules. Neural inspection and the explicit forward
animation show actual Python values, with keyboard and reduced-motion paths.

The bounded visual review inspected desktop, code-open, 1280px laptop and 390px
phone views. It found and resolved three material issues: imported framework
button styles overriding host styles, bidirectional negative/math values in the
inspector, and a framework 400px minimum clipping phone content. Contextual help
also has a fixed area so focusing a field does not move subsequent controls.
Confirmation views retained the approved identity and showed accessible panels.

## Local evidence

- 70 native Python tests pass, including gradients/optimizers, train/validation/
  test isolation and custom-forward grid/trace consistency.
- 15 shared publication/scope tests pass.
- The full 60-test browser suite passed against the built candidate. After the
  final phone minimum-width correction, the focused 12-test workspace/refinement
  suite passed against the final artifact. The phone guard checks the actual
  iframe viewport, not just outer-page overflow.
- Source editing tests freeze the real optimizer and change the real forward
  output to 0.25; both Python surface and topology follow the change.
- Tests preserve algorithm comments during GUI capture, compare the downloaded
  draft, and check the executed source and hash in the experiment record.
- Actual syntax-error and infinite-loop executions recover without losing the
  editor. Result-tab checks wait for real Shiny output, including convolution
  products and its final matrix.
- All 23 lesson workshops and local deck/offline bundle checks remain part of
  the full suite. No numerical assertion was removed to accommodate the layout.

Visual evidence was inspected from `/tmp/dl-workspace-confirm-*.png`; temporary
screenshots are local review aids and are not publication inputs. No shipping
raster was added. Existing university-logo provenance stays with its asset.

## Limits and publication boundary

Large networks/tables and long source files may scroll inside their panel. Code
uses a native textarea with line numbers and topic shortcuts; syntax highlighting
is not implemented. Editable custom math can invalidate the original model's
derivative/loss assumptions, which the code guide explains. Applying sources
starts a fresh run. Tab-scoped drafts require available session storage.

This record describes local evidence. PR CI, Pages deployment and checks on the
public URL must pass before announcing a live release; their run URLs belong in
the release PR rather than being inferred from these local results.
