---
title: "ADR-0002: Use lighting condition (from sun position) instead of clock time"
sidebar:
  order: 2
  label: 0002 · Use lighting condition (from sun position) instead of clock time
record:
  project: road-risk
  kind: decisions
  source: https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0002-lighting-from-sun-position-instead-of-clock-time.md
  commit: 1df8e5a
---

:::note[Original record]
Imported unchanged from [`docs/decisions/0002-lighting-from-sun-position-instead-of-clock-time.md`](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0002-lighting-from-sun-position-instead-of-clock-time.md) at commit `1df8e5a`. It is the project's own record; the teaching pages explain it.
:::

- **Status:** Accepted
- **Date:** 2026-11-21
- **Phase:** 1 (sun-position module), 2 and 4 (model features)

## Context

A core idea of the product is time-sensitive risk. For example, a corner may have many crashes in low light in winter and none in daylight, so it should be flagged at night but not at noon.

We checked all 12 yearly accident files (2014–2025) and the data dictionary:
- **There is no hour or time-of-day field in the open data.** Only year, month (`Kk` / `Kuukausi`) and weekday (`Vkpv` / `Viikonpäivä`) are available.
- The only date-like column, `Luovpvm` (2014–2021), holds dates such as 1965-12-01 and 1978-10-26. It is the creation date of the *road record*, not the crash time.
- The data *does* record the lighting at the time of the crash, in `Valoisuus`: `päivänvalo` (daylight), `hämärä` (twilight), `tie valaistu` (dark, road lit), `pimeä (valaisematon)` (dark, unlit).

## Options considered

1. **Get hour-of-day data from a restricted source** (police / Statistics Finland research access). Possibly available, but slow to obtain, not open, licensing unclear.
2. **Use the lighting field directly, and compute the live equivalent from time + GPS position via the sun's elevation.**
3. **Ignore time effects.** Loses the core product idea.

## Decision

Option 2. At runtime the car computes the sun's elevation from the clock and GPS position (NOAA solar formula, or the `astral` library) and maps it to the same categories:

| Sun elevation | Category |
|---|---|
| above −0.833° | `päivänvalo` (daylight) |
| −0.833° to −6° (civil twilight) | `hämärä` (twilight) |
| below −6° | dark: `tie valaistu` if the segment has streetlights, otherwise `pimeä (valaisematon)` |

## Reasoning

- **Lighting is the variable that actually matters.** The clock is only a stand-in for it, and a poor one in Finland. On 21 December in Oulu there are only 4 daylight hours, 2 twilight hours and 18 dark hours (measured with our implementation). "15:00" means daylight in June and darkness in December. The lighting category captures the physical cause directly.
- **It has no network dependency.** Sun position is pure math, so it works offline. That makes it our most reliable live input.
- **The historical and live features match exactly.** Both use the same four categories, so there is no gap between training data and what the car measures.

## Consequences

- **Whether a road is lit is a property of the road segment, not of time.** We need streetlight presence per segment: from Digiroad if available, otherwise inferred from the historical lit/unlit ratio of crashes in the dark at that segment. Example: within 250 m of a central Oulu point, 27 of 32 crashes in the dark were on a lit road.
- **Exposure must be corrected.** Most winter traffic in northern Finland happens in the dark, so a high share of crashes in the dark is partly just expected. Risk under a condition must be (crash share in the condition) ÷ (traffic share in the condition). Traffic share in each lighting state = hourly traffic profile (Digitraffic traffic-count stations) × sun state for that hour, date and location. Done in Phase 2.
- **Edge cases:** polar night and midnight sun in Lapland; heavy overcast, fog or snowfall making it effectively darker. Prefer a tested library over hand-written formulas in production; weather can be added as a modifier.
- **Recording is subjective.** Police record the lighting category by judgement, so category boundaries are approximate.
- **Revisit if** hour-level crash data becomes available. It could then be added alongside lighting, for example to capture rush-hour and commuting effects.
