---
title: Roadmap
sidebar:
  order: 1
  label: Roadmap
record:
  project: road-risk
  kind: overview
  source: https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/roadmap.md
  commit: 1df8e5a
---

:::note[Original record]
Imported unchanged from [`docs/roadmap.md`](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/roadmap.md) at commit `1df8e5a`. It is the project's own record; the teaching pages explain it.
:::

**Created:** 2026-11-21 · Status of each phase is tracked in [project-status.md](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/project-status.md).

## Product goal

> Warn the driver **15–20 seconds before** a road segment or junction whose risk **under current conditions** (lighting, road surface, weather, season) is above a set threshold. Works **offline**, decides in **under 50 ms**, keeps false alarms **below 1 per 100 km**, and every alert can be **explained**.

The project is also a learning path and a portfolio, so every phase ends with a working demo and a write-up in [devlog/](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/tree/main/docs/devlog/).

## Guiding principles

1. **The LLM never makes the safety decision.** Risk comes from fast, testable, calibrated statistical/ML models. The small LLM handles language: explanations, driver Q&A, extracting hazards from traffic messages, alert wording. → [ADR-0001](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0001-llm-is-not-the-risk-decision-maker.md)
2. **Only use features the car can also know live.** Every model input must have a live source in the car, otherwise the model behaves differently in the car than in training (training/serving skew).
3. **Precompute in the cloud, look up in the car.** → [ADR-0003](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0003-duckdb-as-data-factory-precomputed-tiles-in-car.md)
4. **Offline first.** The car must still warn without connectivity. Live data improves the result but must not be required.
5. **Risk = crashes relative to exposure.** Never use raw counts alone.

## Target architecture

```
┌──────────────────────── CLOUD (build & update) ─────────────────────────┐
│ Crash data (yearly) ─┐                                                  │
│ Road network (Digiroad/OSM) ─┼─► Data pipeline ─► Feature store ─► Train│
│ Traffic volumes ─────┘     (raw → clean → ready)        model (LightGBM)│
│ Historical weather (FMI) ──────────────────────────────►     │          │
│                                                              ▼          │
│              Risk tiles per road segment × condition  ◄── Model registry│
│              + alert texts + RAG index  ──► over-the-air update to car  │
└─────────────────────────────────────────────────────────────────────────┘
                                   │ (versioned delta updates)
┌──────────────────────── IN THE CAR (runs offline) ──────────────────────┐
│ GPS 1–10 Hz ─► Kalman filter ─► Map-matching ─► Road ahead (next 2 km)  │
│                                                       │                 │
│ Live context: sun position (computed locally),        ▼                 │
│ road weather (Digitraffic), FMI forecast ──► Conditional risk model     │
│ speed, temperature from CAN bus              (ONNX, <10 ms)             │
│                                                       │                 │
│                                                       ▼                 │
│                         Alert policy (timing, repeat-suppression,       │
│                         cooldown, no spam) ──► dashboard icon + chime   │
│                                                       │                 │
│               Small LLM (Qwen, 4-bit) ◄── "why?" questions,             │
│               explanations, voice (Piper TTS, Finnish/English)          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Where the LLM is used, and where it is not

| Job | LLM? | Tool |
|---|---|---|
| Is the segment ahead risky right now? | No | Statistical model + gradient-boosted trees |
| Which road is the car on, what is ahead | No | Map-matching + road graph |
| When to alert, when to stay quiet | No | State machine |
| Turn Finnish traffic messages into structured hazards | Yes | Small LLM + structured output |
| Explain why an alert fired | Yes | Small LLM, ideally pre-generated offline |
| Driver Q&A ("how's the road to Rovaniemi tonight?") | Yes | Agent + tool calling (MCP) |
| Answer from guidance and road fact sheets | Yes | RAG (hybrid search + reranker) |
| Consistent, short Finnish/English alert style | Yes | LoRA fine-tune |

### Historical columns and their live counterparts

| Historical column | Live source in the car |
|---|---|
| `Valoisuus` (lighting) | Sun position (computed) + streetlight presence on the segment |
| `Pinta` (surface) | Digitraffic road weather stations and surface forecasts |
| `Sää` (weather) | FMI observations, or the car's rain sensor |
| `Lämpötila` (temperature) | Car's outside temperature sensor, or FMI |
| `Kuukausi`, `Viikonpäivä` (month, weekday) | Car clock |
| `Nopeusrajoitus` (speed limit) | Digiroad, or the car's sign recognition |
| `Tietyö` (roadworks) | Digitraffic traffic messages |

## Phases

Durations assume part-time work. Each phase is finished only when its exit criteria are met.

### Phase 0 — Engineering foundations
*~1–2 weeks*
- **Build:**
  - Development workflow ([ADR-0004](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0004-development-workflow.md)): `CLAUDE.md`, `CONTRIBUTING.md`, PR and issue templates, branch protection on `main`, roadmap tasks as GitHub Issues.
  - Fix the `INSTALL spatial` bug test-first (failing test → fix).
  - Persistent DB connection.
  - Switch to `pyproject.toml` + `uv`, add `ruff`, `pytest`, pre-commit hooks, GitHub Actions CI.
  - A config module and structured logging.
  - Move the `.duckdb` file out of git (DVC or a release asset).
  - Clean up the "missing" spellings and the duplicate ID; make the reference year dynamic.
  - Turn the exploration scripts into tests.
- **Learn:** packaging, testing, CI, git workflow, AI-assisted development (spec → tests → review the diff).
- **Exit:** CI green on a clean machine; API works on a fresh environment; setup in one command; `main` protected and all changes arriving through PRs.
- **Planned PRs:**
  1. Workflow and docs
  2. Tooling and CI
  3. Spatial-extension fix + persistent connection + deep health check
  4. Data hygiene
  5. DB file out of git
  6. Exploration scripts → tests

### Phase 1 — Data foundation v2
*~3–4 weeks*
- **Build:**
  - Ingest the useful columns that are missing today, and line up the severity categories across the old and new file formats.
  - Load the road network (Digiroad or OSM via `osmnx`), map-match every crash to a segment or junction.
  - H3 hexagon index, traffic exposure (`Kvl` plus traffic-count data).
  - `pandera` data checks and a data-quality report.
  - A sun-position module with tests.
- **Learn:** coordinate systems, spatial indexes, road graphs, the raw→clean→ready (medallion) layers, data contracts.
- **Exit:** every crash has a segment ID; segment-level risk map in the dashboard.

### Phase 2 — Statistical risk baseline
*~3 weeks*
- **Build:**
  - Safety performance functions: negative binomial regression with traffic exposure.
  - Empirical Bayes risk per segment and junction.
  - Risk under each condition (lighting / surface / season), using sun-position × hourly traffic profiles to estimate exposure.
- **Learn:** Poisson and negative binomial models, base rates, Simpson's paradox, shrinkage.
- **Exit:** the dashboard can say "this corner: N× normal risk when dark + icy, M× in daylight", with confidence intervals.

### Phase 3 — Real-time context service
*~2–3 weeks*
- **Build:** async collectors for Digitraffic (road weather, forecasts, traffic messages, traffic counts) and FMI; Redis cache; a context API.
- **Learn:** async Python, rate limits, caching, API schema changes, what happens when a source fails.
- **Exit:** current conditions for any point in under 100 ms from cache; sensible behaviour when sources are down.

### Phase 4 — ML conditional risk model
*~4 weeks*
- **Build:**
  - Case-control sampling (crashes vs. sampled normal-traffic moments at the same places).
  - LightGBM with monotonic constraints.
  - Validation split by time and by area, so test data never leaks into training.
  - Calibration (isotonic), SHAP explanations, MLflow tracking, ONNX export.
- **Learn:** the ML lifecycle, leakage, class imbalance, calibration, explainability.
- **Exit:** a calibrated model that beats the Phase 2 baseline on held-out years; ONNX inference under 10 ms.

### Phase 5 — Road-ahead & alert engine (product core)
*~4 weeks*
- **Build:**
  - GPS track replay from GPX files, Kalman filter, HMM map-matching.
  - Look-ahead along the road graph (the "electronic horizon"; industry standard: ADASIS).
  - Alert state machine (time-to-arrival, suppressing repeats, cooldown).
  - A drive-replay simulator in the dashboard.
- **Learn:** real-time systems, latency budgets, state machines, alert fatigue.
- **Exit:** replayed drives meet the targets for latency, alerts per 100 km and false-alarm rate.

### Phase 6 — LLM layer v1, no fine-tuning
*~4 weeks*
- **Build:**
  - Serve Qwen3.5-4B with `mlx_lm.server` (OpenAI-compatible API).
  - Structured JSON output to extract hazards from traffic messages.
  - A tool-calling co-pilot, and an MCP server exposing the risk tools.
  - RAG over road fact sheets, traffic messages and guidance: hybrid BM25 + multilingual embeddings, plus a reranker.
  - An evaluation harness (golden set, LLM-as-judge, faithfulness checks) and guardrails.
- **Learn:** prompting, structured output, function calling, agents, RAG vs tools, evals.
- **Exit:** "why did you warn me?" answered correctly with citations on the eval set.

### Phase 7 — Fine-tuning the small LLM
*~3–4 weeks*
- **Build:**
  - Build the dataset by distilling from a larger "teacher" model (9B or frontier), then review it by hand.
  - LoRA/QLoRA with `mlx_lm.lora` on the M3; optionally DPO.
  - Compare base vs fine-tuned on the evals, then try a smaller 0.6–1.7B model.
- **Learn:** how LoRA works, data curation, overfitting, catastrophic forgetting, distillation, quantization.
- **Exit:** a small fine-tuned model matches the larger one on our task evals at a fraction of the latency.

### Phase 8 — Edge deployment
*~4–6 weeks*
- **Build:**
  - Region risk tiles (SQLite or flatbuffers), ONNX Runtime, llama.cpp (GGUF) or ExecuTorch, offline TTS with Piper.
  - Hardware path: Raspberry Pi 5 or Jetson Orin Nano + USB GPS → Android Automotive OS emulator → Android Auto phone app.
  - Over-the-air delta updates.
- **Learn:** edge runtimes, memory/thermal limits, offline-first design, Android basics.
- **Exit:** a real drive with working alerts and no internet.

### Phase 9 — MLOps & continuous learning
*ongoing*
- **Build:**
  - Prefect or Dagster pipelines for new yearly data and live feeds.
  - Data and model versioning, drift monitoring, automatic retraining, tile rebuilds, canary releases.
  - Privacy-preserving fleet feedback (dismissed alerts, hard braking).
- **Exit:** new yearly data flows to the car with no manual steps.

### Phase 10 — Industry readiness
*ongoing, starts alongside Phase 5*
- **Safety:** ISO 26262 (functional safety; an advisory system is likely the lowest level, QM, but it must be documented), ISO 21448 SOTIF (safety risks from the system's limits rather than faults), a hazard analysis.
- **Driver distraction:** European HMI guidelines (ESoP).
- **Cybersecurity and software updates:** UNECE R155/R156.
- **Privacy:** GDPR impact assessment, since location is personal data.
- **Docs and licensing:** model cards, a decision on the license.

## Career mapping

| Phases | Role | Skills shown |
|---|---|---|
| 0–1, 3 | Data engineer | Pipelines, geospatial, data quality |
| 2, 4 | ML engineer / data scientist | Statistics, modelling, validation, calibration |
| 6–7 | LLM / AI engineer | RAG, agents, MCP, evals, LoRA, distillation |
| 5, 8 | Edge AI engineer | Quantization, on-device runtimes, latency |
| 9–10 | ML platform / tech lead | MLOps, safety, system design |
