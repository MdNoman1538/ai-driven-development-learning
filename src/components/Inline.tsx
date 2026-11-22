import { createContext, useContext, useRef, type ReactNode } from 'react';
import { splitAcronyms } from '../lib/acronyms.mjs';

/** Acronym scope: the first use inside a card/section is spelled out; later uses show on hover.
 *  A scope resets on every render of the component that owns it, so server and browser agree. */
const Scope = createContext<Set<string> | null>(null);

export function AcronymScope({ children }: { children: ReactNode }) {
  const seen = useRef(new Set<string>());
  seen.current = new Set();
  return <Scope.Provider value={seen.current}>{children}</Scope.Provider>;
}

function withAcronyms(text: string, seen: Set<string>, key: string): ReactNode[] {
  return splitAcronyms(text, seen).map((p: string | { short: string; full: string; expand: boolean }, i: number) =>
    typeof p === 'string' ? (
      p
    ) : (
      <span key={`${key}-${i}`}>
        <abbr title={p.full}>{p.short}</abbr>
        {p.expand ? ` (${p.full})` : ''}
      </span>
    ),
  );
}

/** Renders the small Markdown subset used in data files (`code`, **strong**, *em*) plus acronyms. */
export default function Inline({ text }: { text: string }) {
  const scoped = useContext(Scope);
  const seen = scoped ?? new Set<string>();
  const parts: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const token = match[0];
    const at = match.index ?? 0;
    if (at > last) parts.push(...withAcronyms(text.slice(last, at), seen, `t${at}`));
    if (token.startsWith('`')) parts.push(<code key={at}>{token.slice(1, -1)}</code>);
    else if (token.startsWith('**')) parts.push(<strong key={at}>{withAcronyms(token.slice(2, -2), seen, `s${at}`)}</strong>);
    else parts.push(<em key={at}>{withAcronyms(token.slice(1, -1), seen, `e${at}`)}</em>);
    last = at + token.length;
  }
  if (last < text.length) parts.push(...withAcronyms(text.slice(last), seen, 'end'));
  return <>{parts}</>;
}
