import { useEffect, useMemo, useState } from 'react';

type Param = { name: string; type: string | null; default?: string; kind?: string };
type Sym = {
  id: string;
  kind: string;
  name: string;
  qualname?: string;
  file: string;
  line: number;
  end_line: number;
  params?: Param[];
  returns?: string | null;
  decorators?: string[];
  doc?: string | null;
  fields?: { name: string; type: string; default?: string }[];
  bases?: string[];
  calls?: string[];
  called_by?: string[];
};
type CodeFile = { path: string; doc?: string | null; loc: number; source: string };
type Data = { language: string; files: CodeFile[]; symbols: Sym[]; endpoints: { method: string; path: string; handler: string }[]; repo: string };
type Taught = Record<string, { label: string; href: string }[]>;

const KIND_LABEL: Record<string, string> = { function: 'function', method: 'method', class: 'class', component: 'component', type: 'type' };

function useHash(): [string, (h: string) => void] {
  const [hash, setHash] = useState('');
  useEffect(() => {
    const read = () => setHash(decodeURIComponent(window.location.hash.slice(1)));
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  return [hash, (h) => {
    window.history.replaceState(null, '', `#${encodeURIComponent(h)}`);
    setHash(h);
  }];
}

function Source({ file, from, to }: { file: CodeFile; from: number; to: number }) {
  const lines = file.source.split('\n').slice(from - 1, to);
  return (
    <pre className="lx-src" tabIndex={0} aria-label={`Source of ${file.path}, lines ${from} to ${to}`}>
      {lines.map((l, i) => (
        <div key={i} className="lx-src__line">
          <span className="lx-src__no">{from + i}</span>
          <span>{l || ' '}</span>
        </div>
      ))}
    </pre>
  );
}

export default function CodeReference({ project, dataUrl, taught }: { project: string; dataUrl: string; taught: Taught }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [hash, setHash] = useHash();
  const [showFile, setShowFile] = useState(false);

  useEffect(() => {
    fetch(dataUrl)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => setError(String(e)));
  }, [dataUrl]);

  const byId = useMemo(() => new Map((data?.symbols ?? []).map((s) => [s.id, s])), [data]);
  const fileByPath = useMemo(() => new Map((data?.files ?? []).map((f) => [f.path, f])), [data]);
  const tree = useMemo(() => {
    const groups = new Map<string, CodeFile[]>();
    for (const f of data?.files ?? []) {
      const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '(root)';
      if (!groups.has(dir)) groups.set(dir, []);
      groups.get(dir)!.push(f);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  if (error) return <p className="lx-muted">Couldn't load the code facts ({error}).</p>;
  if (!data) return <div className="lx-code lx-code--loading" aria-busy="true">Loading the code of this project…</div>;

  const q = query.trim().toLowerCase();
  const matches = q ? data.symbols.filter((s) => `${s.qualname ?? s.name} ${s.file}`.toLowerCase().includes(q)).slice(0, 60) : [];
  const selectedSym = byId.get(hash);
  const selectedFile = selectedSym ? fileByPath.get(selectedSym.file) : fileByPath.get(hash);
  const symbolsIn = (path: string) => data.symbols.filter((s) => s.file === path).sort((a, b) => a.line - b.line);
  const go = (id: string) => {
    setHash(id);
    setShowFile(false);
  };
  const link = (id: string) => {
    const s = byId.get(id);
    return (
      <button key={id} className="lx-chiplink" onClick={() => go(id)} title={id}>
        {s ? s.qualname ?? s.name : id.split('::')[1]}
        <span className="lx-muted"> · {(s?.file ?? id.split('::')[0]).split('/').pop()}</span>
      </button>
    );
  };

  return (
    <div className="lx-code not-content">
      <aside className="lx-code__side">
        <input
          className="lx-search"
          type="search"
          placeholder="Search functions, classes, files…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search the code"
        />
        {q ? (
          <ul className="lx-code__list" aria-label="Search results">
            {matches.length === 0 && <li className="lx-muted">No matches.</li>}
            {matches.map((s) => (
              <li key={s.id}>
                <button className={hash === s.id ? 'lx-code__item lx-code__item--on' : 'lx-code__item'} onClick={() => go(s.id)}>
                  <span className={`lx-kind lx-kind--${s.kind}`}>{KIND_LABEL[s.kind] ?? s.kind}</span> {s.qualname ?? s.name}
                  <span className="lx-muted lx-code__file">{s.file}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <nav aria-label="Files">
            {tree.map(([dir, files]) => (
              <details key={dir} open={!!selectedFile && selectedFile.path.startsWith(dir + '/')} className="lx-code__dir">
                <summary>{dir}</summary>
                <ul className="lx-code__list">
                  {files.map((f) => (
                    <li key={f.path}>
                      <button className={selectedFile?.path === f.path && !selectedSym ? 'lx-code__item lx-code__item--on' : 'lx-code__item'} onClick={() => go(f.path)}>
                        {f.path.split('/').pop()}
                      </button>
                      {selectedFile?.path === f.path && (
                        <ul className="lx-code__list lx-code__list--nested">
                          {symbolsIn(f.path).map((s) => (
                            <li key={s.id}>
                              <button className={hash === s.id ? 'lx-code__item lx-code__item--on' : 'lx-code__item'} onClick={() => go(s.id)}>
                                <span className={`lx-kind lx-kind--${s.kind}`}>{(KIND_LABEL[s.kind] ?? s.kind)[0].toUpperCase()}</span> {s.qualname ?? s.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </nav>
        )}
      </aside>

      <section className="lx-code__main" aria-live="polite">
        {!selectedFile && (
          <div className="lx-code__empty">
            <h3>{data.files.length} files · {data.symbols.length} definitions</h3>
            <p className="lx-muted">
              Read straight from the project's code ({data.language === 'python' ? "Python's own parser" : 'the TypeScript compiler’s parser'}).
              Pick a file on the left, or search. Calls are listed only when they can be resolved with certainty.
            </p>
            {data.endpoints.length > 0 && (
              <>
                <h4>HTTP endpoints</h4>
                <ul>{data.endpoints.map((e) => <li key={e.method + e.path}><code>{e.method} {e.path}</code> → {link(e.handler)}</li>)}</ul>
              </>
            )}
            <h4>Most connected</h4>
            <div className="lx-chiprow">
              {[...data.symbols].sort((a, b) => (b.called_by?.length ?? 0) - (a.called_by?.length ?? 0)).slice(0, 10).map((s) => link(s.id))}
            </div>
          </div>
        )}

        {selectedFile && !selectedSym && (
          <article>
            <p className="lx-crumb">{selectedFile.path}</p>
            <h3 className="lx-code__title">{selectedFile.path.split('/').pop()}</h3>
            {selectedFile.doc && <p className="lx-doc">{selectedFile.doc}</p>}
            <p className="lx-muted">{selectedFile.loc} lines · <a href={`${data.repo}/blob/main/${selectedFile.path}`}>Open on GitHub ↗</a></p>
            <h4>Definitions</h4>
            <div className="lx-chiprow">{symbolsIn(selectedFile.path).map((s) => link(s.id))}</div>
            <button className="lx-btn" onClick={() => setShowFile(!showFile)}>{showFile ? 'Hide' : 'Show'} the whole file</button>
            {showFile && <Source file={selectedFile} from={1} to={selectedFile.loc} />}
          </article>
        )}

        {selectedSym && selectedFile && (
          <article>
            <p className="lx-crumb">
              <button className="lx-link" onClick={() => go(selectedFile.path)}>{selectedFile.path}</button> · line {selectedSym.line}
            </p>
            <h3 className="lx-code__title">
              <span className={`lx-kind lx-kind--${selectedSym.kind}`}>{KIND_LABEL[selectedSym.kind] ?? selectedSym.kind}</span> {selectedSym.qualname ?? selectedSym.name}
            </h3>
            {selectedSym.params && (selectedSym.kind !== 'class') && (
              <code className="lx-sig">
                {selectedSym.name}({selectedSym.params.map((p) => p.name + (p.type ? `: ${p.type}` : '') + (p.default ? ` = ${p.default}` : '')).join(', ')})
                {selectedSym.returns ? ` → ${selectedSym.returns}` : ''}
              </code>
            )}
            {selectedSym.doc && <p className="lx-doc">{selectedSym.doc}</p>}
            {taught[selectedSym.id]?.length ? (
              <div className="lx-taught">
                <strong>Explained in:</strong> {taught[selectedSym.id].map((t, i) => <a key={i} href={t.href}>{t.label}</a>)}
              </div>
            ) : null}
            {selectedSym.decorators && selectedSym.decorators.length > 0 && <p className="lx-muted">Decorators: {selectedSym.decorators.map((d) => <code key={d}>@{d}</code>)}</p>}
            {selectedSym.bases && selectedSym.bases.length > 0 && <p className="lx-muted">Inherits from: {selectedSym.bases.map((b) => <code key={b}>{b}</code>)}</p>}
            {(selectedSym.params?.length ?? 0) > 0 && (
              <table className="lx-table">
                <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Kind</th></tr></thead>
                <tbody>
                  {selectedSym.params!.map((p) => (
                    <tr key={p.name}><td><code>{p.name}</code></td><td>{p.type ? <code>{p.type}</code> : <span className="lx-muted">—</span>}</td><td>{p.default ? <code>{p.default}</code> : <span className="lx-muted">required</span>}</td><td>{p.kind ?? 'positional or keyword'}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {(selectedSym.fields?.length ?? 0) > 0 && (
              <table className="lx-table">
                <thead><tr><th>Field</th><th>Type</th><th>Default / rules</th></tr></thead>
                <tbody>{selectedSym.fields!.map((f) => <tr key={f.name}><td><code>{f.name}</code></td><td><code>{f.type}</code></td><td>{f.default ? <code>{f.default}</code> : <span className="lx-muted">required</span>}</td></tr>)}</tbody>
              </table>
            )}
            <div className="lx-calls">
              <div><h4>Calls ({selectedSym.calls?.length ?? 0})</h4><div className="lx-chiprow">{selectedSym.calls?.length ? selectedSym.calls.map(link) : <span className="lx-muted">No resolved calls into the project.</span>}</div></div>
              <div><h4>Called by ({selectedSym.called_by?.length ?? 0})</h4><div className="lx-chiprow">{selectedSym.called_by?.length ? selectedSym.called_by.map(link) : <span className="lx-muted">No resolved callers (entry point, or called dynamically).</span>}</div></div>
            </div>
            <h4>Source <a className="lx-muted" href={`${data.repo}/blob/main/${selectedSym.file}#L${selectedSym.line}-L${selectedSym.end_line}`}>· open on GitHub ↗</a></h4>
            <Source file={selectedFile} from={selectedSym.line} to={selectedSym.end_line} />
          </article>
        )}
      </section>
    </div>
  );
}
