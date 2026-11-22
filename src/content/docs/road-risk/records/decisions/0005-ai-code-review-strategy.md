---
title: "ADR-0005: AI code review: use an existing strong reviewer now, fine-tune
  only after evals exist"
sidebar:
  order: 5
  label: "0005 · AI code review: use an existing strong reviewer now, fine-tune
    only after evals exist"
record:
  project: road-risk
  kind: decisions
  source: https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0005-ai-code-review-strategy.md
  commit: 1df8e5a
---

:::note[Original record]
Imported unchanged from [`docs/decisions/0005-ai-code-review-strategy.md`](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0005-ai-code-review-strategy.md) at commit `1df8e5a`. It is the project's own record; the teaching pages explain it.
:::

- **Status:** Accepted (by the owner, 2026-11-21)
- **Date:** 2026-11-21

## Context

The owner asked whether to build or fine-tune their own AI code reviewer (for example a small Qwen model), as in their earlier PR World prototype.

## Options considered

1. **Fine-tune a small model as a reviewer now.** There is no training data (about 10 commits) and no evaluation set. Fine-tuning teaches format and style, not the judgement needed to find real bugs; a weak reviewer that sounds confident is worse than none.
2. **No AI review.** Loses a cheap, useful second opinion.
3. **An existing strong reviewer now, plus deterministic checks, plus collecting labels; fine-tune later, only against an eval set.**

## Decision

Option 3:
1. **Run an existing reviewer** (Claude Code `/code-review`) on PRs as a second opinion. **The owner stays the reviewer.**
2. **Mark each finding right or wrong** in the PR. That builds a labelled dataset as a side effect.
3. **Turn project rules into automatic checks wherever possible** ("architecture fitness functions"). Examples: `tests/test_project_layout.py`; later `import-linter` to enforce ADR-0001 (no LLM imports in `scoring/` or `engine/`).
4. **Only after Phase 6 (evals) and Phase 7 (LoRA):** build an eval set with **planted bugs and an answer key** (PR World's best idea), then fine-tune a small model for a *narrow* review task. Adopt it only if it measurably comes close to the strong reviewer.

## Consequences

- No reviewer code to build now. The labelled findings and the planted-bug eval become Phase 7 material.
- **A human reads every diff;** AI review never replaces that.
