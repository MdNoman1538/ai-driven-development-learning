---
title: "ADR-0005: Pick first, then reveal"
sidebar:
  order: 5
  label: 0005 · Pick first, then reveal
record:
  project: learning-app
  kind: decisions
  source: https://github.com/MdNoman1538/ai-driven-development-learning/blob/main/docs/decisions/0005-pick-first-then-reveal.md
  commit: d5f128c
---

:::note[Original record]
Imported unchanged from [`docs/decisions/0005-pick-first-then-reveal.md`](https://github.com/MdNoman1538/ai-driven-development-learning/blob/main/docs/decisions/0005-pick-first-then-reveal.md) at commit `d5f128c`. It is the project's own record; the teaching pages explain it.
:::

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

The owner wants to learn reasoning, architecture and decision-making, not to write code. Reading a summary after the fact taught little.

## Options considered

1. **Plain explanatory pages.** Simple; passive reading, little sticks.
2. **Quizzes only, later.** Measures learning, but nothing active until then.
3. **Decision cards where the reader chooses first.**

## Decision

Option 3. Every ADR becomes a decision card: the problem, the context and the options. The reader commits to an option, then sees each option's pros and cons, what was chosen, why, what it led to, when to revisit, and a general lesson. Picks and a running score are kept in the browser (`localStorage`, guarded so the page works without it). "Just show me the answer" is always available.

## Reasoning

- Committing to a prediction before seeing the answer makes the reasoning memorable (the *generation effect*).
- Comparing your pick with the real one shows exactly where your judgement differs; that's the useful part.
- The picks prepare the quizzes in Phase L3.

## Consequences

- **Revisit when** quizzes arrive; picks can then feed spaced repetition.
