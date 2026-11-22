import { useState } from 'react';
import Inline from './Inline';

type Step = { id: string; title: string; stage: string; happens: string; why: string; where: string; before?: string; after?: string };

export default function DataJourney({ steps }: { steps: Step[] }) {
  const [i, setI] = useState(0);
  const s = steps[i];
  return (
    <div className="lx-journey not-content">
      <ol className="lx-steps" aria-label="Steps">
        {steps.map((st, j) => (
          <li key={st.id}>
            <button
              className={j === i ? 'lx-step lx-step--on' : j < i ? 'lx-step lx-step--done' : 'lx-step'}
              onClick={() => setI(j)}
              aria-current={j === i ? 'step' : undefined}
              aria-label={`Step ${j + 1}: ${st.title}`}
            >
              {j + 1}
            </button>
          </li>
        ))}
      </ol>
      <section className="lx-stepcard" aria-live="polite">
        <span className="lx-badge">{s.stage}</span>
        <h3>
          {i + 1}. {s.title}
        </h3>
        <p><Inline text={s.happens} /></p>
        {(s.before || s.after) && (
          <div className="lx-ba">
            {s.before && (
              <div>
                <span className="lx-ba__label">Before</span>
                <code>{s.before}</code>
              </div>
            )}
            {s.after && (
              <div>
                <span className="lx-ba__label">After</span>
                <code>{s.after}</code>
              </div>
            )}
          </div>
        )}
        <p className="lx-why"><strong>Why:</strong> <Inline text={s.why} /></p>
        <p className="lx-muted">Where: <code>{s.where}</code></p>
        <div className="lx-stepnav">
          <button className="lx-btn" disabled={i === 0} onClick={() => setI(i - 1)}>
            ← Back
          </button>
          <span className="lx-muted">
            {i + 1} / {steps.length}
          </span>
          <button className="lx-btn lx-btn--primary" disabled={i === steps.length - 1} onClick={() => setI(i + 1)}>
            Next →
          </button>
        </div>
      </section>
    </div>
  );
}
