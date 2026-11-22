---
title: 'ADR-0003: DuckDB is the offline "data factory"; the car uses precomputed
  in-memory risk tiles'
sidebar:
  order: 3
  label: 0003 · DuckDB is the offline "data factory"; the car uses precomputed
    in-memory risk tiles
record:
  project: road-risk
  kind: decisions
  source: https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0003-duckdb-as-data-factory-precomputed-tiles-in-car.md
  commit: 1df8e5a
---

:::note[Original record]
Imported unchanged from [`docs/decisions/0003-duckdb-as-data-factory-precomputed-tiles-in-car.md`](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0003-duckdb-as-data-factory-precomputed-tiles-in-car.md) at commit `1df8e5a`. It is the project's own record; the teaching pages explain it.
:::

- **Status:** Accepted
- **Date:** 2026-11-21
- **Phase:** 0 (quick fix), 1–2 (segment precompute), 8 (on-device tiles)

## Context

The question: is the current stack (DuckDB + spatial extension, FastAPI, Streamlit) fast enough for the goal, or does something need to change?

Benchmark on 2026-11-21: Apple M3, 16 GB, DuckDB 2.0.0, scratch copy of the DB with 180,734 crashes. Median of 25 lookups at 5 Finnish city points:

| Approach | Latency per point |
|---|---|
| Current `SpatialRiskEngine.evaluate_point`, 250 m | 78 ms (max 118 ms) |
| Current, 2 km | 124 ms (max 239 ms) |
| …of which: new connection + `LOAD spatial` per call | ~56 ms |
| Same SQL, one persistent connection (R-tree is used) | 12.5 ms |
| All crash coordinates in memory (2.9 MB), numpy scan | 0.3 ms |
| In-memory KD-tree | 0.004 ms |

The in-car system needs to check about 2 km of road ahead, many times per second, on modest hardware, offline.

## Options considered

1. **Run a database query live in the car for every GPS update.** Simple, but it does heavy work at the worst possible moment, needs a database engine and spatial extensions on the device, and is slowest.
2. **Swap DuckDB for another database** (PostGIS, SpatiaLite). Doesn't solve the real problem: the risk would still be computed on demand.
3. **Split the system in two:**
   - In the cloud, DuckDB does the heavy work offline: ingestion, joins, statistics, model training. It outputs *precomputed* risk per road segment × condition bucket.
   - In the car, those small tiles are loaded into memory and looked up in microseconds, then adjusted for live conditions by a small ONNX model.

## Decision

Option 3, plus an immediate quick fix: reuse one DuckDB connection in the API/engine (about 6× faster) during Phase 0.

## Reasoning

- **The measurements show the database isn't slow; the design is.** Most of the time goes to reconnecting, and the remaining 12 ms goes to computing on demand something that changes only once a year. Precomputing turns a 78 ms query into a lookup of a few microseconds.
- **The data is small.** All crash coordinates for Finland take 2.9 MB. Per-segment risk tables for a region will be small enough for any car head unit.
- **DuckDB is the right tool for its actual job.** It is very fast for analytics on one machine (columnar storage, vectorised execution), needs no server, has good spatial support, and reads CSV/Parquet directly. So we keep it for ingestion, analysis, training data and building tiles.
- **Offline first.** Tiles can be cached per region and updated over the air as versioned deltas.
- Learning point: performance usually comes from *architecture* (when and where work happens) more than from tuning one query.

## Consequences

- **Phase 0:** persistent connection; install the spatial extension where it is used (also fixes the fresh-server bug).
- **Phases 1–2:** risk becomes a table keyed by road segment + condition bucket (lighting × surface × season, and so on).
- **Phase 8:** design a tile format (SQLite or flatbuffers per region) with versioning and delta updates.
- **The dashboard keeps using DuckDB live.** That is fine for analysis, where 10–100 ms does not matter.
- **Tiles become stale between rebuilds.** Live data (Phase 3) covers short-term changes; yearly crash data only changes the tiles once a year anyway.
- **Revisit if** the risk model needs inputs that cannot be bucketed in advance. Even then, only that small model runs live, not a database query.
