import { useEffect, useState } from 'react';
import Inline, { AcronymScope } from './Inline';

type Step = {
  title: string;
  where: string;
  code: string;
  explain: string;
  params: { name: string; value: string; why: string }[];
  choice?: string;
  codeHref: string;
  githubHref: string;
};
type W = { id: string; title: string; question: string; summary: string; stage: string; stageName: string; steps: Step[] };

export default function Walkthroughs({ walkthroughs }: { walkthroughs: W[] }) {
  const [active, setActive] = useState(walkthroughs[0]?.id);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (walkthroughs.some((w) => w.id === id)) setActive(id);
  }, [walkthroughs]);
  const w = walkthroughs.find((x) => x.id === active) ?? walkthroughs[0];
  const s = w.steps[Math.min(step, w.steps.length - 1)];
  const choose = (id: string) => {
    setActive(id);
    setStep(0);
    window.history.replaceState(null, '', `#${id}`);
  };

  return (
    <div className="lx-wt not-content">
      <div className="lx-wt__picker" role="tablist" aria-label="Walkthroughs">
        {walkthroughs.map((x) => (
          <button key={x.id} id={x.id} role="tab" aria-selected={x.id === w.id} className={x.id === w.id ? 'lx-wt__pick lx-wt__pick--on' : 'lx-wt__pick'} onClick={() => choose(x.id)}>
            <strong>{x.title}</strong>
            <span>{x.steps.length} steps · {x.stageName}</span>
          </button>
        ))}
      </div>

      <AcronymScope>
        <section className="lx-wt__body">
          <p className="lx-wt__q"><Inline text={w.question} /></p>
          <p className="lx-muted"><Inline text={w.summary} /></p>

          <ol className="lx-wt__steps" aria-label="Steps">
            {w.steps.map((st, i) => (
              <li key={i}>
                <button className={i === step ? 'lx-wt__dot lx-wt__dot--on' : i < step ? 'lx-wt__dot lx-wt__dot--done' : 'lx-wt__dot'} onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined} title={st.title}>
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>

          <article className="lx-wt__card">
            <p className="lx-crumb">Step {step + 1} of {w.steps.length} · <code>{s.where}</code></p>
            <h3>{s.title}</h3>
            <pre className="lx-snippet"><code>{s.code.trimEnd()}</code></pre>
            <p><Inline text={s.explain} /></p>
            {s.params.length > 0 && (
              <table className="lx-table">
                <thead><tr><th>Parameter / value</th><th>Set to</th><th>Why</th></tr></thead>
                <tbody>{s.params.map((p) => <tr key={p.name}><td><code>{p.name}</code></td><td>{p.value}</td><td><Inline text={p.why} /></td></tr>)}</tbody>
              </table>
            )}
            {s.choice && <p className="lx-choice"><strong>Why this, not that:</strong> <Inline text={s.choice} /></p>}
            <p className="lx-wt__links">
              <a href={s.codeHref}>See it in the code reference →</a>
              <a href={s.githubHref}>Exact line on GitHub ↗</a>
            </p>
            <div className="lx-stepnav">
              <button className="lx-btn" disabled={step === 0} onClick={() => setStep(step - 1)}>← Previous</button>
              <span className="lx-muted">{step + 1} / {w.steps.length}</span>
              <button className="lx-btn lx-btn--primary" disabled={step === w.steps.length - 1} onClick={() => setStep(step + 1)}>Next step →</button>
            </div>
          </article>
        </section>
      </AcronymScope>
    </div>
  );
}
