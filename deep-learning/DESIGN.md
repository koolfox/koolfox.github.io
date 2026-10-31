---
name: Deep Learning Course
description: Persian lessons and live Python workshops within the existing portfolio identity
colors:
  accent: "#2563eb"
  accent-dark: "#194fc3"
  ink: "#172134"
  muted: "#526075"
  line: "#dce2eb"
  soft: "#f4f6fa"
  canvas: "#ffffff"
  editor-panel: "#f7f8fb"
typography:
  body:
    fontFamily: "Arad, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: 1.8
  title:
    fontFamily: "Arad, system-ui, sans-serif"
    fontSize: "18px"
    lineHeight: 1.5
  code:
    fontFamily: "ui-monospace, Arad, monospace"
    fontSize: "12px"
    lineHeight: "22px"
rounded:
  control: "7px"
spacing:
  tight: "8px"
  panel: "16px"
  wide: "20px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
    height: "40px"
---

# Design System: Deep Learning Course

## Overview

The established Persian course identity remains authoritative: local Arad,
RTL prose, quiet blue actions, white reading/visualization areas and pale neutral
settings. The laboratory is a place to inspect and change a real calculation.
The TensorFlow Playground reference informs the proximity of controls and
results; its branding and assets are not used.

This is an extraction from the shipped course and current laboratory artifact,
not a new visual direction. Exact instructor credit is «استاد: دکتر نگار مجمع»;
the university logo is the existing PNG with its source/provenance sidecar.

## Colors

Blue identifies primary actions, selected tabs and focus. Ink and muted text
carry hierarchy; fine line borders separate adjacent functional areas. Source
code sits on white within a pale panel. Plot class/weight colors are meaningful
data encodings and retain their legends; do not recolor them decoratively.

## Typography

Arad carries Persian headings, labels and prose. Code is LTR monospace with Arad
for Persian comments. Numeric expressions in RTL text use isolation (`bdi` or
an explicit LTR region) so negative signs and ordered coordinates remain clear.
Compact lab labels use 10–13px, while full lessons retain their reading styles.

## Layout

Course lessons retain their reading layout. The live labs use a full-height
workspace with a persistent header/status area and internal panel scrolling.
The settings column is 238px, reducing to 210px below 1180px. Result tabs sit
above the visualization. At sufficient width, network and decision view share
the overview; otherwise result detail is available in its own tab.

The desktop source panel takes 37% (minimum 370px), becoming 43%/330px below
1051px. At 760px and below, code replaces the result view. Inside the app,
650px and below switches settings and visualization instead of stacking them.
Allow native content to fit the viewport; framework minimum widths must not
clip the viewer. Contextual help occupies a stable 110px area beneath fields.

## Elevation & Depth

The workspace is flat. Pale surfaces and one-pixel dividers communicate grouping;
there are no floating card shadows. Selected neuron outlines, active tabs and
focus rings communicate state without turning every control into an accent.

## Shapes

Controls and source/inspector surfaces use the observed 7px radius. Workspace
regions meet at plain edges. Graph nodes keep their scientific circle/connection
geometry; matrices retain compact aligned cells and selected-cell emphasis.

## Components

Primary actions are blue; secondary controls remain white with a thin border.
Visible keyboard focus uses a 3px accent outline with 2px offset. Tabs expose
selection with an underline and text weight, plus roving arrow-key focus.

The code drawer contains a topic selector, source path, line numbers, editable
source, explicit apply/capture/reset/download actions and a collapsible primer.
Draft and executed-source states remain visible and distinct. Errors open the
console and preserve editing. Stop remains available during a blocked Worker.

The graph allows pointer/keyboard neuron inspection, actual incoming parameters
and a chosen dataset probe. Forward animation starts explicitly; reduced motion
reveals values immediately. Convolution selection and its numeric coordinates
refer to the same output cell, with real products in the calculation tab.

## Do's and Don'ts

- Do preserve the course identity, authoritative logo and exact instructor text.
- Do keep controls near the output and explain their subject-specific effect.
- Do render neural grids/traces from the executed Python source.
- Do preserve errors, pending drafts, focus and reduced-motion paths.
- Don't display architecture controls for a model that does not use them.
- Don't hide ordinary source access behind downloading an unrelated archive.
- Don't turn layer animation into a claim about physical propagation speed.
- Don't substitute a decorative JS model when the learner edits Python.
