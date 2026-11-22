---
title: "ADR-0004: Development workflow: GitHub Flow, small PRs, test-first
  fixes, human review of AI-written code"
sidebar:
  order: 4
  label: "0004 · Development workflow: GitHub Flow, small PRs, test-first fixes,
    human review of AI-written code"
record:
  project: road-risk
  kind: decisions
  source: https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0004-development-workflow.md
  commit: 1df8e5a
---

:::note[Original record]
Imported unchanged from [`docs/decisions/0004-development-workflow.md`](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0004-development-workflow.md) at commit `1df8e5a`. It is the project's own record; the teaching pages explain it.
:::

- **Status:** Accepted
- **Date:** 2026-11-21
- **Phase:** 0 (applies to everything after)

## Context

Until now, every commit went straight to `main`, with no tests, no CI and no review. The goal is now an industry-grade, maintainable product, and most code will be written with an AI coding agent. Two concrete failures show the cost of the current way of working:
- Commit 7a0dd11 shipped a "fix" that left the deployed API broken. Nothing ran the API on a clean environment, so nobody noticed.
- `/health` passed while the real endpoints failed.

Constraints:
- One human developer (the owner), who is also learning. Plus an AI agent.
- Public GitHub repo, free plan.
- Render deploys from `main`.

## Options considered

1. **Keep committing to `main`.** Fastest, but no safety net, no review record, and not what employers expect to see.
2. **Git Flow** (separate `develop` and `release/*` branches, plus hotfix branches). Built for scheduled versioned releases. Too heavy for one developer deploying continuously.
3. **Trunk-based development with feature flags.** Very short-lived branches or direct commits to trunk, with strong automated tests. Excellent for mature teams, but it needs a test suite we don't have yet.
4. **GitHub Flow.** `main` is always deployable; every change goes on a short-lived branch, through a PR with CI, and is squash-merged.

## Decision

GitHub Flow (option 4), with these rules, documented in [CONTRIBUTING.md](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/CONTRIBUTING.md):
- Conventional Commits; the PR title becomes the squash-commit message.
- One purpose per PR; small PRs.
- Bug fixes are test-first: the failing test is committed before or alongside the fix, with proof that it failed.
- A Definition of Done that includes documentation (devlog, ADR, status).
- **Branch protection on `main`:** PRs required, CI required to pass. Required approvals are set to 0, because GitHub does not let authors approve their own PRs. Review is still mandatory by process: the owner reads every diff.
- AI-agent rules are kept in the repo ([CLAUDE.md](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/CLAUDE.md)), so they are version-controlled and visible to every tool and contributor, instead of living in one person's local agent memory.

## Reasoning

- GitHub Flow is the simplest workflow that still gives review, CI gating and a traceable history. It matches continuous deployment from `main` (Render).
- Squash merging keeps `main`'s history at one commit per reviewed change, which makes it readable and easy to revert.
- **Test-first bug fixes prove that the test actually detects the bug.** A test written after the fix might pass for the wrong reason.
- **With AI-written code, review and tests matter more, not less.** The agent produces code faster than a human can verify it, so the workflow has to make verification the step that controls the pace.

## Consequences

- Each change takes a few minutes more (branch, PR, CI wait). Accepted.
- **CI must exist before branch protection can require it.** The tooling/CI PR has to land before protection is switched on.
- Stacked PRs (a PR that depends on another unmerged PR) need rebasing after the base PR is squash-merged.
- **Revisit if** the team grows (add required approvals and CODEOWNERS), or if the test suite becomes strong enough for trunk-based development.
