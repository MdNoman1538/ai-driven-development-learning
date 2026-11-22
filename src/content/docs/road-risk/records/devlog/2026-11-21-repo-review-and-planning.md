---
title: 2026-11-21 — Repo review, data checks and planning
sidebar:
  order: 20261121
  label: 2026-11-21 — Repo review, data checks and planning
record:
  project: road-risk
  kind: devlog
  source: https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/devlog/2026-11-21-repo-review-and-planning.md
  commit: 1df8e5a
---

:::note[Original record]
Imported unchanged from [`docs/devlog/2026-11-21-repo-review-and-planning.md`](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/devlog/2026-11-21-repo-review-and-planning.md) at commit `1df8e5a`. It is the project's own record; the teaching pages explain it.
:::

## Goal of the session

Review the existing project, check whether it suits the new goal (an in-car real-time risk alert system using a small LLM where appropriate), and write a phased roadmap. Also set up this documentation folder.

## Starting point

A spatial analytics prototype: DuckDB with 180,734 crashes (2014–2025), a risk engine based on radius search, FastAPI, and a Finnish/English Streamlit + Folium dashboard deployed on Render. Details in [project-status.md](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/project-status.md).

## What we did and what we found

### 1. Full code and data review
Read all source files, the config files and the git history. Looked at the value distributions in the DB and the raw CSV headers.

Main findings, in order of how much they change the plan:
- **Counting crashes is not measuring risk.** The engine counts crashes in a circle, so busy roads always look dangerous. We need traffic exposure. The 2014–21 data has `Kvl` (average daily traffic), which is not ingested.
- **Circles are not roads.** A radius search mixes in crashes from parallel streets and underpasses. The car needs to know which road and direction it is on, so map-matching becomes part of Phase 1.
- **The recording rules changed between years.** Yearly counts fall from 28k (2014) to 8.6k (2025), and "severe injury" only exists from 2022. This is a change in what gets recorded, not a real 3× improvement in safety.

### 2. "Is there a time-of-day field?"
Expected one. **There isn't**, in any year. `Luovpvm` looked promising but holds dates like 1965-12-01: it's the road record's creation date.

The user's observation was the key insight: *lighting* matters more than the clock, and we can compute it live from time + location. We demonstrated it with a ~30-line NOAA solar-position script. Oulu on 21 December: 4 h daylight, 2 h twilight, 18 h dark.

Two consequences:
- Whether a road is lit (`tie valaistu` vs `pimeä`) is a property of the road, not of time.
- Darkness needs an exposure correction, because 18 dark hours a day means many dark crashes are expected anyway.

→ [ADR-0002](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0002-lighting-from-sun-position-instead-of-clock-time.md)

### 3. Did ingestion silently lose data?
`ingest_all.py` uses `ignore_errors=true`, which could hide dropped rows. We compared raw CSV row counts with DB counts for each year: 173 rows were missing, 92 of them in 2022. All 173 have no coordinates; a strict CSV read (no ignored errors) of 2022 succeeds. **No data was lost to parse errors.** Dropping rows without a location is correct, but it should be logged rather than silent (Phase 1 data checks).

### 4. The deployed API is broken on a fresh server
Commit 7a0dd11 added `INSTALL spatial` only to the dashboard's hotspot function. The engine's connection still only runs `LOAD spatial`. We reproduced a fresh server by pointing DuckDB at an empty extension directory: `IO Error: Extension ... not found`.

`/health` doesn't touch the DB, so Render reports the API as healthy while the risk endpoints fail. The dashboard works only because the hotspot function happens to run first.

*Lesson:* a health check must exercise the real dependencies, and tests should run on a clean environment. That's what CI is for. First task of Phase 0.

### 5. Is the current stack fast enough?
Measured instead of guessing (full table in [ADR-0003](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0003-duckdb-as-data-factory-precomputed-tiles-in-car.md)):
- Current point lookup: ~78 ms. About 56 ms of that is reconnecting and reloading the spatial extension on every call.
- Persistent connection: 12.5 ms.
- In-memory KD-tree: 0.004 ms.

Conclusion:
- DuckDB is the right tool for the cloud/offline side.
- The car should not query a database at all; it should load precomputed risk per road segment and look it up in memory.
- Speed comes from architecture, not from query tuning.

## Decisions made
- [ADR-0001](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0001-llm-is-not-the-risk-decision-maker.md): the LLM explains, extracts and converses; it never makes the safety decision.
- [ADR-0002](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0002-lighting-from-sun-position-instead-of-clock-time.md): lighting from sun position instead of clock time.
- [ADR-0003](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0003-duckdb-as-data-factory-precomputed-tiles-in-car.md): DuckDB as the data factory; precomputed in-memory tiles in the car.

## Environment notes
- Apple M3, 16 GB RAM, conda env `ailearn`, DuckDB 2.0.0.
- Qwen3.5-4B (OptiQ 4-bit) and Qwen3.5-9B (4-bit) MLX models are downloaded but not served yet. The 4B model is the main candidate for local LoRA fine-tuning.

## Open questions
- **Licensing:** CC BY-NC blocks industry use. Keep it for the portfolio, or change it before approaching companies?
- **First hardware target** for Phase 8: Raspberry Pi 5, Jetson Orin Nano, or straight to an Android phone app?
- **Lit roads:** does Digiroad provide a usable lit-road attribute nationwide, or do we infer it from crash history?

## Next
Phase 0: fix the spatial-extension bug together with a test that would have caught it, persistent connection, project tooling (pyproject + uv, ruff, pytest, CI).
