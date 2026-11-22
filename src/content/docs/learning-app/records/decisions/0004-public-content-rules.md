---
title: "ADR-0004: Public content rules, enforced by the sync"
sidebar:
  order: 4
  label: 0004 · Public content rules, enforced by the sync
record:
  project: learning-app
  kind: decisions
  source: https://github.com/MdNoman1538/ai-driven-development-learning/blob/main/docs/decisions/0004-public-content-rules.md
  commit: 81ca1ea
---

:::note[Original record]
Imported unchanged from [`docs/decisions/0004-public-content-rules.md`](https://github.com/MdNoman1538/ai-driven-development-learning/blob/main/docs/decisions/0004-public-content-rules.md) at commit `81ca1ea`. It is the project's own record; the teaching pages explain it.
:::

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

The site is public and imports text in bulk from other repositories. Bulk imports are where private details slip through, because nobody reads every line.

## Options considered

1. **Review by eye** before each publish.
2. **A guard in the importer** that refuses private patterns.

## Decision

Option 2, plus review:
- Only **public** repositories are synced, from their `main` branch.
- The sync **refuses** any record containing a local home-directory path or an email address, and names the file, so the fix happens in the source repository.
- Never published: personal data, secrets, local paths, or anything from private tools and prototypes beyond what their public records already say.

## Consequences

- Patterns can't catch everything; human review of each PR still matters.
- **Revisit when** new kinds of sensitive data appear in records.
