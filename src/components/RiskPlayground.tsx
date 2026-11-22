import { useMemo, useState } from 'react';
import model from '../data/risk-model.json';

// The same formulas as the Road Risk engine, with the engine's constants (risk-model.json, verified
// against the engine's source by the coverage check). Change the sliders and watch each weight.

const SEVERITIES = Object.keys(model.severity_weights) as (keyof typeof model.severity_weights)[];

function tierOf(score: number): string {
  return (model.tiers as [number, string][]).find(([min]) => score >= min)![1];
}

function Curve({ points, x, y, label, xLabel }: { points: [number, number][]; x: number; y: number; label: string; xLabel: string }) {
  const W = 260, H = 120, P = 24;
  const maxX = Math.max(...points.map((p) => p[0]));
  const maxY = Math.max(...points.map((p) => p[1]), 1e-9);
  const sx = (v: number) => P + (v / maxX) * (W - 2 * P);
  const sy = (v: number) => H - P - (v / maxY) * (H - 2 * P);
  return (
    <figure className="lx-curve">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <line x1={P} y1={H - P} x2={W - P} y2={H - P} className="lx-axis" />
        <line x1={P} y1={P / 2} x2={P} y2={H - P} className="lx-axis" />
        <polyline points={points.map(([a, b]) => `${sx(a)},${sy(b)}`).join(' ')} className="lx-curve__line" />
        <circle cx={sx(x)} cy={sy(y)} r={5} className="lx-curve__dot" />
        <text x={W - P} y={H - 6} textAnchor="end" className="lx-curve__lbl">{xLabel}</text>
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export default function RiskPlayground() {
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>('Loukkaantumiseen johtanut');
  const [age, setAge] = useState(2);
  const [radius, setRadius] = useState(250);
  const [distance, setDistance] = useState(60);
  const [count, setCount] = useState(10);
  const dist = Math.min(distance, radius);

  const r = useMemo(() => {
    const lambda = Math.log(2) / model.half_life_years;
    const wSev = model.severity_weights[severity];
    const wTime = Math.exp(-lambda * age);
    const wDist = Math.max(model.distance_floor, 1 - dist / radius);
    const one = wSev * wTime * wDist;
    const area = Math.max(model.area_floor, (radius / model.area_reference_m) ** 2);
    const density = (one * count) / area;
    const score = Math.round(1000 * (1 - Math.exp(-density / model.score_scale))) / 10;
    return { lambda, wSev, wTime, wDist, one, area, density, score };
  }, [severity, age, radius, dist, count]);

  const decay = Array.from({ length: 13 }, (_, a) => [a, Math.exp(-r.lambda * a)] as [number, number]);
  const distCurve = Array.from({ length: 21 }, (_, i) => {
    const d = (i / 20) * radius;
    return [d, Math.max(model.distance_floor, 1 - d / radius)] as [number, number];
  });
  const scoreCurve = Array.from({ length: 41 }, (_, i) => [i * 3, 100 * (1 - Math.exp(-(i * 3) / model.score_scale))] as [number, number]);

  return (
    <div className="lx-play not-content">
      <div className="lx-play__controls">
        <label>
          Severity
          <select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
            {SEVERITIES.map((s) => <option key={s} value={s}>{model.severity_labels[s]} (weight {model.severity_weights[s]})</option>)}
          </select>
        </label>
        <label>Age of the crashes: <strong>{age} years</strong><input type="range" min={0} max={12} value={age} onChange={(e) => setAge(+e.target.value)} /></label>
        <label>Search radius: <strong>{radius} m</strong><input type="range" min={50} max={2000} step={50} value={radius} onChange={(e) => setRadius(+e.target.value)} /></label>
        <label>Distance from the point: <strong>{dist} m</strong><input type="range" min={0} max={radius} step={5} value={dist} onChange={(e) => setDistance(+e.target.value)} /></label>
        <label>Number of such crashes: <strong>{count}</strong><input type="range" min={1} max={60} value={count} onChange={(e) => setCount(+e.target.value)} /></label>
      </div>

      <div className="lx-play__result">
        <div className="lx-play__score">
          <span className="lx-play__num">{r.score.toFixed(1)}</span>
          <span className={`lx-tier lx-tier--${tierOf(r.score).toLowerCase()}`}>{tierOf(r.score)}</span>
        </div>
        <table className="lx-table lx-table--compact">
          <tbody>
            <tr><td>Severity weight</td><td><code>{r.wSev}</code></td></tr>
            <tr><td>Time weight e<sup>−λ·{age}</sup> (λ = ln 2 / {model.half_life_years})</td><td><code>{r.wTime.toFixed(3)}</code></td></tr>
            <tr><td>Distance weight max({model.distance_floor}, 1 − {dist}/{radius})</td><td><code>{r.wDist.toFixed(3)}</code></td></tr>
            <tr><td>One crash = product of the three</td><td><code>{r.one.toFixed(3)}</code></td></tr>
            <tr><td>Area factor max({model.area_floor}, ({radius}/{model.area_reference_m})²)</td><td><code>{r.area.toFixed(2)}</code></td></tr>
            <tr><td>Density = {count} × one ÷ area</td><td><code>{r.density.toFixed(2)}</code></td></tr>
            <tr><td>Score = 100 · (1 − e<sup>−density/{model.score_scale}</sup>)</td><td><code>{r.score.toFixed(1)}</code></td></tr>
          </tbody>
        </table>
      </div>

      <div className="lx-play__curves">
        <Curve points={decay} x={age} y={r.wTime} label="Time weight halves every 5 years" xLabel="age (years)" />
        <Curve points={distCurve} x={dist} y={r.wDist} label="Distance weight, with a 0.05 floor" xLabel="distance (m)" />
        <Curve points={scoreCurve} x={Math.min(r.density, 120)} y={Math.min(r.score, 100)} label="The score saturates towards 100" xLabel="density" />
      </div>
      <p className="lx-muted">
        These are the engine's real constants: the build checks them against <code>{model.file}</code>. They're judgement calls for today's
        exploratory score; Phases 2 and 4 replace them with exposure-based, calibrated risk.
      </p>
    </div>
  );
}
