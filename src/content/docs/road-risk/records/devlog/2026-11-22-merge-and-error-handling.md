---
title: "2026-11-22: Merging the Phase 0 stack, protecting main, hiding internal
  errors"
sidebar:
  order: 20261122
  label: "2026-11-22: Merging the Phase 0 stack, protecting main, hiding internal
    errors"
record:
  project: road-risk
  kind: devlog
  source: https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/devlog/2026-11-22-merge-and-error-handling.md
  commit: 1df8e5a
---

:::note[Original record]
Imported unchanged from [`docs/devlog/2026-11-22-merge-and-error-handling.md`](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/devlog/2026-11-22-merge-and-error-handling.md) at commit `1df8e5a`. It is the project's own record; the teaching pages explain it.
:::

## Merging a stack of PRs

PRs #1–#4 were *stacked*: each one's base was the previous branch, not `main`. They were merged in order. After each merge, the next PR's base was switched to `main` (`gh pr edit N --base main`), and it was merged only after its CI was green. All four used **merge commits** rather than squash, so each commit's `Changes:` note survives on `main` for projectViewer to show. The same reasoning is in projectViewer's ADR-0007.

**Why the order matters:** if #1 had been squash-merged, #2's branch would still contain #1's original commits. GitHub would then show them again as "new" in #2, and they could conflict with the squashed copy. Merge commits avoid this, because the original commits stay part of `main`'s history.

PR #1 had no CI run, because the CI workflow itself only arrives in #2.

## Branch protection

`main` now requires a PR, plus the checks **Lint & dependency checks** and **Tests**, with "branch must be up to date" (`strict`) turned on.
- **Required approvals is 0:** GitHub doesn't let the author approve their own PR. Human review is enforced by the process instead (ADR-0004).
- **Why `strict`:** two PRs can each pass CI alone and still break `main` once combined. Requiring the branch to be up to date makes CI run on the combined result.

## Known issue #10: internal errors leaked to clients

**Test first.** A new test points the engine at a database file that doesn't exist, then calls all three risk endpoints. Before the fix, the POST endpoint's 500 response contained the **full filesystem path** of the database, copied from DuckDB's error text through `HTTPException(detail=str(exc))`. The GET and route endpoints had no handler at all.

**Fix.** One app-wide `@app.exception_handler(Exception)`:
- **Server log:** the full traceback, under a random 12-character `error_id`.
- **Client:** only `{"detail": "Internal server error", "error_id": "…"}`.

This is the standard pattern (OWASP, "Improper Error Handling"):
- **The operator** still gets everything needed to debug.
- **The user** gets an id to quote in a bug report.
- **An attacker** learns nothing about paths, SQL or library versions.

Deliberate choices:
- **One handler instead of try/except in each endpoint.** New endpoints are covered automatically, and a forgotten `try` can't reintroduce the leak.
- **`exc_info=exc` passed explicitly** instead of `logger.exception()`. `logger.exception` reads Python's "currently handled exception", and that isn't guaranteed to be set when an async handler runs. A second test checks that the log record really carries the original exception.
- **`HTTPException` (e.g. the 400 for an empty route) is unchanged.** FastAPI handles it before this handler, so deliberate client errors keep their messages.

## Also verified

The projectViewer Claude Code hook now works in real use: edits made in this session appeared live in the viewer's activity feed.

## Known issues #4, #5, #6, #11: engine and API cleanups

**Safety net first.** Before touching the scoring loop, the *complete* output of 5 queries was saved to JSON with key order kept:
- Oulu 250 m and Helsinki 2 km
- winter + Finnish
- cyclist filter in Tampere
- an empty area

After the change, the files were byte-for-byte identical. The characterization tests only pin the score and count. The snapshot also catches changes in labels, counts, tie order and dict order, which matters because the counting code was rewritten.

**Fixes (each test-first):**
- **#4, reference year.** The default is now `None`, meaning "the newest year in the data". A hard-coded `2025` would have frozen time decay when 2026 data arrives, quietly over-weighting old crashes. The value is read once per engine, because the DB is read-only while the app runs.
- **#5, naming.** `nearest_incidents` became `highest_weighted_incidents`. The old name was wrong: the list is sorted by severity × recency × proximity, not by distance. This renames an API field. The dashboard is the only known consumer, so I renamed it rather than keeping a deprecated alias. With outside users, the industry practice would be to keep both for a release and announce the change.
- **#6.** GET point accepts `lang`, typed as `Literal["en","fi"]` so FastAPI rejects other values with 422. `classify_tier` is now public, because a second module uses it. Calling `_private` methods from outside a class couples you to internals that may change.
- **#11, speed.** Only the 15 returned incidents are turned into objects with translations, using `heapq.nlargest`. Its documentation guarantees the same result as `sorted(..., reverse=True)[:15]`, including ties. Counting happens on the Finnish values; each distinct value is translated once, and counts are summed when two spellings share a label.

**Surprise: the #11 diagnosis was wrong.** The status file said the slowness was "in Python, not SQL". That came from reading the code, not from a profile. Measurements (median of 15 runs, Helsinki 2 km, 4,659 rows):

| What | Time |
|---|---|
| `evaluate_point` before | 135 ms |
| `evaluate_point` after | 124 ms |
| the SQL alone | 107 ms |
| SQL with the point passed as fixed bounds (experiment, not applied) | 95 ms |

`EXPLAIN` shows the R-tree index is used, so this isn't a missing index. Returning 4,659 rows and computing their distances simply costs that much. I didn't optimize further: Phases 1–2 replace radius queries with precomputed tiles (ADR-0003), where a lookup is a memory access.

**Lesson:** a performance claim without a profile is a guess. CLAUDE.md already says "measure, don't guess"; this time the guess had slipped in while the status file was being written.

### What the code review caught

`/code-review medium` on this branch reported 8 findings. All were checked, all were real, and all were fixed in a second commit, test-first where they were bugs:

| Finding | Why it matters | Fix |
|---|---|---|
| The response didn't say which reference year was used | A score could change after a data refresh with no visible reason, so it can't be reproduced | `RiskProfile.reference_year` |
| `MAX(year)` is NULL for an empty table | `None - None` raises a TypeError, which becomes a 500; and the cache never fills | Fall back to the calendar year; cache only an int |
| `close()` kept the cached year | Reconnecting to rebuilt data still used the old year | Reset it in `close()` |
| A breaking field rename while the API still said 1.0.0 | Clients get no signal | API version 2.0.0 |
| Route endpoint had no `lang` | Same gap as #6, missed on the second endpoint | `RouteCorridorRequest.lang` |
| Tests pinned 2025 | They would fail on correct code once 2026 data arrives: the very thing #4 removed | Compare against `MAX(year)` |
| **`reference_year=2018` still counted 2019–2025 crashes, at full weight** | "Risk as of 2018" was inflated by the future | SQL now excludes `year > reference_year` |
| Winter values spliced into the SQL text | Safe today, but one quote in a future label breaks every winter query | Passed as a list parameter (`= ANY($n)`) |

The future-crash bug existed before this branch (`max(0, age)` quietly turned negative ages into "brand new"). Making `reference_year` easier to see made it worth fixing now.

**Lesson:** the reviewer saw *consequences across time* (data refreshes, a future 2026 load), which the snapshot test can't, because it only compares today's data.

## Known issue #8: the database moves out of git ([ADR-0007](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0007-database-as-versioned-release-asset.md))

The owner chose option A, a GitHub Release asset. What was built:
- **`data/road_risk.lock.json`** pins tag, URL, SHA-256 and size. It's the data equivalent of `uv.lock`: the code names the exact bytes it expects.
- **`src/core/dataset.py`** (standard library only, so it runs before anything else is installed):
  - `fetch` downloads to a `.part` file, verifies the checksum, then renames it into place. A crash or a bad download can therefore never leave a half-written DB where the app would open it.
  - It skips the download if the local file already matches.
  - It **refuses to overwrite a different local DB**, such as a fresh re-ingest, unless given `--force`.
  - `lock <tag>` pins a rebuilt DB and prints the `gh release create` command.
- **`src/core/paths.py`:** the project paths now live in one file, because both `db.py` and the downloader need them.
- **Render** runs `python -m src.core.dataset` after `pip install`. **CI** caches the DB under `hashFiles(lock file)`, so a new data version invalidates the cache automatically.
- **Tests** use `file://` URLs, so they run without network.
  - Unit tests: download, corrupted download, already up to date, and refusing to overwrite.
  - Integration test: the local DB matches the lock. If someone rebuilds the DB and forgets to publish it, this test says so.
  - A test that git doesn't track `data/processed/`.

**Why not rewrite history to remove the old 38 MB?** It would need a force-push to a public repository. Every existing clone would then diverge, and every fork would keep the file anyway. That's destructive, for a small gain.

**Order matters when shipping this:** the Release must exist *before* the PR's CI runs, or the fetch step fails with 404.

## Data hygiene: cleaning as code, not by hand

The owner's rule: *don't clean the data yourself; write code and run it, so the system is reproducible.* So nothing in the database was edited. The rules live in `src/ingestion/clean.py`, and the database was rebuilt from the raw CSVs by running the pipeline.

### Investigate first (read-only)

| Finding | Evidence |
|---|---|
| "Missing" spelled 8 ways across 6 columns | `Ei arvoa` 16,229 / `-` 3,118 / `Unknown` 916 in surface alone; `Ei tiedossa` 102 in region |
| `heavy_vehicle`: `on`/`ei` (2014–21), `true`/`false` (2022), `kyllä`/`ei` (2023+), plus `ei arvoa` | Cross-checked: 99.8–100 % of "yes" crashes have a lorry or bus participant, 0 % of "no" crashes do. So the mapping is measured, not assumed |
| `speed_limit = -1` (5,117, 2014–21 only) vs NULL (433, 2022+) | Same meaning, two encodings |
| `accident_type`: 116 spellings, really 77 + missing | Trailing and double spaces; no letter-case variants |
| **The "duplicate ID" was two different crashes** | 9710903: fatal 2019 Joensuu, and property-damage 2020 Pieksämäki. Participant 17333514 also exists in both years (a cyclist in 2019, a car in 2020) |
| 173 crashes have no coordinates and were dropped silently; their participants became 290 orphans | Raw vs loaded reconciliation: 180,907 − 173 = 180,734 exactly |
| `ignore_errors=true` wasn't hiding anything | All 12 files parse with `ignore_errors=false` |

**The big lesson is the "duplicate".** A naive `DISTINCT` or "keep first" would have **deleted a fatal crash**. The source system reuses IDs across years, so the real key is `(year, accident_id)`. Worse, the cyclist filter joined participants on `accident_id` alone, so the 2020 crash would count as a cyclist crash because of a 2019 cyclist. Both the engine and the dashboard now join on `(year, accident_id)`.

### Design choices

- **Missing → NULL, labelled at the output.** A string such as `'Unknown'` looks like a category to SQL, to `GROUP BY` and to ML models. NULL is the standard "no value", and pandera (Phase 1) checks it natively. Translators show "Not recorded" / "Ei tiedossa".
- **Each rule is written once, as SQL.** Participants used to be cleaned in pandas and accidents in SQL; two copies of a rule drift apart. Now pandas only *reads* (it handles the UTF-16 2025 file) and everything goes through the same SQL functions.
- **An unknown spelling stops the build.** `heavy_vehicle` uses DuckDB's `error()` for values it hasn't seen. When Väylävirasto changes its format again (it already has, twice), we find out at ingestion instead of silently mapping it to NULL.
- **Quarantine, not deletion.** Unusable rows go to `ingest_rejects` with a reason (`no_coordinates`, `crash_not_loaded`), so losses are counted and auditable.
- **Lineage.** `ingest_files` stores each raw file's SHA-256 and its read/loaded/rejected counts. Anyone with the same raw files can prove they have the same inputs.
- **Atomic build.** The pipeline writes `road_risk.duckdb.building` and renames it into place only on success. A failed build leaves the old database untouched; a test covers this.
- **A strict parser.** `ignore_errors=false`, so a malformed row stops the build instead of vanishing.

### Proof

- **Reproducible:** two builds from the real raw data gave identical content fingerprints for all three tables (`road_accidents 4bb7f692…`, `accident_participants c90229e1…`, `ingest_rejects c378843c…`). The `.duckdb` file isn't byte-stable between builds, so the fingerprint hashes the *contents* in a fixed order.
- **Nothing lost:** all 180,734 crashes are identical by year, ID and coordinates. Every NULL count equals the sum of the old spellings, for example region 4,014 = 3,912 + 102.
- **Scores unchanged:** for the 5 snapshot queries, every total, score and tier is identical. Only the breakdowns changed, and they're now correct:
  - Helsinki "Not recorded" went from 602 to 623: missing data was under-counted.
  - In the Helsinki winter query, "rear-end into braking vehicle" was split 7 + 4 by a trailing space. As one category of 11 it's the top crash type, which the old list hid.
- **Tests:** 111 pass. The synthetic-CSV tests cover every rule in both file formats, the rejects, the logging, a reproducible double build, the failed-build case, and the cross-year filter bug.

The new database is pinned as `data-2026-11-22` and has to be uploaded as a release before CI on this PR can fetch it.

### What the code review caught (data hygiene)

`/code-review medium` reported 9 findings. One was the not-yet-uploaded release, which is an owner step. The other 8 were fixed, test-first where they were behaviour:

- **The documented rebuild command crashed** (`ModuleNotFoundError: src`): it ran the file as a script, so `src` wasn't importable. It's now `python -m src.ingestion.ingest_all`. My own runs had used `PYTHONPATH=.`, which hid the problem: a reminder to test the *documented* command, not your own variant.
- **Accident IDs were parsed by DuckDB's type detection, participant IDs as text by pandas.** A leading zero would stop them joining. Every accident column is now read as text (`all_varchar`). Today's data happened to be unaffected, but by luck.
- **`TRY_CAST` turned a garbled coordinate into "no coordinates",** and a bad month into NULL. That broke the "nothing silently" promise. Now `bad_coordinates` is its own reject reason, and an impossible month stops the build.
- **A stale `road_risk.duckdb.wal`** from a crashed writer could be replayed onto the new file. It's removed before the swap.
- **Smaller fixes:** a truncated download now says "incomplete" instead of "checksum mismatch"; road-user filters normalise inner whitespace; visible `﻿` escapes replace invisible BOM characters; and ADR-0008 records the key and missing-value decision.

**Verification:** rebuilt from the real raw files with the documented command; the content fingerprints are identical to the first clean build. So the fixes changed nothing in today's data and only guard against future files. 117 tests pass.
