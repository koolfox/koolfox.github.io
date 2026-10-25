# Course authoring and review contract

This is development guidance, not a browser-delivered document. The approved
product direction and original-slide licensing decision remain in PRODUCT.md.

## Shared, independently authored lessons

Write `content/concepts/<id>.json` with the following schema. Content is original
Persian teaching, not a slide-by-slide translation or a close paraphrase. Explain
notation before use and preserve Latin/math runs for the renderer to isolate.

```json
{
  "schema_version": 1,
  "id": "artificial-neuron",
  "title_fa": "نورون مصنوعی و یادگیری پرسپترون",
  "summary_fa": "...",
  "prerequisites_fa": ["..."],
  "objectives_fa": ["..."],
  "sections": [
    {"id": "weighted-sum", "title_fa": "...", "paragraphs_fa": ["..."],
     "formulas": [{"expression": "z = w₁x₁ + w₂x₂ + b", "explanation_fa": "..."}]}
  ],
  "worked_examples": [
    {"id": "one-update", "title_fa": "...", "question_fa": "...",
     "steps_fa": ["..."], "answer_fa": "...",
     "verification": {"kind": "python", "code": "assert 2 + 2 == 4"}}
  ],
  "glossary": [{"term_fa": "...", "term_en": "...", "definition_fa": "..."}],
  "exercises": [
    {"id": "predict-one", "prompt_fa": "...", "hints_fa": ["..."],
     "solution_fa": "...", "source_kind": "original",
     "answer": {"kind": "number", "value": 4, "tolerance": 0}}
  ],
  "lab_ids": ["neuron-xor"],
  "reflection_fa": ["..."],
  "limitations_fa": ["..."],
  "references": [{"title": "...", "url": "https://..."}]
}
```

Use actual computed examples. `answer.kind` may be `number`, `choice` (include
`options_fa` and zero-based `correct_index`), or `manual` (include a clear solution
and evaluation criteria). The original exercise label is mandatory. At least
one numerical/checkable exercise and one explanation/transfer question per lesson.
Content length is determined by the concepts, not a template word count; a title
and a few generic sentences do not constitute a complete lesson.

## Per-semester lesson mapping

Write `content/terms/<term_id>/<session_id>.json`:

```json
{
  "schema_version": 1,
  "term_id": "spring-2026",
  "session_id": "s02",
  "concept_ids": ["artificial-neuron"],
  "source_guides": [{"url": "https://...", "sha256": "...",
    "ranges": [{"start": 1, "end": 4, "topic_fa": "..."}]}],
  "differences_fa": ["..."],
  "additional_exercises": [],
  "review_file": "data/reviews/spring-2026/s02.json"
}
```

Page ranges point to the actual semester PDF, use 1-based PDF page order, and
cover the relevant material. Never manufacture equivalence from shared titles.
The official course dates/Canvas task labels are read from the source catalogue.
Missing official materials are not invented. Readiness is computed from evidence;
authors must not manually set `published` or `browser_verified`.

## Page review records

`data/reviews/<term_id>/<session_id>.json` is initialized with all source pages
pending by `scripts/review_ledger.py`. Reviewers only update assigned files.
Read all text in bounded batches; render and inspect every page (contact sheets
are useful for structure, but zoom diagrams/formulas when needed). Mark only the
checks actually performed. Text extraction is not text review; opening a PDF is
not visual review. Avoid publishing full extracted text or slide screenshots.

For each `pages` record, set:

- `text_reviewed`: true only after reading that page; image-only pages still need
  `visual_reviewed` and a note explaining the lack of extractable text.
- `visual_reviewed`: true only after viewing its rendered image (alone or in a
  legible contact sheet); record `visual_evidence` as the local image path.
- `scientific_status`: `checked`, `context_only`, `needs_verification`,
  `clarification`, or `verified_error`. Default is `pending`.
- `note_fa`: a brief original review observation, not a translation of the slide.
- `concept_ids`: concepts to which this page contributes; administrative pages
  can use an empty list and `context_only`.
- `evidence_urls`: sources needed to verify nontrivial corrections, dates or claims.

The reviewer supplies `reviewer`, `reviewed_at_utc`, `method`, and `findings` at
file level. Findings identify exact page, category, explanation and evidence.
Preserve source SHA-256; never modify the PDF. Unresolved claims remain visible.
Full completion requires every page to have review evidence and no unresolved
scientific status. A valid source review does not itself certify lesson quality,
exercise correctness, browser acceptance or deployment.

## Incremental work

Complete and validate each coherent source/lesson/laboratory unit, then tell the
coordinator which files are ready for a separate commit and immediate push.
Only the coordinator commits to avoid index races. Never revert another worker's
changes or modify files outside the assigned ownership boundary.
