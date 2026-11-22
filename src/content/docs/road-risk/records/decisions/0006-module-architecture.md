---
title: "ADR-0006: Module architecture: one job per top-level module"
sidebar:
  order: 6
  label: "0006 · Module architecture: one job per top-level module"
record:
  project: road-risk
  kind: decisions
  source: https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0006-module-architecture.md
  commit: 1df8e5a
---

:::note[Original record]
Imported unchanged from [`docs/decisions/0006-module-architecture.md`](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0006-module-architecture.md) at commit `1df8e5a`. It is the project's own record; the teaching pages explain it.
:::

- **Status:** Accepted
- **Date:** 2026-11-21

## Context

The code was organised by history, not by job:
- `src/spatial/` held the ingestion pipeline, five one-off exploration scripts, and an empty `init_db.py`, but no spatial logic.
- `src/db.py` sat loose at the top.
- A script named `test_spatial_query.py` lived in `src/` and looked like a test.

Seen as a map of modules (projectViewer), "spatial" was the biggest block while doing something else. The owner asked for a structure where folders are meaningful modules (ui, processing/ingestion, engine, scoring, spatial, api …), visible the same way in the code and on the map.

## Options considered

1. **Keep the layout and document it.** Cheap, but the structure keeps misleading readers and tools.
2. **Layered folders** (`presentation/`, `domain/`, `infrastructure/`). Generic; hides what the product *does*.
3. **One folder per job (feature/capability modules):** `core`, `ingestion`, `scoring`, `i18n`, `api`, `ui` now; later `spatial`, `context`, `engine`, `llm` when their code arrives.

## Decision

Option 3, with these rules:
- **One job per top-level module**, named for that job.
- **Dependencies point one way:** `api` and `ui` depend on `scoring`; `scoring` depends on `core` and `i18n`. Nothing depends on `api` or `ui`.
- **No empty placeholder modules.** A module appears with its first real code.
- **Exploration scripts live in `scripts/exploration/`**, outside the application package.
- **Paths are computed from `__file__` and guarded by tests** (`tests/test_project_layout.py`), because a wrong `parents[n]` silently points at the wrong folder.

Moves:
- `src/db.py` → `src/core/db.py`
- `src/spatial/ingest_all.py` → `src/ingestion/ingest_all.py`
- `src/spatial/{check_coords,check_schemas,inspect_raw_data}.py` → `scripts/exploration/`
- `src/spatial/test_spatial_query.py` → `scripts/exploration/spatial_query_demo.py`
- `src/spatial/init_db.py` (empty): deleted

The target module map is in [docs/architecture.md](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/architecture.md).

## Consequences

- **Imports changed** from `src.db` to `src.core.db`. Render start commands are unchanged (`src/api/main.py`, `src/ui/app.py`).
- **`spatial/` is gone for now** and returns in Phase 1 with real geometry code (H3, map-matching).
- **Moves appear in history as renames** (`git mv`). In projectViewer's change view they currently show as removed + new, because node IDs come from file paths.
- **Revisit if** a module grows past one job. Then split it, don't add sub-layers.
