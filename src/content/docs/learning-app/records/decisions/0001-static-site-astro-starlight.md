---
title: "ADR-0001: A static site built with Astro + Starlight, interactive only
  where it teaches"
sidebar:
  order: 1
  label: 0001 · A static site built with Astro + Starlight, interactive only where
    it teaches
record:
  project: learning-app
  kind: decisions
  source: https://github.com/MdNoman1538/ai-driven-development-learning/blob/main/docs/decisions/0001-static-site-astro-starlight.md
  commit: e8b8ef4
---

:::note[Original record]
Imported unchanged from [`docs/decisions/0001-static-site-astro-starlight.md`](https://github.com/MdNoman1538/ai-driven-development-learning/blob/main/docs/decisions/0001-static-site-astro-starlight.md) at commit `e8b8ef4`. It is the project's own record; the teaching pages explain it.
:::

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

The owner wants to learn the reasoning behind real projects (architecture, decisions, trade-offs) on a public, good-looking, interactive site, maintained by one person and an AI agent. It is mostly content, with a few rich interactive pieces (architecture explorer, decision cards, stack map), and quizzes later.

## Options considered

1. **MkDocs.** The simplest Python docs generator; hard to make interactive and good-looking.
2. **Docusaurus.** Mature, React-based; every page ships React; plainer design.
3. **Next.js.** A full web-app framework; needs a server or paid hosting; far more to maintain.
4. **A custom React app.** Unlimited interaction; weeks of work and the most maintenance.
5. **Astro + Starlight + React islands.** Static HTML for the content, React only for the interactive explorers.

## Decision

Option 5. Astro 7.4.7, Starlight 0.42.10, @astrojs/react 7.1.4, React 19.3.1, TypeScript 6.0.3: exact versions, each published at least two weeks before it was chosen. Hosted on GitHub Pages, built and deployed by GitHub Actions.

## Reasoning

- **Content should be plain, fast HTML**; interactivity only where it teaches ("islands").
- **Starlight gives a polished, accessible design** with search (Pagefind), dark mode and mobile layout built in.
- **Typed content collections** check every entry against a schema at build time (ADR-0002).
- **Static hosting is free** and has nothing to go down.
- **The riskiest assumption was proven first**: a skeleton showed data → schema → React island → rendered HTML working with the GitHub Pages base path before any content was written. It also caught an API change: Starlight 0.39 removed `autogenerate` groups with a `label`.

## Consequences

- No server: quiz progress (Phase L3) is stored in the visitor's browser.
- **Revisit if** the site needs accounts, shared progress or server-side features.
