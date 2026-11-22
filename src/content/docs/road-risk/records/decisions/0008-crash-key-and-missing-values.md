---
title: "ADR-0008: Crashes are keyed by (year, accident_id); missing values are
  NULL; cleaning is code"
sidebar:
  order: 8
  label: 0008 · Crashes are keyed by (year, accident_id); missing values are NULL;
    cleaning is code
record:
  project: road-risk
  kind: decisions
  source: https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0008-crash-key-and-missing-values.md
  commit: 1df8e5a
---

:::note[Original record]
Imported unchanged from [`docs/decisions/0008-crash-key-and-missing-values.md`](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0008-crash-key-and-missing-values.md) at commit `1df8e5a`. It is the project's own record; the teaching pages explain it.
:::

- **Status:** Accepted
- **Date:** 2026-11-22
- **Phase:** 0

## Context

Profiling the 2014–2025 data (devlog 2026-11-22) found:
- "Missing" spelled 8 ways (`Ei arvoa`, `-`, `Unknown`, `Ei tiedossa`, …)
- `heavy_vehicle` in 3 encodings across eras
- `-1` used as a sentinel for "no speed limit recorded"
- an apparent duplicate `accident_id`

The duplicate turned out to be **two different crashes**: fatal Joensuu 2019 and property-damage Pieksämäki 2020. Participant IDs repeat across years in the same way. The source system's IDs are unique only within a year.

Every later phase builds on these tables: road-segment matching, exposure, Empirical Bayes, ML features and tiles. Changing the key or the missing-value convention later would touch all of them.

## Options considered

1. **Keep `accident_id` as the key and drop or merge the duplicate.** Simple, but it deletes a real fatal crash, and participant joins stay ambiguous.
2. **A synthetic key** (e.g. `'2019-9710903'`). Unique, but it hides the source ID and needs a translation everywhere the source is referenced.
3. **The composite key `(year, accident_id)`.** Both are source values, and participants get their year from their own file.

For missing values:
1. **One canonical string** (`'Unknown'`). Easy to display, but SQL, `GROUP BY` and ML encoders treat it as a real category.
2. **NULL in storage, a label at the output layer.** Standard SQL semantics; data-quality tools (pandera) check nullability natively.

For where cleaning happens:
1. **Fix the database in place** (UPDATE statements, by hand or in a notebook). Not reproducible, and lost on the next rebuild.
2. **Rules in the ingestion code; the DB is always rebuilt from raw.**

## Decision

- The key is **`(year, accident_id)`** in `road_accidents` and `accident_participants`, and every join uses both.
- **Missing is NULL** in every column. `heavy_vehicle` is a BOOLEAN; integer sentinels become NULL. Translators label NULL "Not recorded" / "Ei tiedossa".
- **Cleaning rules live only in `src/ingestion/clean.py`,** each written once as SQL. The database is only ever produced by `python -m src.ingestion.ingest_all` from the raw files.
  - Unusable rows go to `ingest_rejects` with a reason.
  - Raw files are recorded in `ingest_files` with their SHA-256.
  - An unseen category spelling or an impossible value stops the build.

## Reasoning

- **No real crash is ever deleted to make a key unique.** The composite key keeps the source's own values, so any row can still be looked up in Väylävirasto's files.
- **NULL is the representation every downstream tool understands:** SQL, pandas, pandera, scikit-learn and ONNX feature pipelines. A string such as "Unknown" would quietly become a model feature.
- **Reproducibility is a safety property here.** A risk number shown to a driver has to trace back to specific raw files and specific code. Hand edits break that chain; rebuild-from-raw plus file checksums keeps it. Two builds from the same files give identical content fingerprints.
- **Failing loudly on unseen values.** Väylävirasto has already changed formats twice (2022, 2023). A new spelling should stop the build, not become NULL without anyone noticing.

## Consequences

- **Easier:** joins are correct across years; data-quality checks (Phase 1) can assert "no missing-like strings"; data losses are counted; any build can be audited.
- **Harder:** every query that joins participants must use both columns (the engine and dashboard do now). A format change in new raw files can stop the build until a rule is added, which is deliberate.
- **Next:** Phase 1's pandera contracts should encode these conventions: key uniqueness, nullability, allowed category values.
- **Revisit if:** Väylävirasto publishes globally unique IDs, or the data starts arriving as a stream, not yearly files.
