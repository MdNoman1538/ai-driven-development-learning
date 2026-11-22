---
title: Architecture
sidebar:
  order: 3
  label: Architecture
record:
  project: road-risk
  kind: overview
  source: https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/architecture.md
  commit: 1df8e5a
---

:::note[Original record]
Imported unchanged from [`docs/architecture.md`](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/architecture.md) at commit `1df8e5a`. It is the project's own record; the teaching pages explain it.
:::

**As of:** 2026-11-21. Module rules: [ADR-0006](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0006-module-architecture.md). Product goal and phases: [roadmap.md](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/roadmap.md).

## Modules today

```
src/
├── core/        shared infrastructure: DuckDB connection with the spatial extension (db.py)
├── ingestion/   raw open crash data (CSV, 2014–2025) → DuckDB spatial warehouse (ingest_all.py)
├── scoring/     risk engine: crashes near a point → risk score and tier (risk_engine.py)
├── i18n/        Finnish ↔ English labels (translator.py)
├── api/         FastAPI service: health, point risk, route risk (main.py)
└── ui/          Streamlit dashboard for exploration and demos (app.py)
scripts/
└── exploration/ one-off data inspection scripts (not part of the app)
tests/           unit + integration tests (pytest)
```

**Dependencies point one way: `api`, `ui` → `scoring` → `core`, `i18n`.** Nothing in `core` or `scoring` imports `api` or `ui`. `ingestion` uses only `core`'s paths and DuckDB.

```
   ui ─────┐
           ├──► scoring ──► core (db)
   api ────┘        └─────► i18n
   ingestion ─────────────► core (paths)
```

## Target modules: the in-car warning system

Each roadmap phase adds a module with **one job**. A module is created when its first real code arrives, never as an empty placeholder.

| Module | Job | Arrives in |
|---|---|---|
| `core/` | Connections, configuration, paths, logging | now |
| `ingestion/` | Crash data, road network (Digiroad/OSM), traffic volumes → warehouse | now; extended in Phase 1 |
| `spatial/` | Geometry: H3 cells, map-matching crashes and GPS to road segments, road graph | Phase 1 |
| `scoring/` | Risk per segment: Empirical Bayes baseline (Phase 2), calibrated ML model (Phase 4) | now; replaced in Phases 2/4 |
| `context/` | Live conditions: sun position → lighting, road weather, forecasts, traffic messages | Phases 1 (sun), 3 (live data) |
| `engine/` | In-car runtime: GPS filtering, road ahead ("electronic horizon"), alert policy | Phase 5 |
| `llm/` | Small-LLM features: explanations, hazard extraction, Q&A (never the safety decision, ADR-0001) | Phases 6–7 |
| `api/` | Cloud/service API | now |
| `ui/` | Dashboard and the drive-replay simulator | now; simulator in Phase 5 |
| `i18n/` | Finnish/English text | now |

**Safety-relevant flow (Phase 5 onward):**

```
GPS → engine (map-match, road ahead) → scoring (risk per segment × context) → engine (alert policy) → driver
                                         ▲
                       context (lighting, weather, surface)
llm only explains alerts afterwards and never sits on this path (ADR-0001)
```

## How to see it

This project is mapped live by projectViewer (a separate local tool): the top-level blocks are exactly the modules above, sized by number of functions.
