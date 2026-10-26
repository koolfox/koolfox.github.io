# Danna course continuation — paused 2026-10-26

The owner requested a summary and postponed the remaining work. The goal is
paused, not complete. Resume only after a new request to continue.

## Verified repository state

- Worktree: `bioinformatics-danna-worktree`; branch `feat/danna-course-fourth`.
- All completed source/content/implementation units were committed and pushed
  individually. Before this handoff the branch head was `42c1b62`, incorporating
  current main without discarding the separate structural-course work.
- 3,610 of 8,232 slide pages have complete text, visual and scientific review;
  4,622 pages remain. 51 of 121 source PDFs are complete; 70 remain.
- 22 independent Persian concept lessons support 51 ready source sessions.
  Readiness is computed by `course_content.py`; it is not a publication flag.
- Official slide originals remain unchanged upstream. Independent Persian
  teaching, page guides and scientific corrections are separate.

## Public releases already verified

Publication evidence is in `publication-log.json`.

- PR 54: five semester paths and the real Python neuron/XOR lab.
- PR 55: network playground with features, architectures, optimizers,
  regularization, validation and sealed final-test evaluation.
- PR 56: convolution operation lab and expanded image-learning paths. Pages run
  `40286211914` succeeded and the public arithmetic/controls/download/mobile
  checks passed. This public snapshot has 3,030 reviewed pages and 43 companions.

Public entry: https://koolfox.github.io/deep-learning/

## Saved next increment, not yet published

The fourth branch adds source reviews and lessons through the 3,610-page snapshot,
including data benchmarks, efficient training, PCA, detection and segmentation.
It also contains the native `labs/cnn-mnist` project and its generated download
page. The native project has **not** been publicly released.

Two independent CPU smoke runs reproduced parameters, history and test metrics.
Full five-epoch runs used 54,004 training and 5,996 validation images, then the
official 10,000-image test once per selected model. Recorded test accuracy was
98.02% for the original small CNN and 92.11% for the linear baseline. These are
measurements of that particular protocol, not general architectural claims.

`data/processed/mnist-reference.json` records complete results and provenance;
`mnist_reference.py` checks code hashes, confusion counts and checkpoint selection.
The native project ZIP includes an explicit file allow-list and SHA-256 manifest.
52 offline deep-learning checks passed. The download/result-page browser test,
including the mobile sticky-header correction, passed. Independent UI review
cleared the scoped fix; `mnist-design-acceptance.md` records the limits.

A clean locked Linux execution workflow exists in `.github/workflows/mnist-lab.yml`
but has not yet run. Do not claim clean-environment or publication acceptance.
The latest main also added a separate structural Shiny runtime: local complete-site
builds now require exporting both courses' runtimes, as the merged CI workflows do.

## Resume order

1. Verify the current branch, remote state and pending edits before continuing.
2. Export the structural runtime required by current main; preserve its separate
   course and tests. Complete combined artifact checks.
3. Open the next scoped PR for the fourth branch. PR 57 belongs to the separate
   structural-course increment; no PR was opened for this branch before pausing.
4. Require the new MNIST clean CPU job and the exact Pages artifact checks to pass;
   merge while preserving incremental commits, verify deployment and live URLs,
   then append publication evidence.
5. Continue all remaining source reviews, independent lessons, exercises and
   appropriate live/reproducible labs. Do not redefine completion around the
   already-finished subset.

Research ownership at pause: the 2022 reviewer is starting the recurrent-network
units; the 2024/2025 reviewer is continuing Spring 2025 dense prediction and later
sequence units; the 2026 reviewer is preparing the multimodal unit after reading
its 54 source pages. Draft observations are not counted as completed records until
their validated review/mapping/content files are delivered. Preserve their cached
notes and source evidence when resuming.

The final acceptance must still prove all 8,232 pages, all five paths, remaining
teaching/lab coverage, browser behavior and actual publication. A green partial
build or inventory is not full completion.
