# Structural Bioinformatics Research Atlas

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed: lightweight static HTML/CSS/JavaScript with a reusable Three.js graphics engine; Python for reproducible analysis; ManimGX for exported animations. No frontend framework or build server is necessary.

## Users

An MSc computer-engineering student specializing in bioinformatics, preparing a structural-bioinformatics course investigation, and instructors reviewing its methods and evidence.

## Product Purpose

Explore TNF, CRP, adalimumab and molecular/clinical evidence for rheumatoid arthritis, psoriasis, ankylosing spondylitis and lupus. Help select a defensible research question and prepare material that can later support a manuscript.

## Operating Context

Existing public course/personal repository: `koolfox/koolfox.github.io`. Work in `structural-bioinformatics/`, expose a link from the existing homepage, and use a feature branch and PR for review.

## Capabilities and Constraints

Persian RTL interface; rotatable experimental molecular coordinates; reproducible figures; a rendered structural animation; source-linked literature and dataset catalogs. Preserve the site's existing Arad font and visual identity.

The user explicitly asks for exploration without premature conclusions. The meaning of the user's nucleic-acid term is unresolved. DNA sequence, RNA abundance, RNA structure, protein geometry, biomarker concentrations and treatment outcomes remain separate evidence types. Lupus is a safety/comparator lane for this drug, not an assumed indication.

## Evidence on Hand

Three reviewed recent primary papers; fourteen verified data sources; RCSB structures 3WD5, 1TNF and 1B09; a real ManimGX render. The deposited 3WD5 view contains one TNF protomer and Fab, with an incomplete physiological epitope. Patient-specific molecular structures and a linked four-disease clinical dataset are absent.

## Product Principles

- Show source identifiers and distinguish measured, derived and proposed material.
- Keep an exploratory result distinct from a causal or clinical claim.
- Make analyses repeatable from source URLs, checksums and pinned dependencies.
- Use the same data for graphics and numerical readouts.
