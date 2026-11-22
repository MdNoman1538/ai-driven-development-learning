---
title: "ADR-0003: The build fails when an explanation is missing"
sidebar:
  order: 3
  label: 0003 · The build fails when an explanation is missing
record:
  project: learning-app
  kind: decisions
  source: https://github.com/MdNoman1538/ai-driven-development-learning/blob/main/docs/decisions/0003-coverage-check-fails-the-build.md
  commit: "1917421"
---

:::note[Original record]
Imported unchanged from [`docs/decisions/0003-coverage-check-fails-the-build.md`](https://github.com/MdNoman1538/ai-driven-development-learning/blob/main/docs/decisions/0003-coverage-check-fails-the-build.md) at commit `1917421`. It is the project's own record; the teaching pages explain it.
:::

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

The projects keep adding tools and decisions. Good intentions don't keep documentation current.

## Options considered

1. **Rely on discipline.** No tooling; fails the first busy week.
2. **A coverage check in CI.** Compare the generated facts with the teaching layer and fail on gaps.

## Decision

Option 2. `scripts/check-coverage.mjs` fails when:
- a project's dependency has no tool card (`packages` in `src/data/tools.yaml`)
- a project's ADR has no decision card, or a card has no ADR
- the journey or glossary links to a decision or concept that doesn't exist
- a decision's `chosen` index is out of range

It runs in CI on every PR, together with `astro check` and the build.

## Reasoning

- Turning a habit into a failing check is the most reliable way to keep a rule.
- Together with a rule in each project's `CLAUDE.md` (a change that adds a tool or a decision also updates this site), a gap becomes a red build instead of a forgotten task.

## Consequences

- A new dependency in any project blocks this site's next deploy until it's explained.
- **Revisit if** it blocks too often for trivial packages; then add an explicit, reviewed "not explained" list.
