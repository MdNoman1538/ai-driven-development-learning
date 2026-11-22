---
title: "ADR-0007: Code-level teaching, read from the code and verified against it"
sidebar:
  order: 7
  label: 0007 · Code-level teaching, read from the code and verified against it
record:
  project: learning-app
  kind: decisions
  source: https://github.com/MdNoman1538/ai-driven-development-learning/blob/main/docs/decisions/0007-code-level-teaching-verified-against-source.md
  commit: a006d3a
---

:::note[Original record]
Imported unchanged from [`docs/decisions/0007-code-level-teaching-verified-against-source.md`](https://github.com/MdNoman1538/ai-driven-development-learning/blob/main/docs/decisions/0007-code-level-teaching-verified-against-source.md) at commit `a006d3a`. It is the project's own record; the teaching pages explain it.
:::

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

The owner wants to understand projects the way an architect does: what is used where and why, which functions and APIs exist, what each parameter does, which patterns, trade-offs and algorithms are involved. Hand-written code explanations go stale with the first refactor.

## Options considered

1. **Write code explanations by hand.** Flexible, but stale within weeks.
2. **Use projectViewer's analyser.** Already extracts the facts, but couples this site to another tool's releases, and it can't read TypeScript yet.
3. **The site's own small readers, plus verification.** Python is read with `ast`, TypeScript with the compiler's parser. Teaching content references code as `file::Name`, and the build checks every reference and every quoted snippet.

## Decision

Option 3:
- `scripts/read_python.py` and `scripts/read-typescript.mjs` produce code facts: files, symbols, parameters with defaults, docstrings, *certain* calls (same file, `self.`, project imports, module-level instances, imported classes, src-layout packages), and FastAPI endpoints. Uncertain calls are left out, never guessed.
- The facts feed a **code reference** (searchable, callers/callees, source, "explained in"), an **API reference**, **walkthroughs**, **design patterns**, **trade-offs** and **algorithms**, plus a **Risk Score Playground** whose constants are checked against the engine's source.
- **The coverage check verifies:**
  - every code reference exists
  - every walkthrough snippet appears in the current source
  - every Road Risk endpoint is documented
  - every documented projectViewer route is in its route list
  - every playground constant matches the engine
- Source for the code reference is served as static JSON per project and loaded on demand, so pages stay light.

## Consequences

- A refactor in a project fails this site's build until the teaching is updated. That's deliberate, and it already caught two stale items during this very change.
- The readers resolve fewer calls than projectViewer; what they show is certain.
