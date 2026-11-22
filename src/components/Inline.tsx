import type { ReactNode } from 'react';

/** Renders the tiny bit of Markdown used in data files: `code`, **strong** and *emphasis*. */
export default function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const token = match[0];
    const at = match.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    if (token.startsWith('`')) parts.push(<code key={at}>{token.slice(1, -1)}</code>);
    else if (token.startsWith('**')) parts.push(<strong key={at}>{token.slice(2, -2)}</strong>);
    else parts.push(<em key={at}>{token.slice(1, -1)}</em>);
    last = at + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
