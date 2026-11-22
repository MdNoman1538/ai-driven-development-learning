import { useState } from 'react';
import Inline, { AcronymScope } from './Inline';

type Tool = {
  id: string;
  name: string;
  layer: string;
  what: string;
  why: string;
  analogy?: string;
  alternatives: { name: string; why_not: string }[];
  used_in: { project: string; where: string; how: string }[];
  versions: { project: string; name: string; version: string }[];
};

export default function StackMap({
  tools,
  layers,
  projects,
  initialProject,
}: {
  tools: Tool[];
  layers: Record<string, string>;
  projects: Record<string, string>;
  initialProject?: string;
}) {
  const [project, setProject] = useState(initialProject ?? 'all');
  const [layer, setLayer] = useState('all');
  const [open, setOpen] = useState<string | null>(null);

  const visible = tools.filter(
    (t) => (project === 'all' || t.used_in.some((u) => u.project === project)) && (layer === 'all' || t.layer === layer),
  );
  const usedLayers = Object.keys(layers).filter((l) => tools.some((t) => t.layer === l && (project === 'all' || t.used_in.some((u) => u.project === project))));

  return (
    <div className="lx-stack not-content">
      {!initialProject && (
        <div className="lx-chips" aria-label="Filter by project">
          {['all', ...Object.keys(projects)].map((p) => (
            <button key={p} className={p === project ? 'lx-chip lx-chip--on' : 'lx-chip'} onClick={() => setProject(p)} aria-pressed={p === project}>
              {p === 'all' ? 'All projects' : projects[p]}
            </button>
          ))}
        </div>
      )}
      <div className="lx-chips" aria-label="Filter by layer">
        {['all', ...usedLayers].map((l) => (
          <button key={l} className={l === layer ? 'lx-chip lx-chip--on' : 'lx-chip'} onClick={() => setLayer(l)} aria-pressed={l === layer}>
            {l === 'all' ? 'All layers' : layers[l]}
          </button>
        ))}
      </div>
      <p className="lx-muted">{visible.length} tools. Open a card for the reasoning and the alternatives.</p>
      <div className="lx-grid">
        {visible.map((t) => {
          const isOpen = open === t.id;
          const uses = t.used_in.filter((u) => project === 'all' || u.project === project);
          const versions = t.versions.filter((v) => project === 'all' || v.project === project);
          return (
            <AcronymScope key={t.id}>
            <article className={isOpen ? 'lx-tool lx-tool--open' : 'lx-tool'}>
              <button className="lx-tool__head" onClick={() => setOpen(isOpen ? null : t.id)} aria-expanded={isOpen}>
                <span className={`lx-layer lx-layer--${t.layer}`}>{layers[t.layer]}</span>
                <strong className="lx-tool__name">{t.name}</strong>
                <span className="lx-tool__what"><Inline text={t.what} /></span>
              </button>
              {isOpen && (
                <div className="lx-tool__body">
                  <h4>Why we use it</h4>
                  <p><Inline text={t.why} /></p>
                  {t.analogy && <p className="lx-analogy"><Inline text={t.analogy} /></p>}
                  <h4>Where</h4>
                  <ul>
                    {uses.map((u, i) => (
                      <li key={i}>
                        <strong>{projects[u.project]}</strong>: <Inline text={u.how} /> <code>{u.where}</code>
                      </li>
                    ))}
                  </ul>
                  {versions.length > 0 && (
                    <p className="lx-muted">
                      Versions: {versions.map((v) => `${v.name} ${v.version}`).join(' · ')}
                    </p>
                  )}
                  <h4>Alternatives we didn't choose</h4>
                  <ul>
                    {t.alternatives.map((a, i) => (
                      <li key={i}>
                        <strong>{a.name}</strong>: <Inline text={a.why_not} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
            </AcronymScope>
          );
        })}
      </div>
    </div>
  );
}
