import { useMemo, useState } from 'react';
import Inline, { AcronymScope } from './Inline';

type Node = { id: string; label: string; group: string; col: number; row: number; what: string; why: string; where: string };
type Edge = { from: string; to: string; label?: string; style?: 'solid' | 'dashed' };
type View = { id: string; label: string; description: string; groups: { id: string; label: string }[]; nodes: Node[]; edges: Edge[] };

const W = 168; // cell width
const H = 96; // cell height
const BW = 140; // box width
const BH = 52; // box height
const PAD = 14;

/** Long labels wrap onto two lines at the space nearest the middle. */
function lines(label: string): string[] {
  if (label.length <= 18) return [label];
  const mid = label.length / 2;
  let best = -1;
  for (let i = 0; i < label.length; i++) if (label[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return best < 0 ? [label] : [label.slice(0, best), label.slice(best + 1)];
}

function centre(n: Node) {
  return { x: PAD + n.col * W + BW / 2, y: PAD + n.row * H + BH / 2 };
}

/** Where the line from a's centre towards b leaves a's box. */
function exitPoint(a: Node, b: Node) {
  const c = centre(a);
  const d = centre(b);
  const dx = d.x - c.x;
  const dy = d.y - c.y;
  const sx = dx === 0 ? Infinity : BW / 2 / Math.abs(dx);
  const sy = dy === 0 ? Infinity : BH / 2 / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

export default function ArchitectureExplorer({ views }: { views: View[] }) {
  const [viewId, setViewId] = useState(views[0]?.id);
  const view = views.find((v) => v.id === viewId) ?? views[0];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const byId = useMemo(() => new Map(view.nodes.map((n) => [n.id, n])), [view]);
  const groupIndex = useMemo(() => new Map(view.groups.map((g, i) => [g.id, i])), [view]);
  const selected = selectedId ? byId.get(selectedId) : null;

  const cols = Math.max(...view.nodes.map((n) => n.col)) + 1;
  const rows = Math.max(...view.nodes.map((n) => n.row)) + 1;
  const width = PAD * 2 + (cols - 1) * W + BW;
  const height = PAD * 2 + (rows - 1) * H + BH;

  const linked = new Set<string>();
  if (selected)
    for (const e of view.edges) {
      if (e.from === selected.id) linked.add(e.to);
      if (e.to === selected.id) linked.add(e.from);
    }

  return (
    <div className="lx-arch not-content">
      {views.length > 1 && (
        <div className="lx-tabs" role="tablist" aria-label="Architecture views">
          {views.map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={v.id === view.id}
              className={v.id === view.id ? 'lx-tab lx-tab--on' : 'lx-tab'}
              onClick={() => {
                setViewId(v.id);
                setSelectedId(null);
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
      <p className="lx-muted">{view.description}</p>
      <div className="lx-legend">
        {view.groups.map((g, i) => (
          <span key={g.id} className={`lx-legend__item lx-g${i}`}>
            {g.label}
          </span>
        ))}
        <span className="lx-legend__hint">Click a box to learn what it is and why it exists.</span>
      </div>
      <div className="lx-arch__canvas">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${view.label} architecture diagram`}>
          <defs>
            <marker id={`arrow-${view.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className="lx-arrowhead" />
            </marker>
          </defs>
          {view.edges.map((e, i) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;
            const p = exitPoint(a, b);
            const q = exitPoint(b, a);
            const active = selected && (e.from === selected.id || e.to === selected.id);
            const dim = selected && !active;
            return (
              <g key={i} className={`lx-edge${active ? ' lx-edge--on' : ''}${dim ? ' lx-edge--dim' : ''}`}>
                <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} strokeDasharray={e.style === 'dashed' ? '5 4' : undefined} markerEnd={`url(#arrow-${view.id})`} />
                {e.label && Math.hypot(q.x - p.x, q.y - p.y) > 70 && (
                  <text x={(p.x + q.x) / 2} y={(p.y + q.y) / 2 - 5} textAnchor="middle" className="lx-edge__label">
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}
          {view.nodes.map((n) => {
            const x = PAD + n.col * W;
            const y = PAD + n.row * H;
            const on = selected?.id === n.id;
            const dim = selected && !on && !linked.has(n.id);
            return (
              <g
                key={n.id}
                className={`lx-node lx-g${groupIndex.get(n.group) ?? 0}${on ? ' lx-node--on' : ''}${dim ? ' lx-node--dim' : ''}`}
                tabIndex={0}
                role="button"
                aria-pressed={on}
                aria-label={n.label}
                onClick={() => setSelectedId(on ? null : n.id)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    setSelectedId(on ? null : n.id);
                  }
                }}
              >
                <rect x={x} y={y} width={BW} height={BH} rx={10} />
                <text x={x + BW / 2} y={y + BH / 2} textAnchor="middle">
                  {lines(n.label).map((line, i, all) => (
                    <tspan key={i} x={x + BW / 2} dy={i === 0 ? (all.length === 1 ? 4.5 : -3) : 15}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <AcronymScope>
      <div className="lx-detail" aria-live="polite">
        {selected ? (
          <>
            <h4>{selected.label}</h4>
            <dl>
              <dt>What it is</dt>
              <dd><Inline text={selected.what} /></dd>
              <dt>Why it exists</dt>
              <dd><Inline text={selected.why} /></dd>
              <dt>Where</dt>
              <dd><code>{selected.where}</code></dd>
            </dl>
            {linked.size > 0 && (
              <p className="lx-muted">
                Connected to: {[...linked].map((id) => byId.get(id)?.label).join(' · ')}
              </p>
            )}
          </>
        ) : (
          <p className="lx-muted">Nothing selected. Pick any box above; its connections stay highlighted.</p>
        )}
      </div>
      </AcronymScope>
    </div>
  );
}
