---
title: "ADR-0002: Two layers: imported records and a typed teaching layer"
sidebar:
  order: 2
  label: "0002 · Two layers: imported records and a typed teaching layer"
record:
  project: learning-app
  kind: decisions
  source: https://github.com/MdNoman1538/ai-driven-development-learning/blob/main/docs/decisions/0002-imported-records-and-typed-teaching-layer.md
  commit: "1917421"
---

:::note[Original record]
Imported unchanged from [`docs/decisions/0002-imported-records-and-typed-teaching-layer.md`](https://github.com/MdNoman1538/ai-driven-development-learning/blob/main/docs/decisions/0002-imported-records-and-typed-teaching-layer.md) at commit `1917421`. It is the project's own record; the teaching pages explain it.
:::

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

The site must show "everything done so far" from day one and stay true afterwards. The projects already keep ADRs, devlogs, roadmaps and status files. Hand-written documentation drifts; raw records don't teach.

## Options considered

1. **Write everything by hand.** Full control, but it drifts from the projects and doubles the work.
2. **Only import the records.** Always accurate, but records aren't lessons.
3. **Both, kept separate.**

## Decision

Option 3:
- **Records** are imported unchanged by `scripts/sync-sources.mjs` from each public repository's `main` branch, with relative links rewritten to GitHub. Each page names its source file and commit.
- **Facts** (dependencies, CI jobs, commit and PR counts) are read from the projects' own files into `src/generated/sources.json`.
- **The teaching layer** is structured data with zod schemas (`src/content.config.ts`): projects, tools, decisions, architecture views, journey, glossary, the data journey, plus concept pages with typed frontmatter.

## Reasoning

- Records are evidence; the teaching layer is interpretation. Keeping them apart keeps both honest, and every summary links to its evidence.
- Structured data feeds several views (cards, diagrams, timelines, later quizzes) from one source.
- Sync output is deterministic (no timestamps), so a sync that changes nothing produces no diff.

## Consequences

- Generated files are committed, so the site builds without network access and every content change is reviewable in a PR.
- **Revisit if** the teaching layer starts repeating the records instead of explaining them.
