---
title: "2026-11-22: Version 2: scoped projects, code-level learning,
  stage-aligned paths"
sidebar:
  order: 20261122
  label: "2026-11-22: Version 2: scoped projects, code-level learning,
    stage-aligned paths"
record:
  project: learning-app
  kind: devlog
  source: https://github.com/MdNoman1538/ai-driven-development-learning/blob/main/docs/devlog/2026-11-22-version-2-code-level-learning.md
  commit: a006d3a
---

:::note[Original record]
Imported unchanged from [`docs/devlog/2026-11-22-version-2-code-level-learning.md`](https://github.com/MdNoman1538/ai-driven-development-learning/blob/main/docs/devlog/2026-11-22-version-2-code-level-learning.md) at commit `a006d3a`. It is the project's own record; the teaching pages explain it.
:::

## What the owner asked for

After using version 1, the owner asked for several things:
- **Scoped navigation:** inside a project, only that project; shared knowledge in one combined place.
- **Full forms** for every acronym.
- **Architect-level knowledge of each system:** what is used where and why, which APIs are called with which parameters and why, design patterns, decision rationale down to single choices ("why memory instead of the database?"), algorithms and data science.
- **Learning that grows with the projects,** stage by stage.

They also asked whether a software architecture book could guide the curriculum. With no book at hand, the curriculum was synthesised from the standard body of knowledge into a 13-area competency map, with honest gaps.

## What was built

- **Scoped navigation** (ADR-0006): route middleware keeps one area's sidebar; a per-area accent colour; home shows only projects and Combined knowledge.
- **Acronyms:** one list, a rehype plugin for pages and imported records, and per-card scopes in the islands.
- **Code readers** (ADR-0007): Python via `ast`, TypeScript via the compiler's parser; projectViewer's JavaScript viewer is read too.
- **Per project:**
  - Quality attributes as measurable scenarios
  - C4 architecture (context, containers, components)
  - Walkthroughs with verified snippets
  - Code reference and API reference
  - Algorithms & data science, with the Risk Score Playground
  - Design patterns and trade-offs
  - Concepts in this project
  - A stage-aligned learning path (ADR-0008)
- **Combined knowledge:** competency map, architecture styles, pattern catalogue, trade-off library, algorithms.

## Numbers

- 10 walkthroughs (47 verified snippets), 22 patterns, 19 trade-offs, 19 algorithms (used and planned), 15 quality scenarios, 13 API entries, 7 styles, 13 competency areas.
- 107 pages; 4,244 internal links, none broken; 0 type errors.

## Surprises and fixes

- **The checks earned their keep straight away.** Mutation tests (a changed snippet, reference and constant) each failed with a precise message. Later, during this same change, the coverage check caught a new dependency without a tool card, and a walkthrough snippet made stale by my own acronym fix.
- **The privacy guard** stopped the first code sync on a test email in projectViewer (`t@example.com`). Reserved documentation domains (RFC 2606) are now allowed explicitly; everything else is still blocked.
- **Call resolution gaps found by looking at the result.** `Cache.key` showed no callers. Two causes:
  - projectViewer uses the src layout (`src/projectviewer/…` imported as `projectviewer.…`)
  - calls through an imported class (`Cache.key(...)`) weren't resolved

  Fixing both raised projectViewer's resolved calls from 158 to 208.
- **Astro 7** no longer runs rehype plugins with its default Markdown processor; `@astrojs/markdown-remark` is now a direct dependency (tool card updated).
- **Zod:** a record keyed by an enum requires *every* key; concept uses are keyed by string and validated by the coverage check instead.
- **Accent colours** at first lost to Starlight's own `:root[data-theme]` rules; raised specificity fixed it.
- **The code reference** loads each project's source from static JSON on demand (about 190–260 KB), so pages stay light.

## Process

- The projectViewer change made early in this session (recording parameter defaults) was committed only locally and left alone, at the owner's request to focus on the learning app.
