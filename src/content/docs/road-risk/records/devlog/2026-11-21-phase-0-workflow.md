---
title: "2026-11-21 — Phase 0 kickoff: development workflow"
sidebar:
  order: 20261121
  label: "2026-11-21 — Phase 0 kickoff: development workflow"
record:
  project: road-risk
  kind: devlog
  source: https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/devlog/2026-11-21-phase-0-workflow.md
  commit: 1df8e5a
---

:::note[Original record]
Imported unchanged from [`docs/devlog/2026-11-21-phase-0-workflow.md`](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/devlog/2026-11-21-phase-0-workflow.md) at commit `1df8e5a`. It is the project's own record; the teaching pages explain it.
:::

## Goal of the session

Start Phase 0 with an industry-standard development process: tested, maintainable, every change reviewed through a pull request.

## Question asked first: is our process industry practice?

An honest review of our process so far:
- **Matches common industry practice:** ADRs, measure-before-optimise, tests/CI before features, keeping non-deterministic components out of safety decisions, eval-driven LLM work.
- **Not a team convention:** the devlog. Teams usually record reasoning in PRs, issues and design docs. We keep the devlog because it serves learning and the portfolio, but we don't claim it is industry standard.
- **Missing:**
  1. agent instructions kept in the repo
  2. branches + PRs + review
  3. an issue tracker
  4. test-first bug fixes

The owner accepted all four.

## Decisions

[ADR-0004](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0004-development-workflow.md): GitHub Flow, Conventional Commits, small single-purpose PRs, squash merge, test-first fixes, Definition of Done including docs, branch protection with CI required.

Trade-offs considered:
- **Git Flow:** too heavy for one developer deploying continuously.
- **Trunk-based:** needs a strong test suite we don't have yet.
- **Required approvals:** set to 0, because GitHub won't let authors approve their own PRs. Human review is enforced by the process and the PR checklist instead.

## Why agent rules moved from local memory into `CLAUDE.md`

Until now, rules such as "update the docs every session" lived in the AI agent's memory on one laptop. That memory is invisible to other tools and collaborators, isn't versioned, and can't be reviewed. Putting the rules in the repo makes them part of the codebase: reviewed in PRs, with a history.

## What was built (PR 1, branch `docs/project-documentation-and-workflow`)

- `CONTRIBUTING.md`: the human workflow
- `CLAUDE.md`: rules for AI agents, design rules, codebase map, data facts
- `.github/pull_request_template.md`: with the Definition of Done checklist
- `.github/ISSUE_TEMPLATE/`: bug report and task templates
- ADR-0004, plus updates to the roadmap, status and README
- The `docs/` folder from the planning session (first commit of it)

## Ordering problem noticed

Branch protection can only *require* CI checks once a CI workflow exists and has run. So the order is:
1. this PR
2. the tooling/CI PR
3. switch on protection
4. the bug-fix PR, which will then be the first one gated by CI

## PR 2: tooling and CI (branch `chore/tooling-and-ci`, stacked on PR 1)

### What was built
- **`pyproject.toml` + `uv.lock`.** One source of truth for dependencies and tool config. `uv` resolves and pins all 70 packages.
- **`requirements.txt` is now generated** (`uv export`), because Render installs with pip. A pre-commit hook regenerates it, and CI fails if it drifts from the lock. The old file had only `>=` lower bounds, so every Render build could get different versions. Now local, CI and Render get the same ones.
- **ruff** (lint and format): rules E, F, W, I, B, UP, SIM; line length 110; E501 ignored because the formatter owns line length.
- **pytest:** 36 unit tests to start (translations, tier boundaries, input validation, API contract). None of them needs the spatial extension.
- **pre-commit hooks:** `no-commit-to-branch` enforces the workflow locally; also blocks large files, detects private keys, runs ruff, and keeps the lock and export in sync.
- **GitHub Actions CI:**
  - two jobs: lint/dependency checks, and tests
  - read-only permissions; cancels runs made outdated by a newer push
  - actions pinned to exact versions found with `git ls-remote`, not guessed

### Surprises and lessons
1. **The Render bug reproduced itself on our machine.** `uv` resolved DuckDB **2.0.1** (the conda env has 2.0.0). DuckDB stores extensions per version (`~/.duckdb/extensions/v2.0.1/`), so `LOAD spatial` failed exactly as on Render. Any DuckDB upgrade triggers the bug, not only a fresh server. More evidence for the fix in PR 3.
2. **Checked that formatting didn't change behaviour.** We ran the engine on Oulu (250 m) and Helsinki (2 km) before and after the mechanical formatting commit. Outputs were identical (95 / 57.8 / HIGH and 4659 / 50.9 / HIGH).
3. **`.git-blame-ignore-revs` was tried and dropped.** It lists bulk-formatting commits for `git blame` to skip. But we squash-merge, so the formatting commit's SHA disappears at merge time. The squashed commit also contains real changes, so ignoring it would hide them. For ~1,200 lines of code it isn't worth a separate PR. Recorded so we don't try it again without a reason.
4. **The format check caught our own new test file on the first run.** Expected; the tooling works.
5. **The silent `try/except: pass` around `INSTALL spatial`** in the dashboard is marked `noqa` with a pointer to the known issue, rather than "fixed" with `contextlib.suppress`, which would hide the problem behind tidier syntax. PR 3 removes it.

### Follow-ups noted
- Starlette warns that using `httpx` with its test client is deprecated. Check the recommended replacement when FastAPI's TestClient updates.
- Pin GitHub Actions to commit SHAs instead of tags (supply-chain hardening), probably in Phase 10.
- The package is literally named `src` (`from src.scoring import …`). That's unusual, but renaming is a larger refactor, deferred.

## PR 3: spatial-extension fix (branch `fix/spatial-extension-install`, stacked on PR 2)

### Test-first, step by step
1. **Seam.** We added an optional `extension_directory` to `SpatialRiskEngine`, passed through to DuckDB's config. No behaviour change when unset. It lets a test simulate a fresh machine by pointing DuckDB at an empty folder.
2. **Failing test, committed on its own.** `test_engine_works_with_an_empty_extension_directory` failed with `IO Error: Extension ... spatial.duckdb_extension not found`, the exact Render error. It failed *for the right reason*, not because of a typo or import error.
3. **Fix.**
   - New `src/db.py` → `connect_spatial()`: the only place the app opens DuckDB. It always runs `install_extension` before `load_extension`, and closes the connection and re-raises if either fails.
   - Engine: one lazily created connection, guarded by a lock, plus a `cursor()` per unit of work.
   - Dashboard: uses the engine's connection; the silent `try/except: pass` is gone.
   - `/health` is now a real readiness check.
4. **The same test passes.**

### Assumptions checked rather than trusted
- **Does `INSTALL` hit the network on every start?** That would break offline use, which matters for a car. Timed each step: open 10 ms, install (already present) **0.3 ms**, load 44 ms. No network call; offline start works once the extension is installed.
- **Do cursors share the loaded extension, and does closing one leave the parent open?** Yes to both, verified directly.
- **Is the engine thread-safe?** Test: 40 calls across 8 threads, all identical results.

### Surprise: a test that passed alone failed in the full suite
`Connection Error: Can't open a connection to same database file with a different configuration than existing connections.` Within one process, DuckDB shares one database instance per file. Once other tests held a connection, our regression test (which uses a different extension directory) couldn't open the same file. The fix: the test uses its own copy of the database.

*Lesson:* always run the full suite, not only the new test. We also ran the suite in 3 shuffled file orders to check for other order dependencies: all green.

### Health check redesign
- **Before:** `/health` returned `{"status": "ok", "database": "<server filesystem path>"}` without touching the DB. It passed while the API was broken, and it leaked a server path.
- **Now:** it runs a real query plus a spatial function. It returns `503 {"status": "unavailable", "error": "<ExceptionType>"}` on failure and never includes paths.
- This matters because **Render uses `/health` to decide whether a deploy succeeded**. A shallow check turns a broken deploy into a "healthy" one.

### Characterization tests
We pinned today's outputs (Oulu 250 m → 95 / 57.8 / HIGH; Helsinki 2 km → 4659 / 50.9 / HIGH). They don't claim the scores are *right*; they prove that refactors don't *change* them. When data hygiene or Phase 2 changes the numbers on purpose, the test is updated in the same PR, with the reason given.

### Dashboard smoke test
Streamlit's `AppTest` runs `app.py` headless in English and Finnish and asserts no exceptions and that the headline metrics are present. First attempt failed because `AppTest.from_file` resolves relative paths from the test file's folder, so we use an absolute path.

### Small cleanup in code already being touched
The dashboard's `_db_path` parameter was unused. A leading `_` also excludes a parameter from Streamlit's cache key, so it never acted as a cache key either. Removed.

### Measured result
- 250 m lookup: 78 → **15 ms**
- 2 km lookup: 124 → **80 ms**
- 100-waypoint route: **1.16 s**

The old "~8 s" for the route was an estimate (100 × 78 ms) and is labelled as such in the status file. The 2 km case stays slow because of Python-side processing of every matching row. Recorded as known issue #11 and deliberately not fixed here: one purpose per PR.

## Next

1. Push PRs 1–3, open them on GitHub, switch on branch protection once CI has run once.
2. Remaining Phase 0 PRs:
   - exception text leak (#10)
   - data hygiene: missing-value spellings, duplicate ID, dynamic reference year
   - move the DB file out of git (needs an ADR, because Render deploys depend on it)
   - exploration scripts → tests or delete
