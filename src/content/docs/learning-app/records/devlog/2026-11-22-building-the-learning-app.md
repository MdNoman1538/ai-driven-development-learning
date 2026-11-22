---
title: "2026-11-22: Building the learning app"
sidebar:
  order: 20261122
  label: "2026-11-22: Building the learning app"
record:
  project: learning-app
  kind: devlog
  source: https://github.com/MdNoman1538/ai-driven-development-learning/blob/main/docs/devlog/2026-11-22-building-the-learning-app.md
  commit: e8b8ef4
---

:::note[Original record]
Imported unchanged from [`docs/devlog/2026-11-22-building-the-learning-app.md`](https://github.com/MdNoman1538/ai-driven-development-learning/blob/main/docs/devlog/2026-11-22-building-the-learning-app.md) at commit `e8b8ef4`. It is the project's own record; the teaching pages explain it.
:::

## Why it exists

After a day of fast building (8 merged PRs on Road Risk, 5 on projectViewer) the owner said: *"I'm not learning in the current workflow."* They want to understand the reasoning (architecture, decisions, trade-offs), not to write code. The answer was a change of workflow, "do less, learn more", and a place to hold it: a separate, public, interactive learning site covering every project, including itself.

## Choosing the stack (ADR-0001)

Five options were compared: MkDocs, Docusaurus, Next.js, a custom React app, and Astro + Starlight. The site is mostly content with a few interactive pieces, so a static site with React "islands" won: the polish of Starlight, free hosting on GitHub Pages, and typed content collections.

**Versions:** each exact version is the newest that was at least two weeks old (Astro 7.4.7, not 7.4.13 from four days earlier). My first version picker sorted by date and would have chosen React 19.1.10, a backport patch, over the newer 19.3.1. Sorting by version number fixed it. `@astrojs/check` only supports TypeScript 5–6, so TypeScript 6.0.3, not 7.

## Prove the riskiest part first

Before writing any content, a throwaway skeleton proved the key pattern: YAML data → zod schema → a React component in an MDX page → rendered HTML with the `/ai-driven-development-learning/` base path. It caught a breaking API change straight away: Starlight 0.39 removed sidebar `autogenerate` groups with a `label`. Five minutes on a skeleton instead of an hour of confusion later.

## Two layers (ADR-0002)

- **Records:** `scripts/sync-sources.mjs` clones each public repo (full history with file contents on demand, `--filter=blob:none`), imports 25 records unchanged, rewrites relative links to GitHub, and extracts dependencies, CI jobs and history. Output is deterministic.
- **Teaching layer:** 20 decision cards, 4 architecture views, 29 tool cards, 19 concept pages, 7 journey sessions, 51 glossary terms and an 8-step data journey. All structured, all schema-checked.

## Keeping it honest (ADR-0003, ADR-0004)

- **The coverage check** fails the build if any dependency of any project lacks a tool card, any ADR lacks a decision card, or any link points at nothing.
- **A privacy guard** in the sync refuses records with home-directory paths or email addresses.

## Something the teaching layer surfaced

Writing Road Risk's workflow card showed that its ADR-0004 still says *squash merges*, while the project actually merged with merge commits (following projectViewer's ADR-0007). The card says so honestly, and Road Risk needs a superseding ADR: a nice example of why decisions should be written down.

## Watching it being built

The repository was subscribed in projectViewer, so the AI activity feed showed every file as it was written. The code map stays mostly empty for now, because projectViewer only analyses Python. A TypeScript analyser is now the clearest next feature for projectViewer.
