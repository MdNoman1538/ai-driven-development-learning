import { useEffect, useState } from 'react';
import Inline from './Inline';

type Option = { name: string; summary: string; pros: string[]; cons: string[] };
type Decision = {
  id: string;
  ref: string;
  title: string;
  date: string;
  status: string;
  question: string;
  context: string;
  options: Option[];
  chosen: number;
  why: string[];
  consequences: string[];
  revisit: string;
  lesson: string;
  record?: string;
};

const KEY = 'addl.decision-picks.v1';
const LETTERS = 'ABCDEFG';

// Picks live in this browser only (ADR-0005). Storage can be unavailable (private mode,
// blocked site data), so every access is guarded and the page works without it.
function load(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}
function save(picks: Record<string, number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(picks));
  } catch {
    /* the page still works without storage */
  }
}

function Card({ d, pick, onPick, onReset }: { d: Decision; pick: number | undefined; onPick: (i: number) => void; onReset: () => void }) {
  const [peek, setPeek] = useState(false);
  const revealed = pick !== undefined || peek;
  const matched = pick === d.chosen;
  return (
    <article className="lx-dec" id={d.id}>
      <header className="lx-dec__head">
        <span className="lx-badge">{d.ref}</span>
        <span className="lx-muted">{d.date} · {d.status}</span>
      </header>
      <h3 className="lx-dec__title">{d.title}</h3>
      <p className="lx-dec__q"><Inline text={d.question} /></p>
      <p className="lx-muted"><Inline text={d.context} /></p>
      {!revealed && <p className="lx-dec__prompt">Which would you choose?</p>}
      <ol className="lx-options">
        {d.options.map((o, i) => {
          const cls = ['lx-opt'];
          if (revealed && i === d.chosen) cls.push('lx-opt--chosen');
          if (pick === i) cls.push('lx-opt--mine');
          return (
            <li key={i} className={cls.join(' ')}>
              <button className="lx-opt__btn" disabled={revealed} onClick={() => onPick(i)} aria-label={`Choose option ${LETTERS[i]}: ${o.name}`}>
                <span className="lx-opt__letter">{LETTERS[i]}</span>
                <span>
                  <strong>{o.name}</strong>
                  <span className="lx-opt__summary"><Inline text={o.summary} /></span>
                </span>
              </button>
              {revealed && (
                <div className="lx-opt__pc">
                  <ul className="lx-pros">{o.pros.map((p, j) => <li key={j}><Inline text={p} /></li>)}</ul>
                  <ul className="lx-cons">{o.cons.map((c, j) => <li key={j}><Inline text={c} /></li>)}</ul>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {!revealed && (
        <button className="lx-link" onClick={() => setPeek(true)}>
          Just show me the answer
        </button>
      )}
      {revealed && (
        <div className="lx-reveal">
          {pick !== undefined && (
            <p className={matched ? 'lx-verdict lx-verdict--same' : 'lx-verdict lx-verdict--diff'}>
              {matched
                ? `You chose ${LETTERS[pick]}, the same as the project.`
                : `You chose ${LETTERS[pick]}; the project chose ${LETTERS[d.chosen]}. Compare the reasons below; the difference is where the learning is.`}
            </p>
          )}
          <h4>Why {LETTERS[d.chosen]}: {d.options[d.chosen].name}</h4>
          <ul>{d.why.map((w, i) => <li key={i}><Inline text={w} /></li>)}</ul>
          <h4>What it led to</h4>
          <ul>{d.consequences.map((c, i) => <li key={i}><Inline text={c} /></li>)}</ul>
          <p><strong>Revisit when:</strong> <Inline text={d.revisit} /></p>
          <p className="lx-lesson"><strong>Lesson:</strong> <Inline text={d.lesson} /></p>
          <p className="lx-dec__foot">
            {d.record && <a href={d.record}>Read the original {d.ref} →</a>}
            {pick !== undefined && (
              <button className="lx-link" onClick={onReset}>
                Try again
              </button>
            )}
          </p>
        </div>
      )}
    </article>
  );
}

export default function DecisionExplorer({ decisions }: { decisions: Decision[] }) {
  const [picks, setPicks] = useState<Record<string, number>>({});
  useEffect(() => setPicks(load()), []);
  const update = (next: Record<string, number>) => {
    setPicks(next);
    save(next);
  };
  const answered = decisions.filter((d) => picks[d.id] !== undefined);
  const matched = answered.filter((d) => picks[d.id] === d.chosen).length;

  return (
    <div className="lx-decisions not-content">
      <div className="lx-score" aria-live="polite">
        <div>
          <strong>{answered.length}</strong> of {decisions.length} decisions answered
          {answered.length > 0 && (
            <> · <strong>{matched}</strong> matched the project's choice</>
          )}
        </div>
        <div className="lx-score__bar"><span style={{ width: `${(answered.length / Math.max(decisions.length, 1)) * 100}%` }} /></div>
      </div>
      {decisions.map((d) => (
        <Card
          key={d.id}
          d={d}
          pick={picks[d.id]}
          onPick={(i) => update({ ...picks, [d.id]: i })}
          onReset={() => {
            const next = { ...picks };
            delete next[d.id];
            update(next);
          }}
        />
      ))}
    </div>
  );
}
