# ADR-0006: Scoped projects and a separate "Combined knowledge" area

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

Version 1 showed every project in one sidebar. The owner found it confusing ("it shows everything at once; it's not a generalized app"): inside a project they want only that project; shared knowledge belongs in one combined place. They also want every acronym spelled out.

## Options considered

1. **One sidebar for everything** (version 1): simple, but no sense of place; projects blur together.
2. **Separate sites per project**: clean, but shared knowledge is duplicated and cross-links break.
3. **One site with scoped navigation**: each project area shows only its own sidebar; a "Combined knowledge" area holds what spans projects.

## Decision

Option 3:
- **Home** shows only the projects, plus one entry into Combined knowledge.
- **Inside a project** the sidebar keeps only that project's group, grouped as understand / inside the code / decisions / learn & history. Previous/next links stay inside the project, and each area has its own accent colour. Implemented as Starlight route middleware (`src/routeData.ts`), so the full sidebar is still defined once.
- **Concepts** live once in Combined knowledge. Each project shows "Concepts in this project": how *that* project uses each idea, with a link to the full concept.
- **Acronyms** are expanded automatically from one list (`src/data/acronyms.json`): spelled out on first use in a page or card, full form on hover everywhere. This covers imported records, through a build-time rehype plugin, and the React islands, through a per-card scope.

## Consequences

- Adding a project means adding one sidebar group and one area entry; everything else follows.
- Astro 7's default Markdown processor no longer runs rehype plugins, so `@astrojs/markdown-remark` became a direct dependency.
