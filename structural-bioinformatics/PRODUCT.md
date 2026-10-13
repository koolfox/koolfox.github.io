# Structural Bioinformatics Research Atlas

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed: lightweight static HTML/CSS/JavaScript with a reusable Three.js graphics engine; Python for reproducible analysis; ManimGX for exported animations. No frontend framework or build server is necessary.

## Users

An MSc computer-engineering student specializing in bioinformatics, preparing a structural-bioinformatics course investigation, and instructors reviewing its methods and evidence.

Teach at the conceptual starting point of a biology-interested high-school student: explicitly define cell, protein, receptor, binding, gene/RNA and every new term. The user welcomes detailed explanations of basics. Introduce each paper as a concrete experiment and put technical/numerical detail after the plain-language meaning. Use natural Persian: replace opaque terminology such as «اختصاصیت» with a sentence explaining the intended target and comparison.

Immediate weekly deliverable: select the protein and summarize three relevant papers in class. The visual notebook is the student's ongoing presentation surface. A twenty-four-slide audience-facing presentation adds a title slide to the twenty-three Markdown chapters shared with the reader, with actual figures, keyboard navigation, fullscreen and print support. Speak to the class in a friendly, moderately formal tone; keep coaching and self-talk out of presentation content. Short references appear on each factual slide; the closing appendix explains source roles. Each paper has explicit methods, results and limits. Images and local rotatable models enlarge within the slide page. Numerical studies are optional appendices; MD and a complete original paper are later decisions.

## Product Purpose

Current course scope: understand the adalimumab antibody, its deposited Fab–TNF interface and rheumatoid-arthritis mechanism, then assess possible direct versus indirect effects on TOP2A activity. RNA, protein amount, enzymatic inhibition and cancer response are distinct measurements. The student needs explanations they can learn and defend. Small verified RNA/protein sequence examples support that understanding; a large gene-expression research program remains future work. A negative or inconclusive finding about the proposed connection is a valid outcome.

## Operating Context

Existing public course/personal repository: `koolfox/koolfox.github.io`. Work in `structural-bioinformatics/`, expose a link from the existing homepage, and use a feature branch and PR for review.

## Capabilities and Constraints

Persian RTL interface; rotatable experimental molecular coordinates; reproducible figures; a rendered structural animation; source-linked literature and dataset catalogs; an in-page Markdown reader with chapter navigation, LaTeX and Mermaid. Preserve the site's existing Arad font and visual identity. All six tabs remain discoverable on phones; rendering libraries are self-hosted and loaded when needed.

The user explicitly asks for exploration without premature conclusions. DNA sequence, RNA abundance, RNA structure, protein geometry, biomarker concentrations and treatment outcomes remain separate evidence types. RefSeq mRNA displayed using T is a reference alphabet; a T-to-U conversion is a labeled teaching operation. None of the current PDB entries supplies an RNA structure. Lupus is a safety/comparator lane for this drug, not an assumed indication.

Long-term direction confirmed by the user: an educational/research tool, with this case as its first study. Its roadmap is exploratory, not implemented functionality. Design priorities are correct Persian RTL, isolated Latin identifiers, a real Persian font and stronger visual hierarchy. The user prefers Paper for finding a stable direction, followed by Impeccable for code refinement; no active Paper connection exists in this session.

## Evidence on Hand

Three core recent primary papers, with separately appraised structural and TOP2A bridge references; an optional 26-source catalog; RCSB structures 3WD5, 1TNF, 1B09 and 4FM9; a real ManimGX render. The deposited 3WD5 view contains one TNF protomer and Fab, with an incomplete physiological epitope. 4FM9 shows a TOP2A cleavage-core asymmetric unit with synthetic DNA. Patient-specific molecular structures and a linked four-disease clinical dataset are absent.

## Product Principles

- Show source identifiers and distinguish measured, derived and proposed material.
- Keep an exploratory result distinct from a causal or clinical claim.
- Make analyses repeatable from source URLs, checksums and pinned dependencies.
- Use the same data for graphics and numerical readouts.
- Organize the presentation into accessible tabs, keeping advanced sources and future experiments optional.

Presentation identity follows the user-supplied university template: the university logo at top left, institution/course at top right, short title at bottom right and autumn season at bottom left. The cover states the supplied presenter and supervisor; the date is user-confirmed as پاییز ۱۴۰۵.
