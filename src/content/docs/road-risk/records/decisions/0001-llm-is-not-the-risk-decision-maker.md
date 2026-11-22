---
title: "ADR-0001: The LLM is not the risk decision-maker"
sidebar:
  order: 1
  label: 0001 · The LLM is not the risk decision-maker
record:
  project: road-risk
  kind: decisions
  source: https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0001-llm-is-not-the-risk-decision-maker.md
  commit: 1df8e5a
---

:::note[Original record]
Imported unchanged from [`docs/decisions/0001-llm-is-not-the-risk-decision-maker.md`](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0001-llm-is-not-the-risk-decision-maker.md) at commit `1df8e5a`. It is the project's own record; the teaching pages explain it.
:::

- **Status:** Accepted
- **Date:** 2026-11-21
- **Phase:** cross-cutting (affects Phases 4–8)

## Context

The product warns drivers about risky road segments and junctions ahead. We want to use small LLMs (Qwen) where they add value, and this is also a learning project in modern LLM techniques. That creates a temptation to let the LLM "decide" the risk.

An in-car safety advisory has hard requirements:
- **Latency.** A decision is needed within tens of milliseconds, repeatedly, while driving. Even a quantized 4B model takes hundreds of milliseconds to seconds to produce a response.
- **Determinism and testability.** The same input must give the same output, so we can test it, measure false-alarm rates and certify it.
- **Calibration.** "High risk" must mean a measurable, consistent level of risk.
- **Offline operation and constrained hardware.**
- **Safety assessment** (ISO 26262 / SOTIF) is far harder for free-text generative output.

## Options considered

1. **The LLM decides risk from raw context** (location, weather, history in the prompt). Flexible and impressive in a demo. But slow, non-deterministic, uncalibrated, hard to test, can hallucinate.
2. **Statistical/ML model decides; the LLM explains and converses.** Fast, testable, calibrated. The LLM is used only where language is the actual task.
3. **No LLM at all.** Simplest, but loses explanations, driver Q&A, Finnish traffic-message understanding, and the learning goal.

## Decision

Option 2. The risk decision and the alert trigger come from deterministic code plus a calibrated statistical/ML model. The LLM is used for:
- extracting structured hazards from free-text traffic messages,
- explaining why an alert fired (preferably pre-generated offline and looked up at runtime),
- driver Q&A through tool calling,
- RAG over road fact sheets and guidance,
- consistent Finnish/English alert wording (LoRA fine-tune).

## Reasoning

LLMs are good at language and bad at being fast, repeatable numeric decision-makers. Using them for language, and keeping them away from the safety decision, gets the benefits of both. It is also how production AI systems in safety-relevant domains are built, and "knowing where not to use an LLM" is a core skill for an AI engineer.

## Consequences

- We need a real statistical/ML modelling track (Phases 2 and 4). That is more work, but it is also valuable learning.
- The LLM's output never blocks or triggers an alert. If the LLM fails or is unavailable, alerts still work. A template-based explanation is the fallback.
- Evals for the LLM measure faithfulness to the model's actual decision. An explanation must never contradict the risk engine.
- **Revisit if:** on-device LLMs become fast and verifiable enough *and* a safety argument for them exists. Even then, the LLM would most likely only add features, not replace the calibrated model.
